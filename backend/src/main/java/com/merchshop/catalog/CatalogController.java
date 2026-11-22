package com.merchshop.catalog;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.catalog.dto.CatalogFacetsResponse;
import com.merchshop.catalog.dto.ProductDetailResponse;
import com.merchshop.catalog.dto.ProductPageResponse;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    public ProductPageResponse products(
            @RequestParam(required = false) List<String> game,
            @RequestParam(required = false) List<String> team,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "relevance") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return catalogService.products(CatalogFilters.of(game, team, category, q), sort, page, size);
    }

    @GetMapping("/products/{slug}")
    public ProductDetailResponse product(@PathVariable String slug) {
        return catalogService.product(slug.trim().toLowerCase(Locale.ROOT));
    }

    @GetMapping("/facets")
    public CatalogFacetsResponse facets(@RequestParam(required = false) List<String> game) {
        return catalogService.facets(normalize(game));
    }

    private static Set<String> normalize(List<String> values) {
        if (values == null) {
            return Set.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }
}
