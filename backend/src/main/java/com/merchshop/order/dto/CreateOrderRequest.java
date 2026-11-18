package com.merchshop.order.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
        @NotEmpty(message = "El pedido debe tener al menos una línea")
        @Size(max = 50, message = "No se permiten más de 50 líneas")
        List<@Valid CreateOrderItemRequest> items) {
}
