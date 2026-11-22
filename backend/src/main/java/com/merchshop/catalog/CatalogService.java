package com.merchshop.catalog;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.catalog.dto.CatalogFacetsResponse;
import com.merchshop.catalog.dto.CategoryResponse;
import com.merchshop.catalog.dto.GameResponse;
import com.merchshop.catalog.dto.ProductDetailResponse;
import com.merchshop.catalog.dto.ProductPageResponse;
import com.merchshop.catalog.dto.ProductSummaryResponse;
import com.merchshop.catalog.dto.TeamResponse;
import com.merchshop.common.ApiException;

import jakarta.persistence.criteria.Predicate;

/**
 * Consultas públicas del catálogo. Los filtros de grupos distintos se combinan
 * con AND y los valores de un mismo grupo con OR (selección acumulativa).
 */
@Service
@Transactional(readOnly = true)
public class CatalogService {

    private static final int DEFAULT_SIZE = 12;
    private static final int MAX_SIZE = 48;

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final GameRepository gameRepository;
    private final TeamRepository teamRepository;
    private final CategoryRepository categoryRepository;

    public CatalogService(ProductRepository productRepository,
                          ProductVariantRepository variantRepository,
                          ProductImageRepository imageRepository,
                          GameRepository gameRepository,
                          TeamRepository teamRepository,
                          CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
        this.gameRepository = gameRepository;
        this.teamRepository = teamRepository;
        this.categoryRepository = categoryRepository;
    }

    public CatalogFacetsResponse facets(Set<String> gameSlugs) {
        List<Team> teams = gameSlugs.isEmpty()
                ? teamRepository.findByActiveTrueOrderByNameAsc()
                : teamRepository.findActiveByGameSlugs(gameSlugs);

        return new CatalogFacetsResponse(
                gameRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                        .map(GameResponse::from)
                        .toList(),
                teams.stream().map(TeamResponse::from).toList(),
                categoryRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                        .map(CategoryResponse::from)
                        .toList());
    }

    public ProductPageResponse products(CatalogFilters filters, String sort, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, sortOf(sort));

        Page<Product> result = productRepository.findAll(specification(filters), pageable);

        return new ProductPageResponse(
                ProductSummaryResponse.from(result.getContent(), primaryImages(result.getContent())),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    private Map<Long, String> primaryImages(List<Product> products) {
        if (products.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> images = new HashMap<>();
        List<Long> ids = products.stream().map(Product::getId).toList();
        imageRepository.findByProductIdInOrderByPrimaryDescIdAsc(ids).forEach(image ->
                images.putIfAbsent(image.getProductId(), image.getStoragePath()));
        return images;
    }

    public ProductDetailResponse product(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> ApiException.notFound("Producto no encontrado"));

        return ProductDetailResponse.from(
                product,
                variantRepository.findByProductIdOrderBySizeAscColorAsc(product.getId()),
                imageRepository.findByProductIdOrderByPrimaryDescIdAsc(product.getId()));
    }

    private static Specification<Product> specification(CatalogFilters filters) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.isTrue(root.get("active")));

            if (!filters.games().isEmpty()) {
                predicates.add(root.get("game").get("slug").in(filters.games()));
            }
            if (!filters.categories().isEmpty()) {
                predicates.add(root.get("category").get("slug").in(filters.categories()));
            }
            if (!filters.teams().isEmpty()) {
                predicates.add(root.get("team").get("slug").in(filters.teams()));
            }
            if (filters.query() != null) {
                String pattern = "%" + filters.query() + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("name")), pattern),
                        builder.like(builder.lower(root.get("description")), pattern)));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static Sort sortOf(String sort) {
        if (sort == null) {
            return defaultSort();
        }
        return switch (sort) {
            case "price-asc" -> Sort.by(Sort.Order.asc("price"), Sort.Order.asc("name"));
            case "price-desc" -> Sort.by(Sort.Order.desc("price"), Sort.Order.asc("name"));
            case "name" -> Sort.by(Sort.Order.asc("name"));
            case "newest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
            default -> defaultSort();
        };
    }

    private static Sort defaultSort() {
        return Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
    }
}
