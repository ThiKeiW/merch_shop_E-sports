package com.merchshop.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.merchshop.common.ApiException;
import com.merchshop.order.Order;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Gateway de Stripe para pruebas de carga.
 *
 * <p>Evita llamadas reales a Stripe y devuelve intents deterministas para que
 * los escenarios de k6 puedan validar el flujo de pago sin depender de la red
 * ni de credenciales. Solo se activa con el perfil {@code loadtest}.</p>
 */
@Component
@Profile("loadtest")
public class LoadtestStripeGateway implements StripeGateway {

    private static final String PUBLISHABLE_KEY = "pk_test_loadtest";

    private final ObjectMapper objectMapper;
    private final String paymentStatus;

    public LoadtestStripeGateway(ObjectMapper objectMapper,
                                 @Value("${app.loadtest.payment-status:requires_payment_method}")
                                 String paymentStatus) {
        this.objectMapper = objectMapper;
        this.paymentStatus = paymentStatus;
    }

    @Override
    public StripeIntent createIntent(Order order) {
        String id = intentId(order.getCode());
        return new StripeIntent(id, id + "_secret", paymentStatus);
    }

    @Override
    public StripeIntent retrieveIntent(String paymentIntentId) {
        return new StripeIntent(paymentIntentId, paymentIntentId + "_secret", paymentStatus);
    }

    @Override
    public void cancelIntent(String paymentIntentId) {
        // Sin llamada externa: el escenario de carga cancela el pedido para liberar stock.
    }

    @Override
    public void refund(String paymentIntentId) {
        // Sin llamada externa.
    }

    @Override
    public StripeWebhookEvent verifyAndParse(String payload, String signature) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            return new StripeWebhookEvent(
                    root.path("id").asText(),
                    root.path("type").asText(),
                    root.path("data").path("object"));
        } catch (Exception exception) {
            throw ApiException.badRequest("Payload de webhook invalido");
        }
    }

    @Override
    public String publishableKey() {
        return PUBLISHABLE_KEY;
    }

    private static String intentId(String orderCode) {
        return "pi_loadtest_" + orderCode;
    }
}
