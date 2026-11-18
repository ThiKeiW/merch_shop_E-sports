package com.merchshop.catalog.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.merchshop.catalog.Product;

public record ProductSummaryResponse(
        Long id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String currency,
        boolean featured,
        String imageUrl,
        GameResponse game,
        CategoryResponse category,
        TeamResponse team) {

    public static ProductSummaryResponse from(Product product, String imageUrl) {
        return new ProductSummaryResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getCurrency(),
                product.isFeatured(),
                imageUrl,
                GameResponse.from(product.getGame()),
                CategoryResponse.from(product.getCategory()),
                product.getTeam() == null ? null : TeamResponse.from(product.getTeam()));
    }

    public static List<ProductSummaryResponse> from(List<Product> products, Map<Long, String> imageByProduct) {
        return products.stream()
                .map(product -> from(product, imageByProduct.get(product.getId())))
                .toList();
    }
}
