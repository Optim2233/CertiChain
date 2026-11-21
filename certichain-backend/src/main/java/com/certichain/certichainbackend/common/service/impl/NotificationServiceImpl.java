package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PiiCryptoService piiCryptoService;

    @Override
    @Transactional
    public void notify(UUID recipientUserId, String type, String message) {
        notify(recipientUserId, type, message, null, null);
    }

    @Override
    @Transactional
    public void notify(UUID recipientUserId, String type, String message, String ctaUrl, String ctaLabel) {
        if (recipientUserId == null) {
            return; // e.g. credential not yet claimed - nobody to notify yet
        }
        // Message bodies carry names/resolutions - KEK envelope (recipient varies by call site).
        notificationRepository.save(Notification.builder()
                .recipientUserId(recipientUserId)
                .type(type)
                .message(piiCryptoService.encryptUserField(message))
                .read(false)
                .createdAt(Instant.now())
                .build());

        userRepository.findById(recipientUserId)
                .map(u -> piiCryptoService.decryptUserField(u.getEmail()))
                .ifPresent(email -> notifyEmail(email, type, message, ctaUrl, ctaLabel));
    }

    @Override
    public void notifyEmail(String email, String type, String message) {
        notifyEmail(email, type, message, null, null);
    }

    @Override
    public void notifyEmail(String email, String type, String message, String ctaUrl, String ctaLabel) {
        if (email == null || email.isBlank()) return;
        try {
            emailService.sendNotification(email, type, message, ctaUrl, ctaLabel);
        } catch (Exception e) { emailService.send(email, "CertiChain: " + type, message); }
    }

    @Override
    public Page<Notification> list(UUID recipientUserId, int page, int size) {
        Page<Notification> notifications = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                recipientUserId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        // Decrypt-on-read copies - the managed entities keep ciphertext (never flush plaintext).
        List<Notification> decrypted = notifications.getContent().stream()
                .map(n -> Notification.builder()
                        .id(n.getId()).recipientUserId(n.getRecipientUserId()).type(n.getType())
                        .message(piiCryptoService.decryptUserField(n.getMessage()))
                        .read(n.isRead()).createdAt(n.getCreatedAt())
                        .build())
                .toList();
        return new org.springframework.data.domain.PageImpl<>(
                decrypted, notifications.getPageable(), notifications.getTotalElements());
    }

    @Override
    public long unreadCount(UUID recipientUserId) {
        return notificationRepository.countByRecipientUserIdAndReadFalse(recipientUserId);
    }

    @Override
    @Transactional
    public void markRead(UUID recipientUserId, UUID notificationId) {
        notificationRepository.markRead(notificationId, recipientUserId);
    }

    @Override
    @Transactional
    public void markAllRead(UUID recipientUserId) {
        notificationRepository.markAllRead(recipientUserId);
    }
}
