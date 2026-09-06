package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);

    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);

    Page<Notification> findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
            UUID recipientUserId, Instant createdAt, Pageable pageable);

    long countByRecipientUserIdAndCreatedAtAfter(UUID recipientUserId, Instant createdAt);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.id = :id AND n.recipientUserId = :recipientUserId")
    int markRead(@Param("id") UUID id, @Param("recipientUserId") UUID recipientUserId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientUserId = :recipientUserId AND n.read = false")
    int markAllRead(@Param("recipientUserId") UUID recipientUserId);
}
