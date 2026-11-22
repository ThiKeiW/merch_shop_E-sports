package com.merchshop.importer.source;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.merchshop.importer.model.ScrapedImage;
import com.merchshop.importer.model.ScrapedProduct;
import com.merchshop.importer.model.ScrapedVariant;

/**
 * Parser del payload React Server Components (Flight) de merch.riotgames.com.
 * Portado del scraper original: escanea llaves balanceadas en vez de usar
 * regex sobre strings largos (evita el StackOverflow por backtracking).
 */
public final class RiotRscParser {

    private static final String PUSH_MARKER = "self.__next_f.push([1,\"";

    private RiotRscParser() {
    }

    public static JsonNode productNode(String html, ObjectMapper mapper) {
        String payload = payload(html);
        int from = 0;
        while (true) {
            int start = payload.indexOf("\"product\":{", from);
            if (start < 0) {
                return null;
            }
            int objectStart = start + "\"product\":".length();
            String json = balancedJson(payload, objectStart);
            if (json != null) {
                try {
                    JsonNode node = mapper.readTree(json);
                    if (node.has("shopifyData")) {
                        return node;
                    }
                } catch (Exception ignored) {
                    // no es el objeto buscado
                }
            }
            from = start + 1;
        }
    }

    public static ScrapedProduct toScrapedProduct(JsonNode product, String sourceUrl) {
        String slug = text(product, "slug");
        String trackingTitle = text(product, "trackingTitle");

        List<ScrapedVariant> variants = new ArrayList<>();
        BigDecimal minPrice = null;
        JsonNode shopifyData = product.path("shopifyData");
        for (JsonNode variant : shopifyData.path("variants")) {
            BigDecimal price = money(variant.path("price").path("amount").asText(null));
            if (price != null && (minPrice == null || price.compareTo(minPrice) < 0)) {
                minPrice = price;
            }
            String size = null;
            String color = null;
            for (JsonNode option : variant.path("selectedOptions")) {
                String name = text(option, "name");
                if (name == null) {
                    continue;
                }
                String lower = name.toLowerCase();
                if (lower.equals("size") || lower.equals("talla")) {
                    size = text(option, "value");
                } else if (lower.equals("color") || lower.equals("colour")) {
                    color = text(option, "value");
                }
            }
            variants.add(new ScrapedVariant(
                    text(variant, "sku"),
                    size == null || size.isBlank() ? "UNICA" : size.toUpperCase(),
                    color == null || color.isBlank() ? "DEFAULT" : color.toUpperCase(),
                    price,
                    variant.path("availableForSale").asBoolean(true)));
        }

        List<ScrapedImage> images = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int position = 1;
        for (JsonNode asset : product.path("assets")) {
            String src = text(asset, "src");
            if (src != null && seen.add(src)) {
                images.add(new ScrapedImage(src,
                        asset.hasNonNull("width") ? asset.get("width").asInt() : null,
                        asset.hasNonNull("height") ? asset.get("height").asInt() : null,
                        position++));
            }
        }
        for (JsonNode variant : shopifyData.path("variants")) {
            String imageUrl = text(variant, "imageUrl");
            if (imageUrl != null && seen.add(imageUrl)) {
                images.add(new ScrapedImage(imageUrl, null, null, position++));
            }
        }

        StringBuilder description = new StringBuilder();
        for (JsonNode info : product.path("info")) {
            String copy = text(info, "copy");
            if (copy == null || copy.isBlank()) {
                continue;
            }
            String clean = org.jsoup.Jsoup.parse(copy).text()
                    .replace('\u00A0', ' ')
                    .replaceAll("(?<=\\d) +%", "%")
                    .trim();
            // Referencias internas del payload Flight (ej. "$1e") no son texto.
            if (clean.isBlank() || clean.matches("^\\$\\w+$")) {
                continue;
            }
            if (description.length() > 0) {
                description.append('\n');
            }
            description.append(clean);
        }

        String currency = null;
        JsonNode firstPrice = shopifyData.path("variants").path(0).path("price");
        if (firstPrice.hasNonNull("currencyCode")) {
            currency = firstPrice.get("currencyCode").asText();
        }

        List<String> tags = new ArrayList<>();
        JsonNode categories = product.path("categories");
        if (categories.isArray()) {
            categories.forEach(c -> {
                String url = text(c, "url");
                if (url != null) {
                    tags.add(url.replace("/", ""));
                }
            });
        }
        String primaryCategoryUrl = text(product.path("primaryCategory"), "url");
        if (primaryCategoryUrl != null) {
            tags.add(primaryCategoryUrl.replace("/", ""));
        }

        String title = firstNonBlank(text(product, "title"), trackingTitle);
        if (title == null) {
            title = slug;
        }

        return new ScrapedProduct(
                sourceUrl,
                slug,
                title,
                description.length() == 0 ? null : description.toString(),
                currency,
                minPrice,
                tags,
                text(product, "productType"),
                "Riot Games",
                text(product.path("ip"), "slug"),
                variants,
                images);
    }

    private static String payload(String html) {
        StringBuilder payload = new StringBuilder();
        int from = 0;
        while (true) {
            int marker = html.indexOf(PUSH_MARKER, from);
            if (marker < 0) {
                break;
            }
            int start = marker + PUSH_MARKER.length();
            int end = -1;
            for (int i = start; i < html.length(); i++) {
                char c = html.charAt(i);
                if (c == '\\') {
                    i++;
                } else if (c == '"') {
                    end = i;
                    break;
                }
            }
            if (end < 0) {
                break;
            }
            payload.append(unescapeJs(html.substring(start, end)));
            from = end + 1;
        }
        return payload.toString();
    }

    private static String balancedJson(String text, int start) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
            } else if (c == '"') {
                inString = true;
            } else if (c == '{') {
                depth++;
            } else if (c == '}') {
                if (--depth == 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
        return null;
    }

    private static String unescapeJs(String escaped) {
        StringBuilder out = new StringBuilder(escaped.length());
        for (int i = 0; i < escaped.length(); i++) {
            char c = escaped.charAt(i);
            if (c != '\\') {
                out.append(c);
                continue;
            }
            if (++i >= escaped.length()) {
                out.append('\\');
                break;
            }
            char next = escaped.charAt(i);
            switch (next) {
                case 'n' -> out.append('\n');
                case 't' -> out.append('\t');
                case 'r' -> out.append('\r');
                case 'u' -> {
                    if (i + 4 < escaped.length()) {
                        out.append((char) Integer.parseInt(escaped.substring(i + 1, i + 5), 16));
                        i += 4;
                    } else {
                        out.append('u');
                    }
                }
                default -> out.append(next);
            }
        }
        return out.toString();
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

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b;
    }
}
