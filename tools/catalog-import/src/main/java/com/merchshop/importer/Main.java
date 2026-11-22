package com.merchshop.importer;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merchshop.importer.classify.Classifier;
import com.merchshop.importer.config.Config;
import com.merchshop.importer.fetch.CachedFetcher;
import com.merchshop.importer.image.ImageProcessor;
import com.merchshop.importer.model.ScrapedImage;
import com.merchshop.importer.model.ScrapedProduct;
import com.merchshop.importer.model.ScrapedVariant;
import com.merchshop.importer.source.RiotSource;
import com.merchshop.importer.source.ShopifySource;
import com.merchshop.importer.sql.CatalogWriter;
import com.merchshop.importer.stock.StockSynthesizer;

/**
 * Importador de una sola ejecucion.
 *
 * <pre>
 * backend\mvnw.cmd -f tools\catalog-import\pom.xml exec:java
 *   -Dexec.args="--site=all --fnatic=18 --esl=12 --riot=10"
 * </pre>
 *
 * Genera db/03-catalog.sql y las imagenes CARD en
 * frontend/public/images/products/. Es idempotente: cache de red en
 * tools/catalog-import/.cache y SQL con INSERT IGNORE + ids deterministas.
 */
public final class Main {

    private static final Logger log = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {
        Args parsed = Args.parse(args);
        if (parsed.help()) {
            System.out.println("""
                    Uso: catalog-import [opciones]
                      --site=all|fnatic|esl|riot   Tiendas a importar (default all)
                      --fnatic=18 --esl=12 --riot=10  Maximo de productos aceptados por tienda
                      --out=db/03-catalog.sql      Archivo SQL de salida
                      --images=frontend/public/images/products  Destino de imagenes
                      --cache=tools/catalog-import/.cache      Cache de red
                      --throttle=2000              Espera entre peticiones (ms)
                    """);
            return;
        }

        try {
            run(parsed);
        } catch (Exception e) {
            log.error("Importacion fallida: {}", e.getMessage(), e);
            System.exit(1);
        }
    }

    private static void run(Args args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        CachedFetcher fetcher = new CachedFetcher(args.cache(), args.throttle());
        ImageProcessor images = new ImageProcessor(fetcher, args.images());
        CatalogWriter writer = new CatalogWriter();
        cleanImages(args.images());

        Map<String, Report> reports = new LinkedHashMap<>();
        List<Config.Site> sites = Config.sites().stream()
                .filter(site -> args.site().equals("all") || args.site().equals(site.key()))
                .toList();
        if (sites.isEmpty()) {
            throw new IllegalArgumentException("--site debe ser all, fnatic, esl o riot");
        }

        for (Config.Site site : sites) {
            int limit = args.limitFor(site.key());
            Report report = new Report(site.key());
            reports.put(site.key(), report);
            if (limit <= 0) {
                continue;
            }
            log.info("== {} ({}): maximo {} productos ==", site.key(), site.adapter(), limit);
            try {
                if ("riot".equals(site.adapter())) {
                    importRiot(site, limit, mapper, fetcher, images, writer, report);
                } else {
                    importShopify(site, limit, fetcher, images, writer, report);
                }
            } catch (Exception e) {
                report.failed(e.getMessage());
                log.error("[{}] Error de importacion: {}", site.key(), e.getMessage());
            }
        }

        writer.write(args.out(), summary(reports));
        printReport(reports, writer.size(), args);

        if (writer.size() == 0) {
            throw new IllegalStateException("No se acepto ningun producto; revisa el reporte y la conexion");
        }
    }

    private static void importShopify(Config.Site site, int limit, CachedFetcher fetcher,
                                      ImageProcessor images, CatalogWriter writer, Report report)
            throws Exception {
        ShopifySource source = new ShopifySource(fetcher, new ObjectMapper());
        List<com.fasterxml.jackson.databind.JsonNode> nodes = source.productNodes(site);
        log.info("[{}] {} productos en el listado", site.key(), nodes.size());

        for (var node : nodes) {
            if (report.accepted >= limit) {
                break;
            }
            report.scanned++;
            ScrapedProduct product;
            try {
                product = ShopifySource.map(node, site);
            } catch (Exception e) {
                report.skip("datos incompletos");
                continue;
            }
            if (accept(site, product, images, writer, report, report.accepted == 0)) {
                report.accepted++;
            }
        }
    }

    private static void importRiot(Config.Site site, int limit, ObjectMapper mapper,
                                   CachedFetcher fetcher, ImageProcessor images,
                                   CatalogWriter writer, Report report) throws Exception {
        RiotSource source = new RiotSource(fetcher, mapper);
        List<String> urls = source.discover(site);
        int attempts = 0;
        int maxAttempts = Math.max(limit * 8, 80);

        for (String url : urls) {
            if (report.accepted >= limit || attempts >= maxAttempts) {
                break;
            }
            String urlSlug = slugFromUrl(url);
            if (urlSlug == null || Config.SKIP_RULES.stream()
                    .anyMatch(rule -> urlSlug.toLowerCase(Locale.ROOT).contains(rule))) {
                report.skip("url descartada");
                continue;
            }
            attempts++;
            report.scanned++;
            ScrapedProduct product;
            try {
                product = source.fetch(url);
            } catch (Exception e) {
                report.skip("error de extraccion");
                continue;
            }
            if (accept(site, product, images, writer, report, report.accepted == 0)) {
                report.accepted++;
            }
        }
    }

    private static boolean accept(Config.Site site, ScrapedProduct product, ImageProcessor images,
                                  CatalogWriter writer, Report report, boolean featured) {
        if (product.price() == null || product.price().signum() <= 0) {
            report.skip("sin precio");
            return false;
        }
        BigDecimal factor = BigDecimal.valueOf(site.priceFactor());
        BigDecimal basePrice = product.price().multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
        if (basePrice.compareTo(new BigDecimal("600")) > 0) {
            report.skip("precio fuera de rango");
            return false;
        }
        boolean anyAvailable = product.variants().stream()
                .anyMatch(variant -> variant.available() && variant.price() != null);
        if (site.requireAvailability() && !anyAvailable) {
            report.skip("sin stock disponible");
            return false;
        }
        if (product.images().isEmpty()) {
            report.skip("sin imagen");
            return false;
        }

        Classifier.Classification classification = Classifier.classify(product, site);
        if (!classification.accepted()) {
            report.skip(classification.skipReason());
            return false;
        }

        String slug = slugify(product.handle() != null ? product.handle() : product.name());
        if (slug.isBlank() || writer.containsSlug(slug)) {
            report.skip("slug duplicado o vacio");
            return false;
        }

        ScrapedImage primary = product.images().get(0);
        ImageProcessor.Saved saved = images.saveCard(primary.sourceUrl(), slug);
        if (saved == null) {
            report.skip("imagen no descargable");
            return false;
        }

        List<CatalogWriter.VariantRowInput> variants = new ArrayList<>();
        for (ScrapedVariant variant : product.variants()) {
            if (variant.price() == null) {
                continue;
            }
            variants.add(new CatalogWriter.VariantRowInput(
                    variant.sku(),
                    variant.size() == null ? "UNICA" : variant.size(),
                    variant.color() == null ? "DEFAULT" : variant.color(),
                    variant.price().multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP),
                    StockSynthesizer.stockFor(variant.sku(),
                            site.requireAvailability() ? variant.available() : true)));
        }
        if (variants.isEmpty()) {
            variants.add(new CatalogWriter.VariantRowInput(null, "UNICA", "DEFAULT",
                    basePrice, 0));
        }

        boolean added = writer.add(
                slug,
                cleanTitle(product.name()),
                product.description(),
                basePrice,
                product.currency(),
                classification.gameSlug(),
                classification.categorySlug(),
                classification.subcategorySlug(),
                classification.teamSlug(),
                classification.teamName(),
                featured,
                variants,
                saved.fileName(),
                saved.format(),
                saved.width(),
                saved.height(),
                primary.sourceUrl());
        if (!added) {
            report.skip("slug duplicado");
            return false;
        }
        log.info("[{}] + {} -> {} / {} / {} [{}]", site.key(), slug,
                classification.gameSlug(), classification.categorySlug(),
                classification.subcategorySlug(), classification.teamSlug());
        return true;
    }

    /** Borra las imagenes generadas en ejecuciones anteriores (carpeta dedicada). */
    private static void cleanImages(Path imagesDir) throws Exception {
        if (!java.nio.file.Files.isDirectory(imagesDir)) {
            return;
        }
        try (var files = java.nio.file.Files.list(imagesDir)) {
            files.filter(path -> {
                String name = path.getFileName().toString();
                return name.endsWith(".webp") || name.endsWith(".jpg");
            }).forEach(path -> {
                try {
                    java.nio.file.Files.deleteIfExists(path);
                } catch (Exception ignored) {
                    // se sobrescribe mas abajo
                }
            });
        }
    }

    private static String slugFromUrl(String url) {
        String clean = url.split("\\?")[0];
        while (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        int slash = clean.lastIndexOf('/');
        return slash >= 0 ? clean.substring(slash + 1) : null;
    }

    static String slugify(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    private static String cleanTitle(String raw) {
        if (raw == null) {
            return "";
        }
        String clean = raw.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        return clean.length() <= 200 ? clean : clean.substring(0, 199) + "…";
    }

    private static String summary(Map<String, Report> reports) {
        StringBuilder text = new StringBuilder();
        for (Report report : reports.values()) {
            if (text.length() > 0) {
                text.append("; ");
            }
            text.append(report.site).append("=").append(report.accepted);
            if ("esl".equals(report.site)) {
                text.append(" (*)");
            }
        }
        if (text.indexOf("(*)") >= 0) {
            text.append("\n-- (*) ESL publica precios en PLN: convertidos a EUR con tasa fija 4.30");
        }
        return text.toString();
    }

    private static void printReport(Map<String, Report> reports, int total, Args args) {
        System.out.println();
        System.out.println("================ RESUMEN DE IMPORTACION ================");
        for (Report report : reports.values()) {
            System.out.printf("%-7s escaneados=%-4d aceptados=%-4d%s%n",
                    report.site, report.scanned, report.accepted,
                    report.error == null ? "" : " ERROR: " + report.error);
            report.skipped.forEach((reason, count) ->
                    System.out.printf("        descartados: %-38s %d%n", reason, count));
        }
        System.out.println("--------------------------------------------------------");
        System.out.printf("Total aceptado: %d%n", total);
        System.out.printf("SQL:    %s%n", args.out().toAbsolutePath());
        System.out.printf("Imagenes: %s%n", args.images().toAbsolutePath());
        System.out.println("========================================================");
    }

    private static final class Report {
        private final String site;
        private int scanned;
        private int accepted;
        private final Map<String, Integer> skipped = new LinkedHashMap<>();
        private String error;

        private Report(String site) {
            this.site = site;
        }

        private void skip(String reason) {
            skipped.merge(reason, 1, Integer::sum);
        }

        private void failed(String message) {
            this.error = message;
        }
    }

    private record Args(String site, int fnatic, int esl, int riot,
                        Path out, Path images, Path cache, long throttle, boolean help) {

        private static Args parse(String[] args) {
            String site = "all";
            int fnatic = 18;
            int esl = 12;
            int riot = 10;
            Path out = Path.of("db", "03-catalog.sql");
            Path images = Path.of("frontend", "public", "images", "products");
            Path cache = Path.of("tools", "catalog-import", ".cache");
            long throttle = 2000;
            boolean help = false;

            for (String arg : args) {
                if (arg.equals("--help") || arg.equals("-h")) {
                    help = true;
                    continue;
                }
                if (!arg.startsWith("--") || !arg.contains("=")) {
                    continue;
                }
                String key = arg.substring(2, arg.indexOf('='));
                String value = arg.substring(arg.indexOf('=') + 1);
                switch (key) {
                    case "site" -> site = value.toLowerCase(Locale.ROOT);
                    case "fnatic" -> fnatic = Integer.parseInt(value);
                    case "esl" -> esl = Integer.parseInt(value);
                    case "riot" -> riot = Integer.parseInt(value);
                    case "out" -> out = Path.of(value);
                    case "images" -> images = Path.of(value);
                    case "cache" -> cache = Path.of(value);
                    case "throttle" -> throttle = Long.parseLong(value);
                    default -> throw new IllegalArgumentException("Opcion desconocida: --" + key);
                }
            }
            return new Args(site, fnatic, esl, riot, out, images, cache, throttle, help);
        }

        private int limitFor(String key) {
            return switch (key) {
                case "fnatic" -> fnatic;
                case "esl" -> esl;
                case "riot" -> riot;
                default -> 0;
            };
        }
    }
}
