package com.merchshop.payment;

import com.merchshop.order.OrderStatus;

public record PaymentConfirmationResponse(
        String orderCode,
        OrderStatus orderStatus,
        String paymentStatus) {
}
