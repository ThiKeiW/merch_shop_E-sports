package com.merchshop.order;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    java.util.Optional<Order> findByCode(String code);

    java.util.Optional<Order> findByCodeAndUserId(String code, Long userId);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    java.util.Optional<Order> findByStripePaymentIntentId(String paymentIntentId);

    @Query("select o from Order o where o.status = :status and o.reservationExpiresAt < :now " +
            "order by o.reservationExpiresAt asc")
    List<Order> findExpired(@Param("status") OrderStatus status,
                            @Param("now") Instant now,
                            Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.status = :expired, o.updatedAt = :now " +
            "where o.id = :id and o.status = :pending")
    int expireIfPending(@Param("id") Long id,
                        @Param("expired") OrderStatus expired,
                        @Param("pending") OrderStatus pending,
                        @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.status = :target, o.updatedAt = :now " +
            "where o.id = :id and o.status = :expected")
    int transitionIfStatus(@Param("id") Long id,
                           @Param("expected") OrderStatus expected,
                           @Param("target") OrderStatus target,
                           @Param("now") Instant now);
}
