package com.merchshop.admin;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.admin.dto.AdminProductDetailResponse;
import com.merchshop.admin.dto.AdminProductPageResponse;
import com.merchshop.admin.dto.AdminProductRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/products")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final AdminProductService adminProductService;

    public AdminProductController(AdminProductService adminProductService) {
        this.adminProductService = adminProductService;
    }

    @GetMapping
    public AdminProductPageResponse list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String game,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String team,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminProductService.list(q, active, game, category, team, page, size);
    }

    @GetMapping("/{id}")
    public AdminProductDetailResponse detail(@PathVariable Long id) {
        return adminProductService.detail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDetailResponse create(@Valid @RequestBody AdminProductRequest request) {
        return adminProductService.create(request);
    }

    @PutMapping("/{id}")
    public AdminProductDetailResponse update(@PathVariable Long id,
                                             @Valid @RequestBody AdminProductRequest request) {
        return adminProductService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        adminProductService.deactivate(id);
    }
}
