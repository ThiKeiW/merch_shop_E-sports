package com.merchshop.common;

import java.time.Instant;

/**
 * Cuerpo de error uniforme para todas las respuestas 4xx/5xx de la API.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path) {

    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path);
    }
}
