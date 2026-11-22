package com.merchshop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class OrderIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("merch_shop");

    private static final String CUSTOMER_EMAIL = "cliente@merchshop.dev";
    private static final String CUSTOMER_PASSWORD = "Cliente1234!";
    private static final String ADMIN_EMAIL = "admin@merchshop.dev";
    private static final String ADMIN_PASSWORD = "Admin1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private OrderService orderService;

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
    void resetStock() {
        jdbc.update("update product_variants set stock = 10 where id = 5001");
        jdbc.update("update product_variants set stock = 8 where id = 5002");
    }

    @Test
    void creaPedidoReservaStockYCongelaPrecios() throws Exception {
        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 2, 5002, 1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andExpect(jsonPath("$.itemCount").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.reservationExpiresAt").exists())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.get("code").asText()).hasSize(32);
        assertThat(body.get("subtotal").decimalValue()).isEqualByComparingTo("194.97");
        assertThat(body.get("total").decimalValue()).isEqualByComparingTo("194.97");
        assertThat(body.get("items").get(0).get("productName").asText())
                .isEqualTo("2026 Special Edition Jersey");
        assertThat(body.get("items").get(0).get("unitPrice").decimalValue())
                .isEqualByComparingTo(new BigDecimal("64.99"));
        assertThat(stock(5001)).isEqualTo(8);
        assertThat(stock(5002)).isEqualTo(7);
    }

    @Test
    void stockInsuficienteNoCreaPedidoYHaceRollback() throws Exception {
        jdbc.update("update product_variants set stock = 1 where id = 5001");
        long before = orderCount();
        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 2, 5002, 1)))
                .andExpect(status().isConflict());

        assertThat(stock(5001)).isEqualTo(1);
        assertThat(stock(5002)).isEqualTo(8);
        assertThat(orderCount()).isEqualTo(before);
    }

    @Test
    void agrupaLineasDuplicadasDeLaMismaVariante() throws Exception {
        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 2, 5001, 3)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemCount").value(1))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].quantity").value(5))
                .andReturn();

        assertThat(objectMapper.readTree(result.getResponse().getContentAsString())
                .get("total").decimalValue()).isEqualByComparingTo("324.95");
        assertThat(stock(5001)).isEqualTo(5);
    }

    @Test
    void unClienteNoPuedeVerElPedidoDeOtro() throws Exception {
        String customerToken = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        MvcResult created = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 1)))
                .andExpect(status().isCreated())
                .andReturn();
        String code = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("code").asText();

        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        mockMvc.perform(get("/api/orders/" + code)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void expiraReservaYRestauraStockUnaSolaVez() throws Exception {
        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        MvcResult created = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 2, 5002, 3)))
                .andExpect(status().isCreated())
                .andReturn();
        long orderId = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("id").asLong();
        assertThat(stock(5001)).isEqualTo(8);
        assertThat(stock(5002)).isEqualTo(5);

        jdbc.update("update orders set reservation_expires_at = ? where id = ?",
                java.time.Instant.now().minusSeconds(60), orderId);
        orderService.expireDueReservations();
        orderService.expireDueReservations();

        assertThat(orderStatus(orderId)).isEqualTo("EXPIRED");
        assertThat(stock(5001)).isEqualTo(10);
        assertThat(stock(5002)).isEqualTo(8);
    }

    @Test
    void cancelarPedidoPendienteRestauraStock() throws Exception {
        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        MvcResult created = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 4)))
                .andExpect(status().isCreated())
                .andReturn();
        String code = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("code").asText();

        mockMvc.perform(post("/api/orders/" + code + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"));

        assertThat(stock(5001)).isEqualTo(10);
    }

    @Test
    void exigeAutenticacionParaCrearPedido() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(APPLICATION_JSON)
                        .content(orderPayload(5001, 1)))
                .andExpect(status().isUnauthorized());
    }

    private String orderPayload(int... variantIdQuantityPairs) throws Exception {
        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < variantIdQuantityPairs.length; i += 2) {
            items.add(Map.of("variantId", variantIdQuantityPairs[i],
                    "quantity", variantIdQuantityPairs[i + 1]));
        }
        return objectMapper.writeValueAsString(Map.of("items", items));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("token").asText();
    }

    private int stock(long variantId) {
        Integer value = jdbc.queryForObject("select stock from product_variants where id = ?",
                Integer.class, variantId);
        return value == null ? -1 : value;
    }

    private long orderCount() {
        Long value = jdbc.queryForObject("select count(*) from orders", Long.class);
        return value == null ? 0 : value;
    }

    private String orderStatus(long orderId) {
        return jdbc.queryForObject("select status from orders where id = ?", String.class, orderId);
    }
}
