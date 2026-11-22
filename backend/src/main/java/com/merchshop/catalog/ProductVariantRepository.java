package com.merchshop.catalog;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductIdOrderBySizeAscColorAsc(Long productId);

    List<ProductVariant> findByProductIdIn(Collection<Long> productIds);

    boolean existsBySku(String sku);

    void deleteByProductId(Long productId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update ProductVariant v set v.stock = v.stock - :quantity " +
            "where v.id = :id and v.stock >= :quantity")
    int decrementStock(@Param("id") Long id, @Param("quantity") int quantity);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update ProductVariant v set v.stock = v.stock + :quantity where v.id = :id")
    int incrementStock(@Param("id") Long id, @Param("quantity") int quantity);
}
