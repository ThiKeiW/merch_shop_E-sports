package com.merchshop.payment;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.merchshop.order.Order;

import tools.jackson.databind.json.JsonMapper;

class LoadtestStripeGatewayTest {

    private final LoadtestStripeGateway gateway = new LoadtestStripeGateway(
            JsonMapper.builder().build(), "requires_payment_method");

    @Test
    void creaIntentDeterministaParaElPedido() {
        Order order = new Order();
        order.setCode("abc123");

        StripeIntent intent = gateway.createIntent(order);

        assertThat(intent.id()).isEqualTo("pi_loadtest_abc123");
        assertThat(intent.clientSecret()).isEqualTo("pi_loadtest_abc123_secret");
        assertThat(intent.status()).isEqualTo("requires_payment_method");
    }

    @Test
    void recuperaIntentConElEstadoConfigurado() {
        StripeIntent intent = gateway.retrieveIntent("pi_loadtest_x");

        assertThat(intent.id()).isEqualTo("pi_loadtest_x");
        assertThat(intent.clientSecret()).isEqualTo("pi_loadtest_x_secret");
        assertThat(intent.status()).isEqualTo("requires_payment_method");
    }

    @Test
    void exponePublishableKeyDePrueba() {
        assertThat(gateway.publishableKey()).isEqualTo("pk_test_loadtest");
    }

    @Test
    void parseaWebhookSinFirmaParaLasPruebasDeCarga() {
        String payload = "{\"id\":\"evt_1\",\"type\":\"payment_intent.succeeded\","
                + "\"data\":{\"object\":{\"id\":\"pi_1\"}}}";

        StripeWebhookEvent event = gateway.verifyAndParse(payload, "");

        assertThat(event.id()).isEqualTo("evt_1");
        assertThat(event.type()).isEqualTo("payment_intent.succeeded");
        assertThat(event.dataObject().path("id").asText()).isEqualTo("pi_1");
    }
}
