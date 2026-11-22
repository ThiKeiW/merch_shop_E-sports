package com.merchshop.payment;

import java.math.RoundingMode;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.merchshop.common.ApiException;
import com.merchshop.order.Order;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class StripeApiGateway implements StripeGateway {

    private static final String PROVIDER = "stripe";

    private final StripeClient client;
    private final String webhookSecret;
    private final String publishableKey;
    private final ObjectMapper objectMapper;

    public StripeApiGateway(@Value("${app.stripe.secret-key:}") String secretKey,
                            @Value("${app.stripe.webhook-secret:}") String webhookSecret,
                            @Value("${app.stripe.publishable-key:}") String publishableKey,
                            ObjectMapper objectMapper) {
        this.client = secretKey == null || secretKey.isBlank() ? null : new StripeClient(secretKey);
        this.webhookSecret = webhookSecret;
        this.publishableKey = publishableKey;
        this.objectMapper = objectMapper;
    }

    @Override
    public StripeIntent createIntent(Order order) {
        long amount = order.getTotal().movePointRight(2)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency(order.getCurrency().toLowerCase(Locale.ROOT))
                .setDescription("Pedido " + order.getCode())
                .setReceiptEmail(order.getCustomerEmail())
                .putMetadata("order_code", order.getCode())
                .putMetadata("order_id", String.valueOf(order.getId()))
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build())
                .build();

        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("order-intent-" + order.getCode())
                .build();
        try {
            PaymentIntent intent = requireClient().v1().paymentIntents().create(params, options);
            return new StripeIntent(intent.getId(), intent.getClientSecret(), intent.getStatus());
        } catch (StripeException exception) {
            throw ApiException.unavailable("Stripe rechazó la solicitud: " + exception.getMessage());
        }
    }

    @Override
    public StripeIntent retrieveIntent(String paymentIntentId) {
        try {
            PaymentIntent intent = requireClient().v1().paymentIntents().retrieve(paymentIntentId);
            return new StripeIntent(intent.getId(), intent.getClientSecret(), intent.getStatus());
        } catch (StripeException exception) {
            throw ApiException.unavailable("No se pudo recuperar el intent de pago");
        }
    }

    @Override
    public void cancelIntent(String paymentIntentId) {
        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("cancel-" + paymentIntentId)
                .build();
        try {
            requireClient().v1().paymentIntents().cancel(paymentIntentId, options);
        } catch (StripeException exception) {
            throw ApiException.unavailable("No se pudo cancelar el intent de pago");
        }
    }

    @Override
    public void refund(String paymentIntentId) {
        RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(paymentIntentId)
                .build();
        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("refund-" + paymentIntentId)
                .build();
        try {
            requireClient().v1().refunds().create(params, options);
        } catch (StripeException exception) {
            throw ApiException.unavailable("No se pudo reembolsar el intent de pago");
        }
    }

    @Override
    public StripeWebhookEvent verifyAndParse(String payload, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw ApiException.unavailable("El webhook de Stripe no está configurado");
        }
        if (signature == null || signature.isBlank()) {
            throw ApiException.badRequest("Falta la firma del webhook");
        }
        try {
            Webhook.constructEvent(payload, signature, webhookSecret);
            JsonNode root = objectMapper.readTree(payload);
            return new StripeWebhookEvent(
                    root.path("id").asText(),
                    root.path("type").asText(),
                    root.path("data").path("object"));
        } catch (Exception exception) {
            throw ApiException.badRequest("Firma de webhook inválida");
        }
    }

    @Override
    public String publishableKey() {
        return publishableKey == null ? "" : publishableKey;
    }

    private StripeClient requireClient() {
        if (client == null) {
            throw ApiException.unavailable("Los pagos con Stripe no están configurados");
        }
        return client;
    }
}
