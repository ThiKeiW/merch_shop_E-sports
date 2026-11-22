package com.merchshop.webhook;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.payment.StripeWebhookEvent;

@Service
public class WebhookService {

    private final WebhookEventRepository webhookEventRepository;
    private final WebhookProcessor processor;

    public WebhookService(WebhookEventRepository webhookEventRepository, WebhookProcessor processor) {
        this.webhookEventRepository = webhookEventRepository;
        this.processor = processor;
    }

    @Transactional
    public void enqueue(StripeWebhookEvent event) {
        int inserted = webhookEventRepository.insertIfAbsent(event.id(), event.type());
        if (inserted == 0) {
            return;
        }
        processor.process(event);
    }
}
