package com.merchshop.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.catalog.Product;
import com.merchshop.catalog.ProductImageRepository;
import com.merchshop.catalog.ProductRepository;
import com.merchshop.catalog.ProductVariant;
import com.merchshop.catalog.ProductVariantRepository;
import com.merchshop.common.ApiException;
import com.merchshop.payment.PaymentService;
import com.merchshop.payment.StripeGateway;
import com.merchshop.order.dto.CreateOrderItemRequest;
import com.merchshop.order.dto.CreateOrderRequest;
import com.merchshop.order.dto.OrderResponse;
import com.merchshop.security.AuthenticatedUser;

@Service
@Transactional(readOnly = true)
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final int MAX_LINES = 50;
    private static final int MAX_QUANTITY = 100;
    private static final int EXPIRATION_BATCH = 100;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final StripeGateway stripeGateway;
    private final PaymentService paymentService;
    private final java.time.Duration reservationTtl;
    private final BigDecimal shippingCost;
    private final Counter ordersCreated;
    private final Counter stockConflicts;
    private final Counter ordersCancelled;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        ProductRepository productRepository,
                         ProductVariantRepository variantRepository,
                         ProductImageRepository imageRepository,
                         StripeGateway stripeGateway,
                         PaymentService paymentService,
                         @Value("${app.orders.reservation-ttl:PT15M}") java.time.Duration reservationTtl,
                        @Value("${app.orders.shipping-cost:0.00}") BigDecimal shippingCost,
                        MeterRegistry meterRegistry) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
        this.stripeGateway = stripeGateway;
        this.paymentService = paymentService;
        this.reservationTtl = reservationTtl;
        this.shippingCost = shippingCost.setScale(2, RoundingMode.HALF_UP);
        this.ordersCreated = Counter.builder("merch.orders.created")
                .description("Pedidos creados correctamente")
                .register(meterRegistry);
        this.stockConflicts = Counter.builder("merch.orders.stock_conflict")
                .description("Pedidos rechazados por stock insuficiente")
                .register(meterRegistry);
        this.ordersCancelled = Counter.builder("merch.orders.cancelled")
                .description("Pedidos cancelados por el usuario")
                .register(meterRegistry);
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request, AuthenticatedUser buyer) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        for (CreateOrderItemRequest item : request.items()) {
            if (item == null || item.variantId() == null || item.quantity() == null) {
                throw ApiException.badRequest("Línea de pedido incompleta");
            }
            quantities.merge(item.variantId(), item.quantity(), Integer::sum);
        }

        if (quantities.isEmpty() || quantities.size() > MAX_LINES) {
            throw ApiException.badRequest("El pedido debe tener entre 1 y " + MAX_LINES + " variantes");
        }
        if (quantities.values().stream().anyMatch(quantity -> quantity < 1 || quantity > MAX_QUANTITY)) {
            throw ApiException.badRequest("La cantidad por variante debe estar entre 1 y " + MAX_QUANTITY);
        }

        List<Long> variantIds = new ArrayList<>(quantities.keySet());
        Map<Long, ProductVariant> variants = variantRepository.findAllById(variantIds).stream()
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));
        if (variants.size() != variantIds.size()) {
            throw ApiException.notFound("Alguna variante del pedido no existe");
        }

        List<Long> productIds = variants.values().stream()
                .map(ProductVariant::getProductId)
                .distinct()
                .toList();
        Map<Long, Product> products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        if (products.size() != productIds.size()) {
            throw ApiException.notFound("Algun producto del pedido no existe");
        }

        Set<String> currencies = products.values().stream()
                .map(Product::getCurrency)
                .collect(Collectors.toSet());
        if (currencies.size() != 1) {
            throw ApiException.badRequest("Todas las variantes deben tener la misma moneda");
        }

        Map<Long, String> images = new HashMap<>();
        imageRepository.findByProductIdInOrderByPrimaryDescIdAsc(productIds)
                .forEach(image -> images.putIfAbsent(image.getProductId(), image.getStoragePath()));

        List<Long> sortedVariantIds = variantIds.stream().sorted().toList();
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (Long variantId : sortedVariantIds) {
            ProductVariant variant = variants.get(variantId);
            Product product = products.get(variant.getProductId());
            if (!product.isActive()) {
                throw ApiException.badRequest("El producto " + product.getName() + " no está disponible");
            }

            int quantity = quantities.get(variantId);
            BigDecimal unitPrice = product.getPrice().add(variant.getPriceDelta())
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity))
                    .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setVariantId(variant.getId());
            item.setProductName(product.getName());
            item.setVariantLabel(truncate(variant.getSize() + " / " + variant.getColor(), 80));
            item.setUnitPrice(unitPrice);
            item.setQuantity(quantity);
            item.setLineTotal(lineTotal);
            item.setImagePath(images.get(product.getId()));
            orderItems.add(item);
        }

        for (Long variantId : sortedVariantIds) {
            ProductVariant variant = variants.get(variantId);
            Product product = products.get(variant.getProductId());
            int updated = variantRepository.decrementStock(variantId, quantities.get(variantId));
            if (updated == 0) {
                stockConflicts.increment();
                throw ApiException.conflict("Stock insuficiente para " + product.getName()
                        + " (" + variant.getSize() + " / " + variant.getColor() + ")");
            }
        }

        Order order = new Order();
        order.setCode(UUID.randomUUID().toString().replace("-", ""));
        order.setUserId(buyer.id());
        order.setCustomerEmail(buyer.email());
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotal(subtotal);
        order.setShippingCost(shippingCost);
        order.setTotal(subtotal.add(shippingCost));
        order.setCurrency(currencies.iterator().next());
        order.setReservationExpiresAt(Instant.now().plus(reservationTtl));
        Order savedOrder = orderRepository.save(order);

        orderItems.forEach(item -> item.setOrderId(savedOrder.getId()));
        orderItemRepository.saveAll(orderItems);
        ordersCreated.increment();

        List<OrderItem> savedItems = orderItemRepository.findByOrderIdOrderByIdAsc(savedOrder.getId());
        return OrderResponse.from(savedOrder, savedItems);
    }

    public List<OrderResponse> listMine(AuthenticatedUser buyer) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(buyer.id()).stream()
                .map(order -> OrderResponse.from(order, List.of(),
                        orderItemRepository.countByOrderId(order.getId())))
                .toList();
    }

    public OrderResponse getMine(String code, AuthenticatedUser buyer) {
        Order order = findOwned(code, buyer);
        return OrderResponse.from(order, orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()));
    }

    @Transactional
    public OrderResponse cancel(String code, AuthenticatedUser buyer) {
        Order order = findOwned(code, buyer);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw ApiException.conflict("Solo se pueden cancelar pedidos pendientes");
        }
        release(order.getId());
        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        if (updated.getStatus() == OrderStatus.PENDING) {
            throw ApiException.conflict("No se pudo cancelar el pedido");
        }
        ordersCancelled.increment();
        return OrderResponse.from(updated, orderItemRepository.findByOrderIdOrderByIdAsc(updated.getId()));
    }

    @Transactional
    public void markFailedAndRelease(Long orderId) {
        int changed = orderRepository.transitionIfStatus(
                orderId, OrderStatus.PENDING, OrderStatus.FAILED, Instant.now());
        if (changed > 0) {
            restoreItems(orderId);
        }
    }

    @Transactional
    public void expireDueReservations() {
        List<Order> due = orderRepository.findExpired(
                OrderStatus.PENDING, Instant.now(), PageRequest.of(0, EXPIRATION_BATCH));
        due.forEach(order -> {
            if (order.getStripePaymentIntentId() == null || order.getStripePaymentIntentId().isBlank()) {
                release(order.getId());
                return;
            }
            try {
                String paymentStatus = paymentService.reconcile(order);
                if ("succeeded".equals(paymentStatus)
                        || "processing".equals(paymentStatus)
                        || "requires_action".equals(paymentStatus)
                        || "requires_capture".equals(paymentStatus)) {
                    if (!"succeeded".equals(paymentStatus)) {
                        postpone(order);
                    }
                    return;
                }
            } catch (RuntimeException exception) {
                log.warn("No se pudo verificar el pago {} antes de expirar el pedido {}",
                        order.getStripePaymentIntentId(), order.getId(), exception);
                postpone(order);
                return;
            }
            release(order.getId());
        });
    }

    private void postpone(Order order) {
        order.setReservationExpiresAt(Instant.now().plus(reservationTtl));
        orderRepository.save(order);
    }

    private Order findOwned(String code, AuthenticatedUser buyer) {
        return orderRepository.findByCodeAndUserId(code, buyer.id())
                .orElseThrow(() -> ApiException.notFound("Pedido no encontrado"));
    }

    private void release(Long orderId) {
        String intentId = orderRepository.findById(orderId)
                .map(Order::getStripePaymentIntentId)
                .orElse(null);
        int changed = orderRepository.expireIfPending(
                orderId, OrderStatus.EXPIRED, OrderStatus.PENDING, Instant.now());
        if (changed == 0) {
            return;
        }
        restoreItems(orderId);
        if (intentId != null && !intentId.isBlank()) {
            try {
                stripeGateway.cancelIntent(intentId);
            } catch (RuntimeException exception) {
                log.warn("No se pudo cancelar el intent {} del pedido {}", intentId, orderId, exception);
            }
        }
    }

    private void restoreItems(Long orderId) {
        orderItemRepository.findByOrderIdOrderByIdAsc(orderId).stream()
                .filter(item -> item.getVariantId() != null)
                .sorted((left, right) -> Long.compare(left.getVariantId(), right.getVariantId()))
                .forEach(item -> variantRepository.incrementStock(item.getVariantId(), item.getQuantity()));
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
