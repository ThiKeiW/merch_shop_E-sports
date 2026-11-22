package com.merchshop.catalog.dto;

import com.merchshop.catalog.ProductImage;

public record ProductImageResponse(
        Long id,
        String kind,
        String path,
        boolean primary) {

    public static ProductImageResponse from(ProductImage image) {
        return new ProductImageResponse(
                image.getId(),
                image.getKind(),
                image.getStoragePath(),
                image.isPrimary());
    }
}
