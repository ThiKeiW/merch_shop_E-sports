package com.merchshop.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.metrics.test.autoconfigure.AutoConfigureMetrics;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import com.merchshop.order.OrderExpirationScheduler;
import com.merchshop.payment.LoadtestStripeGateway;
import com.merchshop.payment.StripeGateway;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureMetrics
@Testcontainers
@ActiveProfiles({"test", "loadtest"})
class LoadtestProfileIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("merch_shop");

    @Autowired
    private StripeGateway stripeGateway;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderExpirationScheduler orderExpirationScheduler;

    @Test
    void activaElGatewayDeCarga() {
        assertThat(stripeGateway).isInstanceOf(LoadtestStripeGateway.class);
    }

    @Test
    void exponeMetricasDePrometheus() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")).andExpect(status().isOk());
    }
}
