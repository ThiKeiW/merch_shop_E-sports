package com.merchshop.order;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderIdOrderByIdAsc(Long orderId);

    int countByOrderId(Long orderId);

    @Query("select case when count(i) > 0 then true else false end from OrderItem i " +
            "where i.variantId = :variantId and i.orderId in " +
            "(select o.id from Order o where o.status = :status)")
    boolean existsByVariantIdAndOrderStatus(@Param("variantId") Long variantId,
                                            @Param("status") OrderStatus status);
}
