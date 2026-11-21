package com.merchshop.webhook;

import java.time.Instant;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.order.Order;
import com.merchshop.order.OrderRepository;
import com.merchshop.order.OrderService;
import com.merchshop.order.OrderStatus;
import com.merchshop.payment.PaymentService;
import com.merchshop.payment.StripeGateway;
import com.merchshop.payment.StripeWebhookEvent;

import tools.jackson.databind.JsonNode;

@Service
public class WebhookProcessor {

    private static final Logger log = LoggerFactory.getLogger(WebhookProcessor.class);

    private final WebhookEventRepository webhookEventRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final PaymentService paymentService;
    private final StripeGateway stripeGateway;

    public WebhookProcessor(WebhookEventRepository webhookEventRepository,
                            OrderRepository orderRepository,
                            OrderService orderService,
                            PaymentService paymentService,
                            StripeGateway stripeGateway) {
        this.webhookEventRepository = webhookEventRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.paymentService = paymentService;
        this.stripeGateway = stripeGateway;
    }

    @Async("webhookExecutor")
    @Transactional
    public void process(StripeWebhookEvent event) {
        try {
            switch (event.type()) {
                case "payment_intent.succeeded" -> onSucceeded(event);
                case "payment_intent.payment_failed", "payment_intent.canceled" -> onFailed(event);
                case "charge.refunded" -> onRefunded(event);
                default -> log.debug("Evento Stripe no gestionado: {}", event.type());
            }
            webhookEventRepository.markProcessed(event.id(), Instant.now());
        } catch (RuntimeException exception) {
            webhookEventRepository.markFailed(event.id());
            throw exception;
        }
    }

    private void onSucceeded(StripeWebhookEvent event) {
        String intentId = intentId(event.dataObject());
        Optional<Order> found = findOrder(event);
        if (found.isEmpty() || intentId.isBlank()) {
            return;
        }
        Order order = found.get();
        if (order.getStatus() == OrderStatus.PENDING) {
            paymentService.markSucceeded(order, intentId);
        } else if (order.getStatus() == OrderStatus.EXPIRED || order.getStatus() == OrderStatus.FAILED) {
            stripeGateway.refund(intentId);
            orderRepository.transitionIfStatus(
                    order.getId(), order.getStatus(), OrderStatus.REFUNDED, Instant.now());
            paymentService.recordStatus(order, intentId, "refunded");
        }
    }

    private void onFailed(StripeWebhookEvent event) {
        String intentId = intentId(event.dataObject());
        Optional<Order> found = findOrder(event);
        if (found.isEmpty() || intentId.isBlank()) {
            return;
        }
        Order order = found.get();
        if (order.getStatus() == OrderStatus.PENDING) {
            orderService.markFailedAndRelease(order.getId());
            paymentService.recordStatus(order, intentId, "failed");
        }
    }

    private void onRefunded(StripeWebhookEvent event) {
        String intentId = intentId(event.dataObject());
        if (intentId.isBlank()) {
            return;
        }
        Optional<Order> found = orderRepository.findByStripePaymentIntentId(intentId);
        if (found.isEmpty() || found.get().getStatus() != OrderStatus.PAID) {
            return;
        }
        Order order = found.get();
        orderRepository.transitionIfStatus(
                order.getId(), OrderStatus.PAID, OrderStatus.REFUNDED, Instant.now());
        paymentService.recordStatus(order, intentId, "refunded");
    }

    private Optional<Order> findOrder(StripeWebhookEvent event) {
        String intentId = intentId(event.dataObject());
        String code = event.dataObject().path("metadata").path("order_code").asText("");
        if (!code.isBlank()) {
            Optional<Order> byCode = orderRepository.findByCode(code);
            if (byCode.isPresent()
                    && (intentId.isBlank() || intentId.equals(byCode.get().getStripePaymentIntentId()))) {
                return byCode;
            }
        }
        return intentId.isBlank()
                ? Optional.empty()
                : orderRepository.findByStripePaymentIntentId(intentId);
    }

    private String intentId(JsonNode object) {
        String id = object.path("id").asText("");
        if (id.startsWith("pi_")) {
            return id;
        }
        return object.path("payment_intent").asText("");
    }
}
