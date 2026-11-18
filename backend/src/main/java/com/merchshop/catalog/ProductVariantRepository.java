package com.merchshop.catalog;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductIdOrderBySizeAscColorAsc(Long productId);

    List<ProductVariant> findByProductIdIn(Collection<Long> productIds);

    boolean existsBySku(String sku);

    void deleteByProductId(Long productId);
}
