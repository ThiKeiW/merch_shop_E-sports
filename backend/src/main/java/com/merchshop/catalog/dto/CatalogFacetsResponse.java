package com.merchshop.catalog.dto;

import java.util.List;

public record CatalogFacetsResponse(
        List<GameResponse> games,
        List<TeamResponse> teams,
        List<CategoryResponse> categories) {
}
