package com.merchshop.admin.dto;

import java.math.BigDecimal;

import com.merchshop.catalog.ProductVariant;

public record AdminVariantResponse(
        Long id,
        String sku,
        String size,
        String color,
        BigDecimal priceDelta,
        int stock) {

    public static AdminVariantResponse from(ProductVariant variant) {
        return new AdminVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getSize(),
                variant.getColor(),
                variant.getPriceDelta(),
                variant.getStock());
    }
}
