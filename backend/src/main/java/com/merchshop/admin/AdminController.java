package com.merchshop.admin;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.auth.dto.UserResponse;
import com.merchshop.user.UserRepository;

/**
 * Recursos exclusivos de administración. El CRUD de productos y pedidos llega
 * en la Fase 4; por ahora expone el listado de usuarios para validar el rol.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(UserResponse::from)
                .toList();
    }
}
