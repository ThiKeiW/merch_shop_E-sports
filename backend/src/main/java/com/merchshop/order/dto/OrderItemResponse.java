package com.merchshop.order.dto;

import java.math.BigDecimal;

import com.merchshop.order.OrderItem;

public record OrderItemResponse(
        Long productId,
        Long variantId,
        String productName,
        String variantLabel,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal,
        String imagePath) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getProductId(),
                item.getVariantId(),
                item.getProductName(),
                item.getVariantLabel(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal(),
                item.getImagePath());
    }
}
