package com.merchshop.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import com.merchshop.order.Order;
import com.merchshop.order.OrderService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class PaymentIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("merch_shop");

    private static final String CUSTOMER_EMAIL = "cliente@merchshop.dev";
    private static final String CUSTOMER_PASSWORD = "Cliente1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private OrderService orderService;

    @MockitoBean
    private StripeGateway stripeGateway;

    private final AtomicReference<StripeWebhookEvent> currentEvent = new AtomicReference<>();

    @BeforeAll
    static void applySchemaAndSeed() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/01-schema.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/02-seed.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/03-catalog.sql"));
        }
    }

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("update product_variants set stock = 10 where id = 5001");
        when(stripeGateway.publishableKey()).thenReturn("pk_test_dummy");
        when(stripeGateway.createIntent(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            String id = "pi_" + order.getCode();
            return new StripeIntent(id, id + "_secret", "requires_payment_method");
        });
        when(stripeGateway.retrieveIntent(anyString())).thenAnswer(invocation -> {
            String id = invocation.getArgument(0);
            return new StripeIntent(id, id + "_secret", "requires_payment_method");
        });
        when(stripeGateway.verifyAndParse(anyString(), anyString()))
                .thenAnswer(invocation -> currentEvent.get());
    }

    @Test
    void creaIntentYDevuelvePublishableKey() throws Exception {
        String token = login();
        String code = createOrder(token, 5001, 2);

        JsonNode response = createIntent(token, code);

        assertThat(response.get("orderCode").asText()).isEqualTo(code);
        assertThat(response.get("paymentIntentId").asText()).isEqualTo("pi_" + code);
        assertThat(response.get("clientSecret").asText()).isEqualTo("pi_" + code + "_secret");
        assertThat(response.get("publishableKey").asText()).isEqualTo("pk_test_dummy");
        assertThat(jdbc.queryForObject(
                "select stripe_payment_intent_id from orders where code = ?", String.class, code))
                .isEqualTo("pi_" + code);
        assertThat(paymentStatus("pi_" + code)).isEqualTo("requires_payment_method");
    }

    @Test
    void webhookExitosoConfirmaPedidoYEsIdempotente() throws Exception {
        Fixture fixture = createOrderWithIntent(5001, 2);
        String eventId = "evt_success_" + fixture.code();

        deliverWebhook(event(eventId, "payment_intent.succeeded", fixture.code(), fixture.intentId()));
        awaitStatus(fixture.code(), "PAID");

        deliverWebhook(event(eventId, "payment_intent.succeeded", fixture.code(), fixture.intentId()));

        assertThat(eventCount(eventId)).isEqualTo(1);
        assertThat(paymentCount(fixture.intentId())).isEqualTo(1);
        assertThat(paymentStatus(fixture.intentId())).isEqualTo("succeeded");
        assertThat(stock(5001)).isEqualTo(8);
    }

    @Test
    void webhookFallidoRestauraStockUnaSolaVez() throws Exception {
        Fixture fixture = createOrderWithIntent(5001, 2);
        assertThat(stock(5001)).isEqualTo(8);

        deliverWebhook(event("evt_fail_1", "payment_intent.payment_failed", fixture.code(), fixture.intentId()));
        awaitStatus(fixture.code(), "FAILED");
        deliverWebhook(event("evt_fail_2", "payment_intent.payment_failed", fixture.code(), fixture.intentId()));
        Thread.sleep(150);

        assertThat(stock(5001)).isEqualTo(10);
        assertThat(paymentStatus(fixture.intentId())).isEqualTo("failed");
    }

    @Test
    void webhookReembolsadoCambiaPedidoPagado() throws Exception {
        Fixture fixture = createOrderWithIntent(5001, 1);
        deliverWebhook(event("evt_paid", "payment_intent.succeeded", fixture.code(), fixture.intentId()));
        awaitStatus(fixture.code(), "PAID");

        deliverWebhook(new StripeWebhookEvent("evt_refund", "charge.refunded", objectMapper.readTree("""
                {"id":"ch_1","payment_intent":"%s"}
                """.formatted(fixture.intentId()))));
        awaitStatus(fixture.code(), "REFUNDED");

        assertThat(paymentStatus(fixture.intentId())).isEqualTo("refunded");
    }

    @Test
    void webhookSinAutenticacionEsPublico() throws Exception {
        currentEvent.set(new StripeWebhookEvent("evt_public", "unknown", objectMapper.readTree("{}")));
        mockMvc.perform(post("/api/webhooks/stripe")
                        .contentType(APPLICATION_JSON)
                        .header("Stripe-Signature", "t=1,v1=dummy")
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void confirmacionRecuperaPagoExitosoSinWebhook() throws Exception {
        Fixture fixture = createOrderWithIntent(5001, 2);
        when(stripeGateway.retrieveIntent(fixture.intentId())).thenReturn(
                new StripeIntent(fixture.intentId(), fixture.intentId() + "_secret", "succeeded"));

        mockMvc.perform(post("/api/payments/{code}/confirm", fixture.code())
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderStatus").value("PAID"))
                .andExpect(jsonPath("$.paymentStatus").value("succeeded"));

        assertThat(orderStatus(fixture.code())).isEqualTo("PAID");
        assertThat(paymentStatus(fixture.intentId())).isEqualTo("succeeded");
        assertThat(stock(5001)).isEqualTo(8);
    }

    @Test
    void expiracionNoCancelaPedidoPagadoEnStripe() throws Exception {
        Fixture fixture = createOrderWithIntent(5001, 2);
        when(stripeGateway.retrieveIntent(fixture.intentId())).thenReturn(
                new StripeIntent(fixture.intentId(), fixture.intentId() + "_secret", "succeeded"));
        jdbc.update("update orders set reservation_expires_at = ? where code = ?",
                Timestamp.from(Instant.now().minusSeconds(1)), fixture.code());

        orderService.expireDueReservations();

        assertThat(orderStatus(fixture.code())).isEqualTo("PAID");
        assertThat(stock(5001)).isEqualTo(8);
    }

    private Fixture createOrderWithIntent(int variantId, int quantity) throws Exception {
        String token = login();
        String code = createOrder(token, variantId, quantity);
        JsonNode response = createIntent(token, code);
        return new Fixture(code, response.get("paymentIntentId").asText());
    }

    private String createOrder(String token, int variantId, int quantity) throws Exception {
        List<Map<String, Object>> items = new ArrayList<>();
        items.add(Map.of("variantId", variantId, "quantity", quantity));
        MvcResult result = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("items", items))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private JsonNode createIntent(String token, String code) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/payments/intent")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("orderCode", code))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientSecret").exists())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private StripeWebhookEvent event(String eventId, String type, String code, String intentId) throws Exception {
        return new StripeWebhookEvent(eventId, type, objectMapper.readTree("""
                {"id":"%s","metadata":{"order_code":"%s"}}
                """.formatted(intentId, code)));
    }

    private void deliverWebhook(StripeWebhookEvent event) throws Exception {
        currentEvent.set(event);
        mockMvc.perform(post("/api/webhooks/stripe")
                        .contentType(APPLICATION_JSON)
                        .header("Stripe-Signature", "t=1,v1=dummy")
                        .content("{}"))
                .andExpect(status().isOk());
    }

    private void awaitStatus(String code, String expected) throws Exception {
        for (int attempt = 0; attempt < 100; attempt++) {
            if (expected.equals(orderStatus(code))) {
                return;
            }
            Thread.sleep(50);
        }
        assertThat(orderStatus(code)).isEqualTo(expected);
    }

    private String login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", CUSTOMER_EMAIL, "password", CUSTOMER_PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private int stock(long variantId) {
        Integer value = jdbc.queryForObject("select stock from product_variants where id = ?",
                Integer.class, variantId);
        return value == null ? -1 : value;
    }

    private String orderStatus(String code) {
        return jdbc.queryForObject("select status from orders where code = ?", String.class, code);
    }

    private String paymentStatus(String intentId) {
        return jdbc.queryForObject("select status from payments where provider_payment_id = ?",
                String.class, intentId);
    }

    private long paymentCount(String intentId) {
        Long value = jdbc.queryForObject("select count(*) from payments where provider_payment_id = ?",
                Long.class, intentId);
        return value == null ? 0 : value;
    }

    private long eventCount(String eventId) {
        Long value = jdbc.queryForObject("select count(*) from webhook_events where event_id = ?",
                Long.class, eventId);
        return value == null ? 0 : value;
    }

    private record Fixture(String code, String intentId) {
    }
}
