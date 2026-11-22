package com.merchshop.admin.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminVariantRequest(
        @Size(max = 64, message = "El SKU no puede superar 64 caracteres") String sku,
        @NotBlank(message = "La talla es obligatoria")
        @Size(max = 20, message = "La talla no puede superar 20 caracteres") String size,
        @NotBlank(message = "El color es obligatorio")
        @Size(max = 40, message = "El color no puede superar 40 caracteres") String color,
        @NotNull(message = "El ajuste de precio es obligatorio")
        @DecimalMin(value = "0.00", message = "El ajuste de precio no puede ser negativo")
        @Digits(integer = 8, fraction = 2, message = "El ajuste de precio no es válido")
        BigDecimal priceDelta,
        @NotNull(message = "El stock es obligatorio")
        @Min(value = 0, message = "El stock no puede ser negativo")
        @Max(value = 100000, message = "El stock es demasiado alto") Integer stock) {
}
