package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import com.certichain.certichainbackend.common.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Override
    @Transactional
    public void notify(UUID recipientUserId, String type, String message) {
        if (recipientUserId == null) {
            return; // e.g. credential not yet claimed - nobody to notify yet
        }
        notificationRepository.save(Notification.builder()
                .recipientUserId(recipientUserId)
                .type(type)
                .message(message)
                .read(false)
                .createdAt(Instant.now())
                .build());

        userRepository.findById(recipientUserId)
                .map(User::getEmail)
                .ifPresent(email -> {
                    try { ((EmailServiceImpl) emailService).sendNotification(email, type, message); }
                    catch (Exception e) { emailService.send(email, "CertiChain: " + type, message); }
                });
    }

    @Override
    public Page<Notification> list(UUID recipientUserId, int page, int size) {
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                recipientUserId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
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
