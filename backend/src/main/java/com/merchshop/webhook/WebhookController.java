package com.merchshop.webhook;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.merchshop.payment.StripeWebhookEvent;
import com.merchshop.payment.StripeGateway;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private final StripeGateway stripeGateway;
    private final WebhookService webhookService;

    public WebhookController(StripeGateway stripeGateway, WebhookService webhookService) {
        this.stripeGateway = stripeGateway;
        this.webhookService = webhookService;
    }

    @PostMapping("/stripe")
    public Map<String, Boolean> stripe(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        StripeWebhookEvent event = stripeGateway.verifyAndParse(payload, signature);
        webhookService.enqueue(event);
        return Map.of("received", true);
    }
}
