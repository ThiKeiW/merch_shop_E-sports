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
        Order order = orderRepository.findByCodeAndUserId(orderCode, buyer.id())
                .orElseThrow(() -> ApiException.notFound("Pedido no encontrado"));
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
        }

        return new PaymentIntentResponse(
                order.getCode(),
                intent.id(),
                intent.clientSecret(),
                stripeGateway.publishableKey());
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
