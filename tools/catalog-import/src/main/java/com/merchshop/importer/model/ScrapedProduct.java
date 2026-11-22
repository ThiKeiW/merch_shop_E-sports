package com.merchshop.importer.model;

import java.math.BigDecimal;
import java.util.List;

/** Producto normalizado, independiente de la tienda de origen. */
public record ScrapedProduct(
        String sourceUrl,
        String handle,
        String name,
        String description,
        String currency,
        BigDecimal price,
        List<String> tags,
        String productType,
        String vendor,
        String gameHint,
        List<ScrapedVariant> variants,
        List<ScrapedImage> images) {
}
