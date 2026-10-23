package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.SupabaseStorageService;
import com.certichain.certichainbackend.support.TestCrypto;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import org.junit.jupiter.api.Test;

import java.util.List;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The status state machine - pure business rules, no I/O. This is the highest-value test in
 * the backend: the terminal-REVOKED rule and the reason requirements are what keep the trust
 * registry meaningful.
 */
class AccreditationServiceImplTest {

    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final InstitutionDocumentRepository institutionDocumentRepository = mock(InstitutionDocumentRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final SupabaseStorageService supabaseStorageService = mock(SupabaseStorageService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);
    // Real (not mocked) crypto - approve() actually generates and wraps a DEK, so this needs
    // to do real AES-GCM work rather than return nulls that would NPE inside encrypt().
    private final EnvelopeEncryptionService envelopeEncryptionService =
            new EnvelopeEncryptionServiceImpl("A".repeat(32));
    private final com.certichain.certichainbackend.common.service.impl.PiiCryptoService pii =
            TestCrypto.pii();

    private final AccreditationServiceImpl service = new AccreditationServiceImpl(
            institutionRepository, null, auditLogService, notificationService, userRepository,
            institutionDocumentRepository, credentialRepository, currentUser, envelopeEncryptionService, pii,
            supabaseStorageService);

    private Institution institutionWith(InstitutionStatus status) {
        Institution institution = Institution.builder()
                .id(UUID.randomUUID())
                .name("UIT")
                .ministry("Ministry of Science and Technology")
                .status(status)
                .appliedAt(Instant.now())
                .build();
        when(institutionRepository.findById(institution.getId())).thenReturn(Optional.of(institution));
        when(currentUser.id()).thenReturn(UUID.randomUUID());
        return institution;
    }

    @Test
    void approveMovesPendingToApproved() {
        Institution institution = institutionWith(InstitutionStatus.PENDING);

        service.approve(institution.getId());

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
        verify(auditLogService).log(eq("Institution approved"), any(), eq(institution.getId()), isNull());
        assertNotNull(institution.getDekWrapped());
        assertNotNull(institution.getDekIv());
    }

    @Test
    void revokedIsTerminalForEveryTransition() {
        Institution institution = institutionWith(InstitutionStatus.REVOKED);
        UUID id = institution.getId();

        assertThrows(ForbiddenActionException.class, () -> service.approve(id));
        assertThrows(ForbiddenActionException.class, () -> service.reinstate(id));
        assertThrows(ForbiddenActionException.class, () -> service.suspend(id, "reason"));
        assertThrows(ForbiddenActionException.class, () -> service.reject(id, "reason"));
        assertThrows(ForbiddenActionException.class, () -> service.revoke(id, "reason"));

        assertEquals(InstitutionStatus.REVOKED, institution.getStatus());
        verify(auditLogService, never()).log(any(), any(), any(), any());
    }

    @Test
    void suspendIsOnlyValidFromApproved() {
        Institution pending = institutionWith(InstitutionStatus.PENDING);
        assertThrows(ValidationException.class, () -> service.suspend(pending.getId(), "reason"));

        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        service.suspend(approved.getId(), "Under investigation");
        assertEquals(InstitutionStatus.SUSPENDED, approved.getStatus());
        assertEquals("Under investigation",
                pii.decryptInstitutionField(approved.getStatusReason(), approved.getId()));
    }

    @Test
    void reinstateReturnsSuspendedToApprovedAndClearsReason() {
        Institution institution = institutionWith(InstitutionStatus.SUSPENDED);
        institution.setStatusReason("Under investigation");

        service.reinstate(institution.getId());

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
        assertEquals(null, institution.getStatusReason());
    }

    @Test
    void revokeIsAllowedFromApprovedAndFromSuspended() {
        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        service.revoke(approved.getId(), "Fraud confirmed");
        assertEquals(InstitutionStatus.REVOKED, approved.getStatus());

        Institution suspended = institutionWith(InstitutionStatus.SUSPENDED);
        service.revoke(suspended.getId(), "Fraud confirmed");
        assertEquals(InstitutionStatus.REVOKED, suspended.getStatus());
    }

    @Test
    void blankReasonIsRejectedBeforeAnythingChanges() {
        Institution institution = institutionWith(InstitutionStatus.APPROVED);
        UUID id = institution.getId();

        assertThrows(ValidationException.class, () -> service.suspend(id, "  "));
        assertThrows(ValidationException.class, () -> service.suspend(id, null));
        assertThrows(ValidationException.class, () -> service.revoke(id, ""));
        assertThrows(ValidationException.class, () -> service.reject(id, null));

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
    }

    @Test
    void requestInfoLeavesStatusPendingAndDoesNotDecide() {
        Institution institution = institutionWith(InstitutionStatus.PENDING);

        service.requestInfo(institution.getId(), "Please attach the ministry letter");

        assertEquals(InstitutionStatus.PENDING, institution.getStatus());
        assertEquals("Please attach the ministry letter", pii.decryptInstitutionField(
                institution.getStatusReason(), institution.getId()));
        assertEquals(null, institution.getDecidedAt());
        verify(auditLogService, times(1))
                .log(eq("Information requested"), any(), eq(institution.getId()), isNull());
    }

    @Test
    void suspendNotifiesEachGraduateOnceWithReason() {
        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        UUID gradId = UUID.randomUUID();
        Credential claimedA = Credential.builder().id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE).institutionId(approved.getId())
                .graduateUserId(gradId).graduateEmail("claimed@x.com")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        Credential claimedB = Credential.builder().id(UUID.randomUUID())
                .type(CredentialType.ACTIVITY_RECORD).institutionId(approved.getId())
                .graduateUserId(gradId).graduateEmail("claimed@x.com")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        Credential unclaimed = Credential.builder().id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE).institutionId(approved.getId())
                .graduateEmail(pii.encryptUserField("unclaimed@x.com"))
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        when(credentialRepository.findByInstitutionId(approved.getId()))
                .thenReturn(List.of(claimedA, claimedB, unclaimed));

        service.suspend(approved.getId(), "Fraud suspected");

        verify(notificationService, times(1)).notify(eq(gradId), eq("Issuing institution suspended"),
                argThat(m -> m != null && m.contains("Fraud suspected")));
        verify(notificationService, times(1)).notifyEmail(eq("unclaimed@x.com"),
                eq("Issuing institution suspended"),
                argThat(m -> m != null && m.contains("Fraud suspected")));
    }

    @Test
    void revokeNotifiesGraduatesWithReason() {
        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        UUID gradId = UUID.randomUUID();
        Credential claimed = Credential.builder().id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE).institutionId(approved.getId())
                .graduateUserId(gradId).graduateEmail("claimed@x.com")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        when(credentialRepository.findByInstitutionId(approved.getId()))
                .thenReturn(List.of(claimed));

        service.revoke(approved.getId(), "Fraud confirmed");

        verify(notificationService, times(1)).notify(eq(gradId), eq("Issuing institution revoked"),
                argThat(m -> m != null && m.contains("Fraud confirmed")));
    }
}
