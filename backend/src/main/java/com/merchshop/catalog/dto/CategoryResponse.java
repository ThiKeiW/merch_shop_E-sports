package com.merchshop.catalog.dto;

import com.merchshop.catalog.Category;

public record CategoryResponse(Long id, String slug, String name) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getSlug(), category.getName());
    }
}
