package com.merchshop.auth.dto;

import java.time.Instant;

import com.merchshop.user.Role;
import com.merchshop.user.User;

public record UserResponse(
        Long id,
        String email,
        String displayName,
        Role role,
        boolean active,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt());
    }
}
