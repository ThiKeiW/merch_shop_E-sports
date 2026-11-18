package com.merchshop.payment;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.security.AuthenticatedUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/intent")
    public PaymentIntentResponse createIntent(@Valid @RequestBody PaymentIntentRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser buyer) {
        return paymentService.createIntent(request.orderCode(), buyer);
    }

    public record PaymentIntentRequest(@NotBlank String orderCode) {
    }
}
