package com.merchshop.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

import com.merchshop.catalog.Product;

public record ProductSummaryResponse(
        Long id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String currency,
        boolean featured,
        GameResponse game,
        CategoryResponse category,
        TeamResponse team) {

    public static ProductSummaryResponse from(Product product) {
        return new ProductSummaryResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getCurrency(),
                product.isFeatured(),
                GameResponse.from(product.getGame()),
                CategoryResponse.from(product.getCategory()),
                product.getTeam() == null ? null : TeamResponse.from(product.getTeam()));
    }

    public static List<ProductSummaryResponse> from(List<Product> products) {
        return products.stream().map(ProductSummaryResponse::from).toList();
    }
}
