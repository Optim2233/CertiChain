package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import com.certichain.certichainbackend.support.TestCrypto;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** notify(): null-recipient no-op, one row + one email per call, unread as false. */
class NotificationServiceImplTest {

    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final EmailService emailService = mock(EmailService.class);

    private final NotificationServiceImpl service = new NotificationServiceImpl(
            notificationRepository, userRepository, emailService, TestCrypto.pii());

    @Test
    void nullRecipientIsASilentNoOp() {
        service.notify(null, "Certificate issued", "hi");

        verify(notificationRepository, never()).save(any());
        verify(emailService, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void notifyPersistsUnreadRowAndEmailsRecipient() {
        UUID uid = UUID.randomUUID();
        when(userRepository.findById(uid)).thenReturn(Optional.of(User.builder()
                .id(uid).email("grad@x.com").passwordHash("h").role(Role.GRADUATE)
                .createdAt(Instant.now()).build()));

        service.notify(uid, "Certificate revoked", "Reason: fraud");

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertEquals("Certificate revoked", saved.getValue().getType());
        assertFalse(saved.getValue().isRead());
        verify(emailService).send(eq("grad@x.com"), eq("CertiChain: Certificate revoked"), eq("Reason: fraud"));
    }

    @Test
    void notifyStillPersistsRowWhenUserHasNoEmailRecord() {
        UUID uid = UUID.randomUUID();
        when(userRepository.findById(uid)).thenReturn(Optional.empty());

        service.notify(uid, "X", "y");

        verify(notificationRepository).save(any());
        verify(emailService, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void markReadAndMarkAllReadDelegateWithRecipientScope() {
        UUID uid = UUID.randomUUID();
        UUID nid = UUID.randomUUID();

        service.markRead(uid, nid);
        service.markAllRead(uid);

        verify(notificationRepository).markRead(nid, uid);
        verify(notificationRepository).markAllRead(uid);
    }
}
