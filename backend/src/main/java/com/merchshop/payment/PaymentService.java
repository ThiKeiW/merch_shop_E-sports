package com.merchshop.payment;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.common.ApiException;
import com.merchshop.order.Order;
import com.merchshop.order.OrderRepository;
import com.merchshop.order.OrderStatus;
import com.merchshop.security.AuthenticatedUser;

import jakarta.validation.constraints.NotBlank;

@Service
@Transactional
public class PaymentService {

    private static final String PROVIDER = "stripe";

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final StripeGateway stripeGateway;

    public PaymentService(OrderRepository orderRepository,
                          PaymentRepository paymentRepository,
                          StripeGateway stripeGateway) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.stripeGateway = stripeGateway;
    }

    public PaymentIntentResponse createIntent(@NotBlank String orderCode, AuthenticatedUser buyer) {
        Order order = findOwned(orderCode, buyer);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw ApiException.conflict("El pedido ya no admite pagos");
        }
        if (order.getReservationExpiresAt() != null
                && order.getReservationExpiresAt().isBefore(Instant.now())) {
            throw ApiException.conflict("La reserva del pedido expiró");
        }

        StripeIntent intent;
        if (order.getStripePaymentIntentId() == null) {
            intent = stripeGateway.createIntent(order);
            order.setStripePaymentIntentId(intent.id());
            orderRepository.save(order);
            upsertPayment(order, intent.id(), intent.status());
        } else {
            intent = stripeGateway.retrieveIntent(order.getStripePaymentIntentId());
            upsertPayment(order, intent.id(), intent.status());
        }

        return new PaymentIntentResponse(
                order.getCode(),
                intent.id(),
                intent.clientSecret(),
                stripeGateway.publishableKey());
    }

    public PaymentConfirmationResponse confirm(@NotBlank String orderCode, AuthenticatedUser buyer) {
        Order order = findOwned(orderCode, buyer);
        if (order.getStatus() != OrderStatus.PENDING || isBlank(order.getStripePaymentIntentId())) {
            return new PaymentConfirmationResponse(order.getCode(), order.getStatus(), "none");
        }

        String paymentStatus = reconcile(order);
        Order current = orderRepository.findByCode(order.getCode()).orElse(order);
        return new PaymentConfirmationResponse(order.getCode(), current.getStatus(), paymentStatus);
    }

    public String reconcile(Order order) {
        String intentId = order.getStripePaymentIntentId();
        if (isBlank(intentId)) {
            return "none";
        }

        StripeIntent intent = stripeGateway.retrieveIntent(intentId);
        String status = isBlank(intent.status()) ? "unknown" : intent.status();
        if ("succeeded".equals(status)) {
            markSucceeded(order, intent.id());
        } else {
            recordStatus(order, intent.id(), status);
        }
        return status;
    }

    public void markSucceeded(Order order, String intentId) {
        int changed = orderRepository.transitionIfStatus(
                order.getId(), OrderStatus.PENDING, OrderStatus.PAID, Instant.now());
        if (changed > 0) {
            upsertPayment(order, intentId, "succeeded");
            return;
        }
        Order current = orderRepository.findById(order.getId()).orElse(order);
        if (current.getStatus() == OrderStatus.PAID) {
            upsertPayment(current, intentId, "succeeded");
        }
    }

    public void recordStatus(Order order, String intentId, String status) {
        upsertPayment(order, intentId, status);
    }

    private Order findOwned(String code, AuthenticatedUser buyer) {
        return orderRepository.findByCodeAndUserId(code, buyer.id())
                .orElseThrow(() -> ApiException.notFound("Pedido no encontrado"));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void upsertPayment(Order order, String intentId, String status) {
        Payment payment = paymentRepository.findByProviderAndProviderPaymentId(PROVIDER, intentId)
                .orElseGet(Payment::new);
        if (payment.getId() == null) {
            payment.setOrderId(order.getId());
            payment.setProvider(PROVIDER);
            payment.setProviderPaymentId(intentId);
            payment.setAmount(order.getTotal());
            payment.setCurrency(order.getCurrency());
        }
        payment.setStatus(status);
        paymentRepository.save(payment);
    }
}
