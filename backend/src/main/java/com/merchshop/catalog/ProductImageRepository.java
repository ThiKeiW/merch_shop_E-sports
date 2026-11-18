package com.merchshop.catalog;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProductIdOrderByPrimaryDescIdAsc(Long productId);

    List<ProductImage> findByProductIdInOrderByPrimaryDescIdAsc(Collection<Long> productIds);

    void deleteByProductId(Long productId);
}
