package com.merchshop.importer.sql;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.merchshop.importer.config.Config;

/**
 * Acumula el catalogo aceptado y escribe db/03-catalog.sql.
 *
 * <p>Los ids son deterministas (equipos nuevos 101+, productos 1001+,
 * variantes 5001+, imagenes 7001+) para que el seed sea reproducible y las
 * re-ejecuciones usen INSERT IGNORE sin duplicar.</p>
 */
public final class CatalogWriter {

    private static final long FIRST_PRODUCT_ID = 1001L;
    private static final long FIRST_VARIANT_ID = 5001L;
    private static final long FIRST_IMAGE_ID = 7001L;
    private static final long FIRST_TEAM_ID = 101L;

    private final List<ProductRow> products = new ArrayList<>();
    private final List<TeamRow> newTeams = new ArrayList<>();
    private final Set<String> usedSlugs = new LinkedHashSet<>();
    private final Set<String> usedSkus = new LinkedHashSet<>();
    private long nextProductId = FIRST_PRODUCT_ID;
    private long nextVariantId = FIRST_VARIANT_ID;
    private long nextImageId = FIRST_IMAGE_ID;
    private long nextTeamId = FIRST_TEAM_ID;

    public record VariantRow(long id, String sku, String size, String color,
                             BigDecimal priceDelta, int stock) {
    }

    public record ImageRow(long id, String storagePath, String sourceUrl, String format,
                           int width, int height) {
    }

    public record ProductRow(long id, String slug, String name, String description,
                             String gameSlug, String categorySlug, String subcategorySlug,
                             String teamSlug, BigDecimal price, String currency,
                             boolean featured, List<VariantRow> variants, ImageRow image) {
    }

    public record TeamRow(long id, String slug, String name, long gameId) {
    }

    public boolean containsSlug(String slug) {
        return usedSlugs.contains(slug);
    }

    public int size() {
        return products.size();
    }

    /**
     * Agrega un producto aceptado. Devuelve false si el slug ya existe (el
     * producto se descarta).
     */
    public boolean add(String slug, String name, String description, BigDecimal price,
                       String currency, String gameSlug, String categorySlug,
                       String subcategorySlug, String teamSlug, String teamName,
                       boolean featured, List<VariantRowInput> variants, String imageFileName,
                       String imageFormat, int imageWidth, int imageHeight, String imageSourceUrl) {
        if (price == null || price.signum() <= 0 || !usedSlugs.add(slug)) {
            return false;
        }

        long teamId = 0;
        if (teamSlug != null) {
            Config.SeedTeam seed = Config.SEED_TEAMS.get(teamSlug);
            if (seed != null) {
                teamId = seed.id();
            } else {
                teamId = teamIdOf(teamSlug, teamName, gameSlug);
            }
        }

        BigDecimal basePrice = price.setScale(2, RoundingMode.HALF_UP);
        long productId = nextProductId++;
        List<VariantRow> variantRows = new ArrayList<>();
        Set<String> productKeys = new LinkedHashSet<>();
        for (VariantRowInput input : variants) {
            String key = input.size() + "|" + input.color();
            if (!productKeys.add(key)) {
                continue;
            }
            String sku = uniqueSku(input.sku(), slug, variantRows.size() + 1);
            BigDecimal delta = input.price() == null
                    ? BigDecimal.ZERO.setScale(2)
                    : input.price().subtract(basePrice).setScale(2, RoundingMode.HALF_UP);
            variantRows.add(new VariantRow(nextVariantId++, sku, input.size(), input.color(),
                    delta, input.stock()));
        }

        long imageId = nextImageId++;
        products.add(new ProductRow(productId, slug, name, description, gameSlug, categorySlug,
                subcategorySlug, teamSlug, basePrice, currency == null ? "EUR" : currency,
                featured, variantRows,
                new ImageRow(imageId, "/images/products/" + imageFileName, imageSourceUrl,
                        imageFormat, imageWidth, imageHeight)));
        return true;
    }

    private long teamIdOf(String slug, String name, String gameSlug) {
        for (TeamRow team : newTeams) {
            if (team.slug().equals(slug)) {
                return team.id();
            }
        }
        long gameId = Config.GAME_IDS.getOrDefault(gameSlug, 3L);
        TeamRow row = new TeamRow(nextTeamId++, slug, name == null ? slug : name, gameId);
        newTeams.add(row);
        return row.id();
    }

    private String uniqueSku(String raw, String slug, int position) {
        String base = raw == null || raw.isBlank()
                ? slug.toUpperCase().replace('-', '-') + "-" + position
                : raw.trim();
        String sku = base.length() > 60 ? base.substring(0, 60) : base;
        String candidate = sku;
        int suffix = 2;
        while (!usedSkus.add(candidate)) {
            String tail = "-" + suffix++;
            candidate = (sku.length() + tail.length() > 64 ? sku.substring(0, 64 - tail.length()) : sku) + tail;
        }
        return candidate;
    }

    public record VariantRowInput(String sku, String size, String color, BigDecimal price, int stock) {
    }

    public void write(Path target, String sourceSummary) throws IOException {
        Path parent = target.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        StringBuilder sql = new StringBuilder();
        sql.append("-- =====================================================================\n");
        sql.append("-- 03-catalog.sql — Catalogo real generado por tools/catalog-import\n");
        sql.append("-- Generado: ").append(LocalDate.now()).append('\n');
        sql.append("-- Fuentes: ").append(sourceSummary).append('\n');
        sql.append("--\n");
        sql.append("-- No editar a mano: re-ejecuta el importador para regenerarlo.\n");
        sql.append("-- El stock de las variantes es sintetico: las tiendas no publican inventario real.\n");
        sql.append("-- Depende de db/01-schema.sql y db/02-seed.sql (dimensiones y usuarios).\n");
        sql.append("-- =====================================================================\n\n");
        sql.append("SET NAMES utf8mb4;\n\nUSE merch_shop;\n");

        if (!newTeams.isEmpty()) {
            sql.append("\n-- ---------------------------------------------------------------------\n");
            sql.append("-- Equipos nuevos detectados en las tiendas\n");
            sql.append("-- ---------------------------------------------------------------------\n");
            sql.append("INSERT IGNORE INTO teams (id, game_id, slug, name, active) VALUES\n");
            appendRows(sql, newTeams.stream()
                    .map(t -> "    (" + t.id() + ", " + t.gameId() + ", " + q(t.slug()) + ", "
                            + q(t.name()) + ", 1)")
                    .toList());
            sql.append(";\n");
        }

        sql.append("\n-- ---------------------------------------------------------------------\n");
        sql.append("-- Productos (").append(products.size()).append(")\n");
        sql.append("-- ---------------------------------------------------------------------\n");
        sql.append("INSERT IGNORE INTO products\n");
        sql.append("    (id, slug, name, description, game_id, category_id, subcategory_id,");
        sql.append(" team_id, price, currency, featured, active)\nVALUES\n");
        appendRows(sql, products.stream().map(p -> {
            Long gameId = Config.GAME_IDS.get(p.gameSlug());
            Long categoryId = Config.CATEGORY_IDS.get(p.categorySlug());
            Long subcategoryId = p.subcategorySlug() == null
                    ? null
                    : Config.SUBCATEGORIES.get(p.subcategorySlug()).id();
            Long teamId = p.teamSlug() == null ? null : teamIdFor(p.teamSlug());
            return "    (" + p.id() + ", " + q(p.slug()) + ", " + q(p.name()) + ", "
                    + q(truncate(p.description(), 1200)) + ", "
                    + gameId + ", " + categoryId + ", " + subcategoryId + ", " + teamId + ", "
                    + p.price().toPlainString() + ", " + q(p.currency()) + ", "
                    + (p.featured() ? 1 : 0) + ", 1)";
        }).toList());
        sql.append(";\n");

        sql.append("\n-- ---------------------------------------------------------------------\n");
        sql.append("-- Variantes\n");
        sql.append("-- ---------------------------------------------------------------------\n");
        sql.append("INSERT IGNORE INTO product_variants\n");
        sql.append("    (id, product_id, sku, size, color, price_delta, stock)\nVALUES\n");
        List<String> variantValues = new ArrayList<>();
        for (ProductRow product : products) {
            for (VariantRow variant : product.variants()) {
                variantValues.add("    (" + variant.id() + ", " + product.id() + ", "
                        + q(variant.sku()) + ", " + q(variant.size()) + ", "
                        + q(variant.color()) + ", " + variant.priceDelta().toPlainString() + ", "
                        + variant.stock() + ")");
            }
        }
        appendRows(sql, variantValues);
        sql.append(";\n");

        sql.append("\n-- ---------------------------------------------------------------------\n");
        sql.append("-- Imagenes (CARD en /images/products, servidas por el frontend)\n");
        sql.append("-- ---------------------------------------------------------------------\n");
        sql.append("INSERT IGNORE INTO product_images\n");
        sql.append("    (id, product_id, source_url, storage_path, kind, width, height, format, is_primary)\nVALUES\n");
        appendRows(sql, products.stream()
                .map(p -> "    (" + p.image().id() + ", " + p.id() + ", "
                        + q(p.image().sourceUrl()) + ", " + q(p.image().storagePath()) + ", "
                        + "'CARD', " + p.image().width() + ", " + p.image().height() + ", "
                        + q(p.image().format()) + ", 1)")
                .toList());
        sql.append(";\n");

        Files.writeString(target, sql.toString(), StandardCharsets.UTF_8);
    }

    private record ProductVariantRow(long productId, VariantRow variant) {
    }

    private long teamIdFor(String slug) {
        Config.SeedTeam seed = Config.SEED_TEAMS.get(slug);
        if (seed != null) {
            return seed.id();
        }
        for (TeamRow team : newTeams) {
            if (team.slug().equals(slug)) {
                return team.id();
            }
        }
        throw new IllegalStateException("Equipo no registrado: " + slug);
    }

    private static void appendRows(StringBuilder sql, List<String> rows) {
        for (int i = 0; i < rows.size(); i++) {
            sql.append(rows.get(i));
            sql.append(i == rows.size() - 1 ? "\n" : ",\n");
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String clean = value.replaceAll("\\s+", " ").trim();
        return clean.length() <= max ? clean : clean.substring(0, max - 1) + "…";
    }

    private static String q(String value) {
        if (value == null) {
            return "NULL";
        }
        return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'";
    }
}
