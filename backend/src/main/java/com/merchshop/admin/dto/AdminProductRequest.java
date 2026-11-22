package com.merchshop.admin.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminProductRequest(
        @Size(max = 160, message = "El slug no puede superar 160 caracteres")
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "El slug solo admite minúsculas, números y guiones")
        String slug,
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 200, message = "El nombre debe tener entre 2 y 200 caracteres") String name,
        @Size(max = 5000, message = "La descripción no puede superar 5000 caracteres") String description,
        @NotBlank(message = "El juego es obligatorio") String game,
        @NotBlank(message = "La categoría es obligatoria") String category,
        String subcategory,
        String team,
        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.00", message = "El precio no puede ser negativo")
        @Digits(integer = 8, fraction = 2, message = "El precio no es válido") BigDecimal price,
        @Pattern(regexp = "[A-Z]{3}", message = "La moneda debe ser un código ISO de 3 letras") String currency,
        Boolean featured,
        Boolean active,
        @NotEmpty(message = "Debes registrar al menos una variante")
        @Size(max = 60, message = "No se permiten más de 60 variantes")
        List<@Valid AdminVariantRequest> variants,
        @Size(max = 8, message = "No se permiten más de 8 imágenes")
        List<@Valid AdminImageRequest> images) {
}
