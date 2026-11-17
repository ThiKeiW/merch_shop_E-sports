package com.merchshop.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

import com.merchshop.catalog.Product;
import com.merchshop.catalog.ProductImage;
import com.merchshop.catalog.ProductVariant;

public record ProductDetailResponse(
        Long id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String currency,
        boolean featured,
        GameResponse game,
        CategoryResponse category,
        TeamResponse team,
        List<ProductVariantResponse> variants,
        List<ProductImageResponse> images) {

    public static ProductDetailResponse from(Product product,
                                             List<ProductVariant> variants,
                                             List<ProductImage> images) {
        return new ProductDetailResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getCurrency(),
                product.isFeatured(),
                GameResponse.from(product.getGame()),
                CategoryResponse.from(product.getCategory()),
                product.getTeam() == null ? null : TeamResponse.from(product.getTeam()),
                variants.stream()
                        .map(variant -> ProductVariantResponse.from(variant, product.getPrice()))
                        .toList(),
                images.stream().map(ProductImageResponse::from).toList());
    }
}
