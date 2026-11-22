package com.merchshop.payment;

public record StripeIntent(String id, String clientSecret, String status) {
}
