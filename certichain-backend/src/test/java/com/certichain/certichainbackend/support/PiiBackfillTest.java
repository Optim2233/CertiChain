package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Backfill encrypts unfinished rows and skips finished ones - re-run safe by construction. */
class PiiBackfillTest {

    private final UserRepository users = mock(UserRepository.class);
    private final CredentialRepository credentials = mock(CredentialRepository.class);
    private final InstitutionRepository institutions = mock(InstitutionRepository.class);
    private final DisputeFlagRepository disputes = mock(DisputeFlagRepository.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final InstitutionDocumentRepository documents = mock(InstitutionDocumentRepository.class);
    private final PiiCryptoService pii = TestCrypto.pii();

    private final PiiBackfill backfill = new PiiBackfill(
            users, credentials, institutions, disputes, notifications, documents,
            mock(com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService.class),
            mock(com.certichain.certichainbackend.common.service.EnvelopeEncryptionService.class),
            pii);

    private void emptyEveryoneElse() {
        when(credentials.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(institutions.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(institutions.findByDekWrappedIsNull()).thenReturn(List.of());
        when(disputes.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(notifications.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(documents.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
    }

    @Test
    void encryptsUnfinishedUserThenSkipsItOnRerun() {
        emptyEveryoneElse();
        User u = User.builder().id(UUID.randomUUID()).email("grad@x.com")
                .firstName("Ada").role(Role.GRADUATE).createdAt(Instant.now()).build();
        when(users.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(u)));

        backfill.run();

        // first run encrypts + indexes...
        verify(users, times(1)).save(any(User.class));
        assertNotEquals("grad@x.com", u.getEmail());
        assertEquals(pii.emailHmac("grad@x.com"), u.getEmailHmac());
        assertEquals("Ada", pii.decryptUserField(u.getFirstName()));

        // ...second run sees the HMAC and leaves the row alone
        backfill.run();
        verify(users, times(1)).save(any(User.class));
    }
}
