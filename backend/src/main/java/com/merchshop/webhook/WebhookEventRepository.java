package com.merchshop.webhook;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {

    @Modifying
    @Query(value = "INSERT IGNORE INTO webhook_events (event_id, type, status, attempts, created_at) " +
            "VALUES (:eventId, :type, 'RECEIVED', 0, UTC_TIMESTAMP())", nativeQuery = true)
    int insertIfAbsent(@Param("eventId") String eventId, @Param("type") String type);

    @Modifying
    @Query("update WebhookEvent e set e.status = 'PROCESSED', e.processedAt = :now " +
            "where e.eventId = :eventId and e.status = 'RECEIVED'")
    int markProcessed(@Param("eventId") String eventId, @Param("now") Instant now);

    @Modifying
    @Query("update WebhookEvent e set e.status = 'FAILED', e.attempts = e.attempts + 1 " +
            "where e.eventId = :eventId")
    int markFailed(@Param("eventId") String eventId);
}
