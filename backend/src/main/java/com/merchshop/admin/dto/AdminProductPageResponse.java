package com.merchshop.admin.dto;

import java.util.List;

public record AdminProductPageResponse(
        List<AdminProductSummaryResponse> items,
        int page,
        int size,
        long total,
        int totalPages) {
}
