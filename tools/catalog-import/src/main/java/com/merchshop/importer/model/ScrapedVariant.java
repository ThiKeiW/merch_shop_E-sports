package com.merchshop.importer.model;

import java.math.BigDecimal;

/** Variante de un producto tal como la publica la tienda de origen. */
public record ScrapedVariant(String sku, String size, String color, BigDecimal price, boolean available) {
}
