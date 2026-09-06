package com.certichain.certichainbackend.common.service;

import com.certichain.certichainbackend.common.entity.Notification;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface NotificationService {
    /** Creates the in-app row and emails the recipient. No-op if recipientUserId is null
     * (e.g. a credential not yet claimed by any account). */
    void notify(UUID recipientUserId, String type, String message);

    /** Email only, no in-app row — for addresses with no account yet (e.g. PENDING_CLAIM
     * credentials), where notify() would no-op and the recipient would never learn. */
    void notifyEmail(String email, String type, String message);

    Page<Notification> list(UUID recipientUserId, int page, int size);

    long unreadCount(UUID recipientUserId);

    void markRead(UUID recipientUserId, UUID notificationId);

    void markAllRead(UUID recipientUserId);
}
