package com.merchshop.payment;

import tools.jackson.databind.JsonNode;

public record StripeWebhookEvent(String id, String type, JsonNode dataObject) {
}
