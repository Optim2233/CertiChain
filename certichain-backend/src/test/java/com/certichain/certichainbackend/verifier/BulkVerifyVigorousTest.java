package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.*;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.impl.MerkleServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BulkVerifyVigorousTest {
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final VerifierServiceImpl service = new VerifierServiceImpl(
            credentialRepository, credentialFieldRepository, institutionRepository, mock(com.certichain.certichainbackend.common.repository.ShareRepository.class),
            mock(com.certichain.certichainbackend.common.repository.ShareFieldSelectionRepository.class), merkleService, auditLogService, mock(AuditLogEntryRepository.class));

    private Credential seed(CredentialStatus status, Instant expiresAt) {
        UUID id = UUID.randomUUID(); UUID instId = UUID.randomUUID();
        List<Field> fields = List.of(new Field("degree","BSc"), new Field("gpa","3.9"));
        Credential c = Credential.builder().id(id).type(CredentialType.CERTIFICATE).institutionId(instId).graduateUserId(UUID.randomUUID()).graduateEmail("a@x.com").status(status)
                .merkleRoot(merkleService.computeRoot(fields)).signature("sig").issuedAt(Instant.now().minus(1, ChronoUnit.DAYS)).expiresAt(expiresAt).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(id)).thenReturn(List.of(
                CredentialField.builder().id(UUID.randomUUID()).credentialId(id).fieldName("degree").fieldValue("BSc").merkleIndex(0).build(),
                CredentialField.builder().id(UUID.randomUUID()).credentialId(id).fieldName("gpa").fieldValue("3.9").merkleIndex(1).build()));
        when(institutionRepository.findById(instId)).thenReturn(Optional.of(Institution.builder().id(instId).name("UIT").ministry("MoST").status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build()));
        return c;
    }

    @Test void bulkRevokedAndExpiredAndTampered() {
        Credential verified = seed(CredentialStatus.ISSUED, null);
        Credential revoked = seed(CredentialStatus.REVOKED, null);
        Credential expired = seed(CredentialStatus.ISSUED, Instant.now().minus(1, ChronoUnit.DAYS));
        // tamper: change field value after seed so recomputed root mismatches
        Credential tampered = seed(CredentialStatus.ISSUED, null);
        // override field to different value
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(tampered.getId())).thenReturn(List.of(
                CredentialField.builder().id(UUID.randomUUID()).credentialId(tampered.getId()).fieldName("degree").fieldValue("TAMPERED").merkleIndex(0).build(),
                CredentialField.builder().id(UUID.randomUUID()).credentialId(tampered.getId()).fieldName("gpa").fieldValue("3.9").merkleIndex(1).build()));

        String csv = String.join("\n", verified.getId().toString(), revoked.getId().toString(), expired.getId().toString(), tampered.getId().toString(), "not-a-uuid", "", "  "+verified.getId()+"  ");
        MockMultipartFile file = new MockMultipartFile("file","bulk.csv","text/csv", csv.getBytes());
        List<BulkVerifyRow> rows = service.verifyBulk(file);
        assertEquals(6, rows.size());
        assertEquals(VerificationResult.VERIFIED, rows.get(0).result());
        assertEquals(VerificationResult.REVOKED, rows.get(1).result());
        assertEquals(VerificationResult.EXPIRED, rows.get(2).result());
        assertEquals(VerificationResult.INVALID_NOT_FOUND, rows.get(3).result());
        assertEquals(VerificationResult.INVALID_NOT_FOUND, rows.get(4).result());
        assertEquals(VerificationResult.VERIFIED, rows.get(5).result(), "whitespace trimmed");
    }

    @Test void headerSkippedCaseInsensitively() {
        Credential ok = seed(CredentialStatus.ISSUED, null);
        MockMultipartFile file = new MockMultipartFile("file","b.csv","text/csv", ("Certificate_ID\n"+ok.getId()+"\n").getBytes());
        assertEquals(1, service.verifyBulk(file).size());
        assertEquals(VerificationResult.VERIFIED, service.verifyBulk(file).get(0).result());
    }

    @Test void emptyFileReturnsEmpty() {
        MockMultipartFile file = new MockMultipartFile("file","b.csv","text/csv", "".getBytes());
        assertTrue(service.verifyBulk(file).isEmpty());
    }
}
