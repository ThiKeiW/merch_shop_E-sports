package com.merchshop.admin;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.admin.dto.AdminFacetsResponse;
import com.merchshop.auth.dto.UserResponse;
import com.merchshop.user.UserRepository;

/**
 * Recursos exclusivos de administración: usuarios y catálogo editable.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AdminProductService adminProductService;

    public AdminController(UserRepository userRepository, AdminProductService adminProductService) {
        this.userRepository = userRepository;
        this.adminProductService = adminProductService;
    }

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(UserResponse::from)
                .toList();
    }

    @GetMapping("/facets")
    public AdminFacetsResponse facets() {
        return adminProductService.facets();
    }
}
