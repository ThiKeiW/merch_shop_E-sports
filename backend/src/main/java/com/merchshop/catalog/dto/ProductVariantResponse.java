package com.merchshop.catalog.dto;

import java.math.BigDecimal;

import com.merchshop.catalog.ProductVariant;

public record ProductVariantResponse(
        Long id,
        String sku,
        String size,
        String color,
        BigDecimal priceDelta,
        BigDecimal finalPrice,
        int stock,
        boolean available) {

    public static ProductVariantResponse from(ProductVariant variant, BigDecimal basePrice) {
        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getSize(),
                variant.getColor(),
                variant.getPriceDelta(),
                basePrice.add(variant.getPriceDelta()),
                variant.getStock(),
                variant.getStock() > 0);
    }
}
