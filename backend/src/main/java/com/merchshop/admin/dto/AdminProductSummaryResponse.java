package com.merchshop.admin.dto;

import java.math.BigDecimal;

public record AdminProductSummaryResponse(
        Long id,
        String slug,
        String name,
        BigDecimal price,
        String currency,
        boolean active,
        boolean featured,
        String game,
        String category,
        String subcategory,
        String team,
        String imageUrl,
        int stock,
        int variantCount) {
}
