package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.NotificationService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** revokeBatch: one reason applied to every not-already-revoked member of a batch. */
class RevokeBatchTest {

    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);

    private final UUID institutionId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID batchId = UUID.randomUUID();

    private final InstitutionServiceImpl service = new InstitutionServiceImpl(
            null, null, null, credentialRepository, null, null, null, null,
            auditLogService, notificationService, null, null, currentUser);

    private Credential member(CredentialStatus status) {
        return Credential.builder()
                .id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE)
                .institutionId(institutionId)
                .graduateUserId(UUID.randomUUID())
                .graduateEmail("g@example.edu")
                .batchId(batchId)
                .status(status)
                .issuedAt(Instant.now())
                .build();
    }

    private void currentUserIsInstitution() {
        when(currentUser.institutionId()).thenReturn(institutionId);
        when(currentUser.id()).thenReturn(actorId);
    }

    @Test
    void revokesEveryNonRevokedMember() {
        currentUserIsInstitution();
        Credential a = member(CredentialStatus.ISSUED);
        Credential b = member(CredentialStatus.PENDING_CLAIM);
        Credential c = member(CredentialStatus.REVOKED);
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(a, b, c));

        BatchRevokeResult result = service.revokeBatch(batchId, "policy change");

        assertEquals(2, result.revoked());
        assertEquals(1, result.alreadyRevoked());
        for (Credential cred : List.of(a, b)) {
            assertEquals(CredentialStatus.REVOKED, cred.getStatus());
            assertEquals("policy change", cred.getRevokeReason());
            assertNotNull(cred.getRevokedAt());
        }
        verify(auditLogService, times(2))
                .log(eq(AuditEvents.CERTIFICATE_REVOKED_EVENT), eq(actorId), eq(institutionId), any());
        verify(notificationService, times(2)).notify(any(), anyString(), anyString());
    }

    @Test
    void secondRevokeIsANoOp() {
        currentUserIsInstitution();
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(member(CredentialStatus.REVOKED), member(CredentialStatus.REVOKED)));

        BatchRevokeResult result = service.revokeBatch(batchId, "again");

        assertEquals(0, result.revoked());
        assertEquals(2, result.alreadyRevoked());
        verify(auditLogService, never()).log(anyString(), any(), any(), any());
        verify(notificationService, never()).notify(any(), anyString(), anyString());
    }

    @Test
    void unknownBatchIs404() {
        currentUserIsInstitution();
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class, () -> service.revokeBatch(batchId, "x"));
    }

    @Test
    void blankReasonIsRejected() {
        assertThrows(ValidationException.class, () -> service.revokeBatch(batchId, "  "));
    }
}
