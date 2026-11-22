package com.merchshop.order;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.order.dto.CreateOrderRequest;
import com.merchshop.order.dto.OrderResponse;
import com.merchshop.security.AuthenticatedUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request,
                                @AuthenticationPrincipal AuthenticatedUser buyer) {
        return orderService.create(request, buyer);
    }

    @GetMapping
    public List<OrderResponse> listMine(@AuthenticationPrincipal AuthenticatedUser buyer) {
        return orderService.listMine(buyer);
    }

    @GetMapping("/{code}")
    public OrderResponse getMine(@PathVariable String code,
                                 @AuthenticationPrincipal AuthenticatedUser buyer) {
        return orderService.getMine(code, buyer);
    }

    @PostMapping("/{code}/cancel")
    public OrderResponse cancel(@PathVariable String code,
                                @AuthenticationPrincipal AuthenticatedUser buyer) {
        return orderService.cancel(code, buyer);
    }
}
