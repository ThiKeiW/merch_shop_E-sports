package com.merchshop.admin;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.admin.dto.AdminFacetsResponse;
import com.merchshop.admin.dto.AdminImageRequest;
import com.merchshop.admin.dto.AdminImageResponse;
import com.merchshop.admin.dto.AdminProductDetailResponse;
import com.merchshop.admin.dto.AdminProductPageResponse;
import com.merchshop.admin.dto.AdminProductRequest;
import com.merchshop.admin.dto.AdminProductSummaryResponse;
import com.merchshop.admin.dto.AdminVariantRequest;
import com.merchshop.catalog.Category;
import com.merchshop.catalog.CategoryRepository;
import com.merchshop.catalog.Game;
import com.merchshop.catalog.GameRepository;
import com.merchshop.catalog.Product;
import com.merchshop.catalog.ProductImage;
import com.merchshop.catalog.ProductImageRepository;
import com.merchshop.catalog.ProductRepository;
import com.merchshop.catalog.ProductVariant;
import com.merchshop.catalog.ProductVariantRepository;
import com.merchshop.catalog.Subcategory;
import com.merchshop.catalog.SubcategoryRepository;
import com.merchshop.catalog.Team;
import com.merchshop.catalog.TeamRepository;
import com.merchshop.common.ApiException;

import jakarta.persistence.criteria.Predicate;

/**
 * CRUD de productos del panel de administración. El borrado es lógico
 * ({@code active = false}) para no romper referencias de pedidos.
 */
@Service
@Transactional(readOnly = true)
public class AdminProductService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;
    private static final int MAX_SLUG_LENGTH = 150;
    private static final Set<String> IMAGE_KINDS = Set.of("THUMB", "CARD", "DETAIL");

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final GameRepository gameRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final TeamRepository teamRepository;

    public AdminProductService(ProductRepository productRepository,
                               ProductVariantRepository variantRepository,
                               ProductImageRepository imageRepository,
                               GameRepository gameRepository,
                               CategoryRepository categoryRepository,
                               SubcategoryRepository subcategoryRepository,
                               TeamRepository teamRepository) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
        this.gameRepository = gameRepository;
        this.categoryRepository = categoryRepository;
        this.subcategoryRepository = subcategoryRepository;
        this.teamRepository = teamRepository;
    }

    public AdminProductPageResponse list(String query, Boolean active, String game, String category,
                                         String team, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.desc("id")));

        Page<Product> result = productRepository.findAll(
                specification(query, active, game, category, team), pageable);

        List<Long> ids = result.getContent().stream().map(Product::getId).toList();
        Map<Long, String> images = new HashMap<>();
        Map<Long, int[]> variantStats = new HashMap<>();

        if (!ids.isEmpty()) {
            imageRepository.findByProductIdInOrderByPrimaryDescIdAsc(ids).forEach(image ->
                    images.putIfAbsent(image.getProductId(), image.getStoragePath()));
            variantRepository.findByProductIdIn(ids).forEach(variant -> {
                int[] stats = variantStats.computeIfAbsent(variant.getProductId(), id -> new int[2]);
                stats[0] += variant.getStock();
                stats[1]++;
            });
        }

        List<AdminProductSummaryResponse> items = result.getContent().stream()
                .map(product -> {
                    int[] stats = variantStats.getOrDefault(product.getId(), new int[2]);
                    return summary(product, images.get(product.getId()), stats[0], stats[1]);
                })
                .toList();

        return new AdminProductPageResponse(
                items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    public AdminProductDetailResponse detail(Long id) {
        Product product = findProduct(id);
        return AdminProductDetailResponse.from(
                product,
                variantRepository.findByProductIdOrderBySizeAscColorAsc(id),
                imageRepository.findByProductIdOrderByPrimaryDescIdAsc(id));
    }

    public AdminFacetsResponse facets() {
        List<Subcategory> subcategories = subcategoryRepository.findByActiveTrueOrderByDisplayOrderAsc();

        return new AdminFacetsResponse(
                gameRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                        .map(AdminFacetsResponse.GameOption::from)
                        .toList(),
                categoryRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                        .map(category -> AdminFacetsResponse.CategoryOption.from(
                                category,
                                subcategories.stream()
                                        .filter(sub -> sub.getCategory().getId().equals(category.getId()))
                                        .toList()))
                        .toList(),
                teamRepository.findByActiveTrueOrderByNameAsc().stream()
                        .map(AdminFacetsResponse.TeamOption::from)
                        .toList());
    }

    @Transactional
    public AdminProductDetailResponse create(AdminProductRequest request) {
        Game game = findGame(request.game());
        Category category = findCategory(request.category());
        Subcategory subcategory = findSubcategory(request.subcategory(), category);
        Team team = findTeam(request.team());

        Product product = new Product();
        product.setSlug(resolveSlug(request.slug(), request.name(), null));
        apply(product, request, game, category, subcategory, team);
        productRepository.save(product);

        List<ProductVariant> variants = saveVariants(product.getId(), request.variants(), Set.of());
        List<ProductImage> images = saveImages(product.getId(), request.images());

        return AdminProductDetailResponse.from(product, variants, images);
    }

    @Transactional
    public AdminProductDetailResponse update(Long id, AdminProductRequest request) {
        Product product = findProduct(id);
        Game game = findGame(request.game());
        Category category = findCategory(request.category());
        Subcategory subcategory = findSubcategory(request.subcategory(), category);
        Team team = findTeam(request.team());

        String slug = request.slug() == null || request.slug().isBlank()
                ? product.getSlug()
                : resolveSlug(request.slug(), request.name(), id);
        product.setSlug(slug);
        apply(product, request, game, category, subcategory, team);
        productRepository.save(product);

        Set<String> ownSkus = new HashSet<>();
        variantRepository.findByProductIdOrderBySizeAscColorAsc(id)
                .forEach(variant -> ownSkus.add(variant.getSku()));
        variantRepository.deleteByProductId(id);
        variantRepository.flush();
        imageRepository.deleteByProductId(id);
        imageRepository.flush();

        List<ProductVariant> variants = saveVariants(id, request.variants(), ownSkus);
        List<ProductImage> images = saveImages(id, request.images());

        return AdminProductDetailResponse.from(product, variants, images);
    }

    @Transactional
    public void deactivate(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private void apply(Product product, AdminProductRequest request, Game game, Category category,
                       Subcategory subcategory, Team team) {
        product.setName(request.name().trim());
        product.setDescription(request.description() == null ? null : request.description().trim());
        product.setGame(game);
        product.setCategory(category);
        product.setSubcategory(subcategory);
        product.setTeam(team);
        product.setPrice(request.price());
        product.setCurrency(request.currency() == null ? "EUR" : request.currency());
        product.setFeatured(Boolean.TRUE.equals(request.featured()));
        product.setActive(request.active() == null || request.active());
    }

    private List<ProductVariant> saveVariants(Long productId, List<AdminVariantRequest> requests, Set<String> ownSkus) {
        Set<String> usedSkus = new HashSet<>();
        Set<String> combinations = new HashSet<>();
        List<ProductVariant> variants = new ArrayList<>();

        for (AdminVariantRequest request : requests) {
            String size = request.size().trim();
            String color = request.color().trim();
            String combination = size.toLowerCase(Locale.ROOT) + "|" + color.toLowerCase(Locale.ROOT);
            if (!combinations.add(combination)) {
                throw ApiException.badRequest("La talla " + size + " y color " + color + " están repetidos");
            }

            String sku = request.sku() == null || request.sku().isBlank()
                    ? uniqueSku(generateSku(productId, size, color), usedSkus, ownSkus)
                    : request.sku().trim();
            if (!usedSkus.add(sku)) {
                throw ApiException.badRequest("El SKU " + sku + " está repetido en el formulario");
            }
            if (!ownSkus.contains(sku) && variantRepository.existsBySku(sku)) {
                throw ApiException.conflict("El SKU " + sku + " ya pertenece a otro producto");
            }

            ProductVariant variant = new ProductVariant();
            variant.setProductId(productId);
            variant.setSku(sku);
            variant.setSize(size);
            variant.setColor(color);
            variant.setPriceDelta(request.priceDelta() == null ? BigDecimal.ZERO : request.priceDelta());
            variant.setStock(request.stock() == null ? 0 : request.stock());
            variants.add(variant);
        }

        return variantRepository.saveAll(variants);
    }

    private List<ProductImage> saveImages(Long productId, List<AdminImageRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        int primaryIndex = -1;
        for (int index = 0; index < requests.size(); index++) {
            AdminImageRequest request = requests.get(index);
            String path = request.path().trim();
            if (!path.startsWith("/") && !path.startsWith("http://") && !path.startsWith("https://")) {
                throw ApiException.badRequest(
                        "La ruta de la imagen debe empezar por /, http:// o https://");
            }
            if (primaryIndex < 0 && request.primary()) {
                primaryIndex = index;
            }
        }
        if (primaryIndex < 0) {
            primaryIndex = 0;
        }

        List<ProductImage> images = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            AdminImageRequest request = requests.get(index);
            String kind = request.kind() == null || request.kind().isBlank() ? "CARD" : request.kind();
            if (!IMAGE_KINDS.contains(kind)) {
                throw ApiException.badRequest("El tipo de imagen debe ser THUMB, CARD o DETAIL");
            }

            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setStoragePath(request.path().trim());
            image.setSourceUrl(blankToNull(request.sourceUrl()));
            image.setKind(kind);
            image.setFormat("webp");
            image.setPrimary(index == primaryIndex);
            images.add(image);
        }

        return imageRepository.saveAll(images);
    }

    private String resolveSlug(String requestedSlug, String name, Long currentId) {
        String base = requestedSlug == null || requestedSlug.isBlank() ? slugify(name) : requestedSlug.trim();
        if (base.isBlank()) {
            base = "producto";
        }

        String candidate = base;
        int suffix = 2;
        while (currentId == null
                ? productRepository.existsBySlug(candidate)
                : productRepository.existsBySlugAndIdNot(candidate, currentId)) {
            String tail = "-" + suffix++;
            int maxBaseLength = Math.max(1, MAX_SLUG_LENGTH - tail.length());
            candidate = (base.length() > maxBaseLength ? base.substring(0, maxBaseLength) : base) + tail;
        }
        return candidate;
    }

    private String generateSku(Long productId, String size, String color) {
        String base = "P" + productId + "-" + slugify(size) + "-" + slugify(color);
        return base.length() > 64 ? base.substring(0, 64) : base.toUpperCase(Locale.ROOT);
    }

    private String uniqueSku(String base, Set<String> usedSkus, Set<String> ownSkus) {
        String candidate = base;
        int suffix = 2;
        while (usedSkus.contains(candidate) || (!ownSkus.contains(candidate) && variantRepository.existsBySku(candidate))) {
            String tail = "-" + suffix++;
            candidate = (base.length() + tail.length() > 64
                    ? base.substring(0, 64 - tail.length())
                    : base) + tail;
        }
        return candidate;
    }

    private static String slugify(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        return normalized.length() > MAX_SLUG_LENGTH
                ? normalized.substring(0, MAX_SLUG_LENGTH).replaceAll("-+$", "")
                : normalized;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static AdminProductSummaryResponse summary(Product product, String imageUrl, int stock,
                                                       int variantCount) {
        return new AdminProductSummaryResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getPrice(),
                product.getCurrency(),
                product.isActive(),
                product.isFeatured(),
                product.getGame().getSlug(),
                product.getCategory().getSlug(),
                product.getSubcategory() == null ? null : product.getSubcategory().getSlug(),
                product.getTeam() == null ? null : product.getTeam().getSlug(),
                imageUrl,
                stock,
                variantCount);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Producto no encontrado"));
    }

    private Game findGame(String slug) {
        return gameRepository.findBySlug(normalizeSlug(slug))
                .orElseThrow(() -> ApiException.badRequest("El juego indicado no existe"));
    }

    private Category findCategory(String slug) {
        return categoryRepository.findBySlug(normalizeSlug(slug))
                .orElseThrow(() -> ApiException.badRequest("La categoría indicada no existe"));
    }

    private Subcategory findSubcategory(String slug, Category category) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return subcategoryRepository.findByCategoryIdOrderByDisplayOrderAsc(category.getId()).stream()
                .filter(subcategory -> subcategory.getSlug().equals(normalizeSlug(slug)))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("La subcategoría no pertenece a la categoría"));
    }

    private Team findTeam(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return teamRepository.findBySlug(normalizeSlug(slug))
                .orElseThrow(() -> ApiException.badRequest("El equipo indicado no existe"));
    }

    private static String normalizeSlug(String slug) {
        return slug.trim().toLowerCase(Locale.ROOT);
    }

    private static Specification<Product> specification(String query, Boolean active, String game,
                                                        String category, String team) {
        return (root, criteriaQuery, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null) {
                predicates.add(active ? builder.isTrue(root.get("active")) : builder.isFalse(root.get("active")));
            }
            if (game != null && !game.isBlank()) {
                predicates.add(builder.equal(root.get("game").get("slug"), normalizeSlug(game)));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(builder.equal(root.get("category").get("slug"), normalizeSlug(category)));
            }
            if (team != null && !team.isBlank()) {
                predicates.add(builder.equal(root.get("team").get("slug"), normalizeSlug(team)));
            }
            if (query != null && !query.isBlank()) {
                String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("name")), pattern),
                        builder.like(builder.lower(root.get("slug")), pattern)));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
