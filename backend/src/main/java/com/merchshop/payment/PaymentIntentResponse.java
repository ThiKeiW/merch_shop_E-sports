package com.merchshop.payment;

public record PaymentIntentResponse(
        String orderCode,
        String paymentIntentId,
        String clientSecret,
        String publishableKey) {
}
