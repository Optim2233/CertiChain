package com.certichain.certichainbackend.briefing;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The three-state decision: UPDATES when items exist, then ALL_QUIET vs NONE on the 24h gap. */
class BriefingStateTest {

    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final ShareRepository shareRepository = mock(ShareRepository.class);
    private final DisputeFlagRepository disputeFlagRepository = mock(DisputeFlagRepository.class);
    private final AuditLogEntryRepository auditLogEntryRepository = mock(AuditLogEntryRepository.class);

    private final BriefingServiceImpl service = new BriefingServiceImpl(
            currentUser, userRepository, notificationRepository, credentialRepository,
            shareRepository, disputeFlagRepository, auditLogEntryRepository,
            com.certichain.certichainbackend.support.TestCrypto.pii());

    private void user(Instant lastBriefedAt) {
        User u = User.builder().id(UUID.randomUUID()).role(Role.GRADUATE)
                .createdAt(Instant.now()).lastBriefedAt(lastBriefedAt).build();
        when(currentUser.user()).thenReturn(u);
        when(credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(any())).thenReturn(List.of());
        when(shareRepository.findByGraduateUserIdOrderByCreatedAtDesc(any())).thenReturn(List.of());
    }

    private void notifications(int count) {
        Page<Notification> page = new PageImpl<>(count == 0 ? List.of() : List.of(
                Notification.builder().type("Certificate issued").message("x").createdAt(Instant.now()).build()));
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                any(), any(), any(Pageable.class))).thenReturn(page);
        when(notificationRepository.countByRecipientUserIdAndCreatedAtAfter(any(), any())).thenReturn((long) count);
    }

    @Test
    void updatesWhenNotificationsExistEvenIfJustHere() {
        user(Instant.now().minus(Duration.ofMinutes(5)));
        notifications(1);
        assertThat(service.getBriefing().state()).isEqualTo(Briefing.BriefingState.UPDATES);
    }

    @Test
    void noneWhenQuietAndRecentAck() {
        user(Instant.now().minus(Duration.ofHours(2)));
        notifications(0);
        assertThat(service.getBriefing().state()).isEqualTo(Briefing.BriefingState.NONE);
    }

    @Test
    void allQuietWhenQuietAndStaleAck() {
        user(Instant.now().minus(Duration.ofDays(3)));
        notifications(0);
        assertThat(service.getBriefing().state()).isEqualTo(Briefing.BriefingState.ALL_QUIET);
    }
}
