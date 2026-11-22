package com.merchshop.importer.source;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.jsoup.Jsoup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.merchshop.importer.config.Config;
import com.merchshop.importer.fetch.CachedFetcher;
import com.merchshop.importer.model.ScrapedImage;
import com.merchshop.importer.model.ScrapedProduct;
import com.merchshop.importer.model.ScrapedVariant;

/**
 * Fuente Shopify: /products.json paginado (shop.fnatic.com, shop.esl.com).
 * Los datos llegan completos en el listado, sin necesidad de pedir el detalle.
 */
public final class ShopifySource {

    private static final int PAGE_SIZE = 250;
    private static final int MAX_PAGES = 12;
    private static final Set<String> SIZE_TOKENS = Set.of(
            "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL",
            "UNICA", "UNIQUE", "ONE SIZE", "OS", "TALLA UNICA");

    private final CachedFetcher fetcher;
    private final ObjectMapper mapper;

    public ShopifySource(CachedFetcher fetcher, ObjectMapper mapper) {
        this.fetcher = fetcher;
        this.mapper = mapper;
    }

    /** Devuelve los nodos de producto del listado paginado. */
    public List<JsonNode> productNodes(Config.Site site) throws Exception {
        List<JsonNode> products = new ArrayList<>();
        for (int page = 1; page <= MAX_PAGES; page++) {
            String url = site.baseUrl() + "/products.json?limit=" + PAGE_SIZE + "&page=" + page;
            JsonNode root = mapper.readTree(fetcher.text(url));
            JsonNode batch = root.path("products");
            if (!batch.isArray() || batch.isEmpty()) {
                break;
            }
            batch.forEach(products::add);
            if (batch.size() < PAGE_SIZE) {
                break;
            }
        }
        return products;
    }

    public static String hostOf(Config.Site site) {
        return java.net.URI.create(site.baseUrl()).getHost();
    }

    /** Mapea el JSON de un producto a la estructura comun. */
    public static ScrapedProduct map(JsonNode product, Config.Site site) {
        String handle = text(product, "handle");
        String title = text(product, "title");
        if (handle == null || handle.isBlank() || title == null || title.isBlank()) {
            throw new IllegalArgumentException("Producto sin handle/title");
        }

        List<ScrapedVariant> variants = new ArrayList<>();
        BigDecimal minPrice = null;
        for (JsonNode variant : product.path("variants")) {
            BigDecimal price = money(text(variant, "price"));
            if (price != null && (minPrice == null || price.compareTo(minPrice) < 0)) {
                minPrice = price;
            }
            String option1 = text(variant, "option1");
            String option2 = text(variant, "option2");
            String size = sizeOf(option1, option2);
            String color = colorOf(option1, option2);
            variants.add(new ScrapedVariant(
                    text(variant, "sku"),
                    size,
                    color,
                    price,
                    variant.path("available").asBoolean(false)));
        }

        List<ScrapedImage> images = new ArrayList<>();
        int position = 1;
        for (JsonNode image : product.path("images")) {
            String src = text(image, "src");
            if (src == null) {
                continue;
            }
            images.add(new ScrapedImage(
                    src,
                    image.hasNonNull("width") ? image.get("width").asInt() : null,
                    image.hasNonNull("height") ? image.get("height").asInt() : null,
                    position++));
        }
        images.sort(Comparator.comparingInt(ScrapedImage::position));

        List<String> tags = new ArrayList<>();
        JsonNode tagNode = product.path("tags");
        if (tagNode.isArray()) {
            tagNode.forEach(tag -> tags.add(tag.asText()));
        } else if (tagNode.isTextual()) {
            for (String tag : tagNode.asText().split(",")) {
                String trimmed = tag.trim();
                if (!trimmed.isEmpty()) {
                    tags.add(trimmed);
                }
            }
        }

        return new ScrapedProduct(
                "https://" + hostOf(site) + "/products/" + handle,
                handle,
                title,
                stripHtml(text(product, "body_html")),
                site.currency(),
                minPrice,
                tags,
                text(product, "product_type"),
                text(product, "vendor"),
                null,
                variants,
                images);
    }

    private static String sizeOf(String option1, String option2) {
        if (isSize(option1)) {
            return normalizeSize(option1);
        }
        if (isSize(option2)) {
            return normalizeSize(option2);
        }
        return "UNICA";
    }

    private static String colorOf(String option1, String option2) {
        String candidate = isSize(option1) ? option2 : option1;
        if (candidate == null || candidate.isBlank()
                || "Default".equalsIgnoreCase(candidate)
                || "Default Title".equalsIgnoreCase(candidate)
                || "Undefined".equalsIgnoreCase(candidate)
                || isSize(candidate)) {
            return "DEFAULT";
        }
        return candidate.toUpperCase(Locale.ROOT);
    }

    private static boolean isSize(String value) {
        if (value == null) {
            return false;
        }
        return SIZE_TOKENS.contains(value.trim().toUpperCase(Locale.ROOT));
    }

    private static String normalizeSize(String value) {
        String size = value.trim().toUpperCase(Locale.ROOT);
        return switch (size) {
            case "ONE SIZE", "OS", "UNIQUE", "TALLA UNICA" -> "UNICA";
            default -> size;
        };
    }

    private static String stripHtml(String html) {
        if (html == null) {
            return null;
        }
        return Jsoup.parse(html).text();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private static BigDecimal money(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
