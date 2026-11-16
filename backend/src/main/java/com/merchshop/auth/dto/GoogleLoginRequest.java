package com.merchshop.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank(message = "El ID token de Google es obligatorio")
        @Size(max = 4096, message = "El ID token de Google es demasiado largo")
        String idToken) {
}
