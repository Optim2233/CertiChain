package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    // Revocation emails name the credential + issuer: the title lookup needs the field
    // repo, the issuer lookup needs the institution repo (mock defaults: empty results,
    // which degrade gracefully to "credential" / "your institution" in the message).
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    // Passthrough: lifecycle emails decrypt the title fields via the real service; with a
    // mock returning its input, the empty field list degrades the title to "credential".
    private final com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService
            credentialFieldCryptoService = mock(com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService.class);
    {
        when(credentialFieldCryptoService.decrypted(org.mockito.ArgumentMatchers.anyList(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }
    private final com.certichain.certichainbackend.common.service.LedgerService ledgerService =
            mock(com.certichain.certichainbackend.common.service.LedgerService.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final com.certichain.certichainbackend.common.service.impl.PiiCryptoService pii =
            com.certichain.certichainbackend.support.TestCrypto.pii();

    private final UUID institutionId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID batchId = UUID.randomUUID();

    private final InstitutionServiceImpl service = new InstitutionServiceImpl(
            institutionRepository, null, null, credentialRepository, credentialFieldRepository, null, null, null,
            ledgerService, auditLogService, notificationService, null, null, currentUser,
            credentialFieldCryptoService, pii);

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

        BatchRevokeResult result = service.revokeBatch(batchId, "policy change", null);

        assertEquals(2, result.revoked());
        assertEquals(1, result.alreadyRevoked());
        for (Credential cred : List.of(a, b)) {
            assertEquals(CredentialStatus.REVOKED, cred.getStatus());
            assertEquals("policy change",
                    pii.decryptInstitutionField(cred.getRevokeReason(), institutionId));
            assertNotNull(cred.getRevokedAt());
        }
        verify(auditLogService, times(2))
                .log(eq(AuditEvents.CERTIFICATE_REVOKED_EVENT), eq(actorId), eq(institutionId), any());
        verify(notificationService, times(2)).notify(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void secondRevokeIsANoOp() {
        currentUserIsInstitution();
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(member(CredentialStatus.REVOKED), member(CredentialStatus.REVOKED)));

        BatchRevokeResult result = service.revokeBatch(batchId, "again", null);

        assertEquals(0, result.revoked());
        assertEquals(2, result.alreadyRevoked());
        verify(auditLogService, never()).log(anyString(), any(), any(), any());
        verify(notificationService, never()).notify(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void unknownBatchIs404() {
        currentUserIsInstitution();
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class, () -> service.revokeBatch(batchId, "x", null));
    }

    @Test
    void blankReasonIsRejected() {
        assertThrows(ValidationException.class, () -> service.revokeBatch(batchId, "  ", null));
    }

    @Test
    void selectionRevokesOnlyChosenMembers() {
        currentUserIsInstitution();
        Credential a = member(CredentialStatus.ISSUED);
        Credential b = member(CredentialStatus.ISSUED);
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(a, b));

        BatchRevokeResult result = service.revokeBatch(batchId, "selective", List.of(a.getId()));

        assertEquals(1, result.revoked());
        assertEquals(0, result.alreadyRevoked());
        assertEquals(CredentialStatus.REVOKED, a.getStatus());
        assertEquals(CredentialStatus.ISSUED, b.getStatus());
        verify(auditLogService, times(1))
                .log(eq(AuditEvents.CERTIFICATE_REVOKED_EVENT), eq(actorId), eq(institutionId), eq(a.getId()));
    }

    @Test
    void unrevokeRestoresAStatusAndClearsReason() {
        currentUserIsInstitution();
        Credential revoked = member(CredentialStatus.REVOKED);
        revoked.setRevokeReason(pii.encryptInstitutionField("old reason", institutionId));
        revoked.setRevokedAt(Instant.now());
        when(credentialRepository.findById(revoked.getId())).thenReturn(java.util.Optional.of(revoked));

        service.unrevokeCredential(revoked.getId());

        assertEquals(CredentialStatus.ISSUED, revoked.getStatus());
        assertEquals(null, revoked.getRevokeReason());
        assertEquals(null, revoked.getRevokedAt());
        verify(auditLogService).log(eq(AuditEvents.CERTIFICATE_RESTORED_EVENT), eq(actorId), eq(institutionId), eq(revoked.getId()));
        verify(notificationService).notify(any(), eq("Certificate restored"), anyString(), anyString(), anyString());
    }

    @Test
    void unrevokeRejectsNonRevokedCredential() {
        currentUserIsInstitution();
        Credential issued = member(CredentialStatus.ISSUED);
        when(credentialRepository.findById(issued.getId())).thenReturn(java.util.Optional.of(issued));

        assertThrows(ValidationException.class, () -> service.unrevokeCredential(issued.getId()));
    }

    @Test
    void unrevokeRejectsCredentialSupersededByAnIdenticalReissue() {
        // Restoring would put two active rows with the same merkle root in the table, which
        // the uq_credential_institution_merkle_active index rejects - previously that
        // surfaced as a bare 409 DATA_CONFLICT naming neither the credential nor the fix.
        currentUserIsInstitution();
        Credential revoked = member(CredentialStatus.REVOKED);
        revoked.setMerkleRoot("dup-root");
        when(credentialRepository.findById(revoked.getId())).thenReturn(java.util.Optional.of(revoked));
        when(credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, "dup-root", CredentialStatus.REVOKED)).thenReturn(true);

        ValidationException ex = assertThrows(ValidationException.class,
                () -> service.unrevokeCredential(revoked.getId()));

        assertTrue(ex.getMessage().contains("identical one has since been issued"),
                "message should say why, got: " + ex.getMessage());
        assertEquals(CredentialStatus.REVOKED, revoked.getStatus(), "must not be restored");
    }

    @Test
    void unrevokeBatchSkipsSupersededMembersAndRestoresTheRest() {
        // One conflicting member must not abort the transaction and block the others.
        currentUserIsInstitution();
        Credential ok = member(CredentialStatus.REVOKED);
        ok.setMerkleRoot("free-root");
        Credential blocked = member(CredentialStatus.REVOKED);
        blocked.setMerkleRoot("dup-root");
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(ok, blocked));
        when(credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, "dup-root", CredentialStatus.REVOKED)).thenReturn(true);
        when(credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, "free-root", CredentialStatus.REVOKED)).thenReturn(false);

        BatchUnrevokeResult result = service.unrevokeBatch(batchId, null);

        assertEquals(1, result.restored());
        assertEquals(1, result.superseded());
        assertEquals(0, result.alreadyActive());
        assertEquals(CredentialStatus.ISSUED, ok.getStatus());
        assertEquals(CredentialStatus.REVOKED, blocked.getStatus(), "superseded member stays revoked");
    }

    @Test
    void unrevokeBatchRestoresEveryRevokedMember() {
        currentUserIsInstitution();
        Credential a = member(CredentialStatus.REVOKED);
        Credential b = member(CredentialStatus.ISSUED);
        Credential c = member(CredentialStatus.REVOKED);
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(a, b, c));

        BatchUnrevokeResult result = service.unrevokeBatch(batchId, null);

        assertEquals(2, result.restored());
        assertEquals(1, result.alreadyActive());
        assertEquals(CredentialStatus.ISSUED, a.getStatus());
        assertEquals(CredentialStatus.ISSUED, c.getStatus());
        verify(auditLogService, times(2))
                .log(eq(AuditEvents.CERTIFICATE_RESTORED_EVENT), eq(actorId), eq(institutionId), any());
    }

    @Test
    void unrevokeBatchSelectionRestoresOnlyChosenMembers() {
        currentUserIsInstitution();
        Credential a = member(CredentialStatus.REVOKED);
        Credential b = member(CredentialStatus.REVOKED);
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of(a, b));

        BatchUnrevokeResult result = service.unrevokeBatch(batchId, List.of(a.getId()));

        assertEquals(1, result.restored());
        assertEquals(CredentialStatus.ISSUED, a.getStatus());
        assertEquals(CredentialStatus.REVOKED, b.getStatus());
    }

    @Test
    void unrevokeBatchUnknownBatchIs404() {
        currentUserIsInstitution();
        when(credentialRepository.findByInstitutionIdAndBatchId(institutionId, batchId))
                .thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class, () -> service.unrevokeBatch(batchId, null));
    }
}
