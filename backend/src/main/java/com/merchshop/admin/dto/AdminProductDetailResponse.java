package com.merchshop.admin.dto;

import java.math.BigDecimal;
import java.util.List;

import com.merchshop.catalog.Product;
import com.merchshop.catalog.ProductImage;
import com.merchshop.catalog.ProductVariant;

public record AdminProductDetailResponse(
        Long id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String currency,
        boolean active,
        boolean featured,
        String game,
        String category,
        String subcategory,
        String team,
        List<AdminVariantResponse> variants,
        List<AdminImageResponse> images) {

    public static AdminProductDetailResponse from(Product product,
                                                  List<ProductVariant> variants,
                                                  List<ProductImage> images) {
        return new AdminProductDetailResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getCurrency(),
                product.isActive(),
                product.isFeatured(),
                product.getGame().getSlug(),
                product.getCategory().getSlug(),
                product.getSubcategory() == null ? null : product.getSubcategory().getSlug(),
                product.getTeam() == null ? null : product.getTeam().getSlug(),
                variants.stream().map(AdminVariantResponse::from).toList(),
                images.stream().map(AdminImageResponse::from).toList());
    }
}
