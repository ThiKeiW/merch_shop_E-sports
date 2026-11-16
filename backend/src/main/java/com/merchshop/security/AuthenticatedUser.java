package com.merchshop.security;

import com.merchshop.user.Role;

/**
 * Identidad autenticada en la petición, derivada del token JWT y validada
 * contra la base de datos en cada request.
 */
public record AuthenticatedUser(Long id, String email, String displayName, Role role) {
}
