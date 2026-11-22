package com.merchshop.order;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderExpirationScheduler {

    private final OrderService orderService;

    public OrderExpirationScheduler(OrderService orderService) {
        this.orderService = orderService;
    }

    @Scheduled(fixedDelayString = "${app.orders.expiration-sweep-ms:60000}")
    public void sweep() {
        orderService.expireDueReservations();
    }
}
