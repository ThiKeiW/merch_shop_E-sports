package com.merchshop.admin.dto;

import com.merchshop.catalog.ProductImage;

public record AdminImageResponse(
        Long id,
        String path,
        String sourceUrl,
        String kind,
        boolean primary,
        Integer width,
        Integer height) {

    public static AdminImageResponse from(ProductImage image) {
        return new AdminImageResponse(
                image.getId(),
                image.getStoragePath(),
                image.getSourceUrl(),
                image.getKind(),
                image.isPrimary(),
                image.getWidth(),
                image.getHeight());
    }
}
