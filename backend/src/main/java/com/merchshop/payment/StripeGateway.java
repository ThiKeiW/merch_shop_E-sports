package com.merchshop.payment;

import com.merchshop.order.Order;

public interface StripeGateway {

    StripeIntent createIntent(Order order);

    StripeIntent retrieveIntent(String paymentIntentId);

    void cancelIntent(String paymentIntentId);

    void refund(String paymentIntentId);

    StripeWebhookEvent verifyAndParse(String payload, String signature);

    String publishableKey();
}
