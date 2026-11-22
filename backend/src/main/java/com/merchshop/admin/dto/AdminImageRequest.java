package com.merchshop.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminImageRequest(
        @NotBlank(message = "La ruta de la imagen es obligatoria")
        @Size(max = 500, message = "La ruta de la imagen no puede superar 500 caracteres") String path,
        @Size(max = 700, message = "La URL de origen no puede superar 700 caracteres") String sourceUrl,
        @Pattern(regexp = "THUMB|CARD|DETAIL", message = "El tipo debe ser THUMB, CARD o DETAIL") String kind,
        boolean primary) {
}
