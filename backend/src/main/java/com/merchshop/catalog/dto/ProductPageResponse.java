package com.merchshop.catalog.dto;

import java.util.List;

public record ProductPageResponse(
        List<ProductSummaryResponse> items,
        int page,
        int size,
        long total,
        int totalPages) {
}
