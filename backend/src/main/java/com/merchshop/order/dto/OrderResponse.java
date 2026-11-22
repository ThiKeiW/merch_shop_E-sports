package com.merchshop.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.merchshop.order.Order;
import com.merchshop.order.OrderItem;
import com.merchshop.order.OrderStatus;

public record OrderResponse(
        Long id,
        String code,
        OrderStatus status,
        BigDecimal subtotal,
        BigDecimal shippingCost,
        BigDecimal total,
        String currency,
        String stripePaymentIntentId,
        Instant reservationExpiresAt,
        Instant createdAt,
        int itemCount,
        List<OrderItemResponse> items) {

    public static OrderResponse from(Order order, List<OrderItem> items) {
        return from(order, items, items.size());
    }

    public static OrderResponse from(Order order, List<OrderItem> items, int itemCount) {
        return new OrderResponse(
                order.getId(),
                order.getCode(),
                order.getStatus(),
                order.getSubtotal(),
                order.getShippingCost(),
                order.getTotal(),
                order.getCurrency(),
                order.getStripePaymentIntentId(),
                order.getReservationExpiresAt(),
                order.getCreatedAt(),
                itemCount,
                items.stream().map(OrderItemResponse::from).toList());
    }
}
