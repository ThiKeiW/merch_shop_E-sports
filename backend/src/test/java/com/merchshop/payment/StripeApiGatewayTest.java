package com.merchshop.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import org.junit.jupiter.api.Test;

import com.merchshop.common.ApiException;

import tools.jackson.databind.ObjectMapper;

class StripeApiGatewayTest {

    private static final String SECRET = "whsec_testsecret";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void verificaFirmaYExtraeEvento() throws Exception {
        String payload = """
                {"id":"evt_123","type":"payment_intent.succeeded","data":{"object":{"id":"pi_123","amount":2000}}}
                """;
        StripeApiGateway gateway = new StripeApiGateway("sk_test_dummy", SECRET, "pk_test_dummy", objectMapper);

        StripeWebhookEvent event = gateway.verifyAndParse(payload, signature(payload));

        assertThat(event.id()).isEqualTo("evt_123");
        assertThat(event.type()).isEqualTo("payment_intent.succeeded");
        assertThat(event.dataObject().path("id").asText()).isEqualTo("pi_123");
    }

    @Test
    void rechazaFirmaInvalida() {
        StripeApiGateway gateway = new StripeApiGateway("sk_test_dummy", SECRET, "pk_test_dummy", objectMapper);

        assertThatThrownBy(() -> gateway.verifyAndParse("{}", "t=1,v1=bad"))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getStatus().value())
                .isEqualTo(400);
    }

    @Test
    void rechazaWebhookSinFirma() {
        StripeApiGateway gateway = new StripeApiGateway("sk_test_dummy", SECRET, "pk_test_dummy", objectMapper);

        assertThatThrownBy(() -> gateway.verifyAndParse("{}", null))
                .isInstanceOf(ApiException.class)
                .hasMessage("Falta la firma del webhook");
    }

    private String signature(String payload) throws Exception {
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String digest = HexFormat.of().formatHex(
                mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + digest;
    }
}
