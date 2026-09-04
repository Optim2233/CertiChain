package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.Share;
import com.certichain.certichainbackend.common.entity.ShareFieldSelection;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.ShareScope;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.ShareFieldSelectionRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.MerkleServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Share-token dispatch, selective disclosure filtering, bulk CSV, EXPIRED path. Real Merkle. */
class VerifierShareAndBulkTest {

    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final ShareRepository shareRepository = mock(ShareRepository.class);
    private final ShareFieldSelectionRepository shareFieldSelectionRepository = mock(ShareFieldSelectionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final AuditLogEntryRepository auditLogEntryRepository = mock(AuditLogEntryRepository.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final CredentialFieldCryptoService credentialFieldCryptoService = passthroughCrypto();

    private final VerifierServiceImpl service = new VerifierServiceImpl(
            credentialRepository, credentialFieldRepository, institutionRepository, shareRepository,
            shareFieldSelectionRepository, merkleService, auditLogService, auditLogEntryRepository, credentialFieldCryptoService);

    private static CredentialFieldCryptoService passthroughCrypto() {
        CredentialFieldCryptoService c = org.mockito.Mockito.mock(CredentialFieldCryptoService.class);
        org.mockito.Mockito.when(c.decrypted(org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        return c;
    }

    private final List<Field> fields = List.of(
            new Field("degree", "BSc Computer Science"),
            new Field("gpa", "3.9"));

    private Credential seed(CredentialStatus status, Instant expiresAt, UUID graduateUserId) {
        UUID credId = UUID.randomUUID();
        UUID instId = UUID.randomUUID();
        Credential c = Credential.builder()
                .id(credId).type(CredentialType.CERTIFICATE).institutionId(instId)
                .graduateUserId(graduateUserId).graduateEmail("a@x.com").status(status)
                .merkleRoot(merkleService.computeRoot(fields)).signature("sig")
                .issuedAt(Instant.now().minus(1, ChronoUnit.DAYS)).expiresAt(expiresAt).build();
        when(credentialRepository.findById(credId)).thenReturn(Optional.of(c));
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credId)).thenReturn(List.of(
                CredentialField.builder().id(UUID.randomUUID()).credentialId(credId)
                        .fieldName("degree").fieldValue("BSc Computer Science").merkleIndex(0).build(),
                CredentialField.builder().id(UUID.randomUUID()).credentialId(credId)
                        .fieldName("gpa").fieldValue("3.9").merkleIndex(1).build()));
        when(institutionRepository.findById(instId)).thenReturn(Optional.of(Institution.builder()
                .id(instId).name("UIT").ministry("MoST").status(InstitutionStatus.APPROVED)
                .appliedAt(Instant.now()).build()));
        return c;
    }

    // --- share token ---

    @Test
    void unknownShareTokenIsNotFoundResult() {
        when(shareRepository.findByShareToken("nope")).thenReturn(Optional.empty());
        Object out = service.verifyByShareToken("nope");
        assertEquals(VerificationResult.INVALID_NOT_FOUND,
                ((VerificationResponse) out).result());
    }

    @Test
    void revokedShareLinkReadsShareRevokedNotCredentialRevoked() {
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(UUID.randomUUID())
                .name("x").scope(ShareScope.FULL_TIMELINE).shareToken("t").revoked(true)
                .createdAt(Instant.now()).build();
        when(shareRepository.findByShareToken("t")).thenReturn(Optional.of(share));

        Object out = service.verifyByShareToken("t");

        assertInstanceOf(Map.class, out);
        assertEquals("SHARE_REVOKED", ((Map<?, ?>) out).get("result"));
        verify(shareRepository, never()).save(any());
    }

    @Test
    void singleCredentialShareDisclosesOnlySelectedFields() {
        Credential c = seed(CredentialStatus.ISSUED, null, UUID.randomUUID());
        UUID gpaFieldId = credentialFieldRepository
                .findByCredentialIdOrderByMerkleIndex(c.getId()).get(1).getId();
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(c.getGraduateUserId())
                .name("Employer").scope(ShareScope.SINGLE_CREDENTIAL).shareToken("t")
                .credentialId(c.getId()).createdAt(Instant.now()).build();
        when(shareRepository.findByShareToken("t")).thenReturn(Optional.of(share));
        when(shareFieldSelectionRepository.findByShareId(share.getId())).thenReturn(List.of(
                ShareFieldSelection.builder().shareId(share.getId()).credentialFieldId(gpaFieldId).build()));

        VerificationResponse out = (VerificationResponse) service.verifyByShareToken("t");

        assertEquals(VerificationResult.VERIFIED, out.result());
        assertEquals(1, out.disclosedFields().size());
        assertEquals("gpa", out.disclosedFields().get(0).name());
        verify(auditLogService).log(any(), any(), any(), any(), any()); // SHARE_VIEWED
    }

    @Test
    void fullTimelineShareEvaluatesEachCredentialIndependently() {
        UUID gradId = UUID.randomUUID();
        Credential good = seed(CredentialStatus.ISSUED, null, gradId);
        Credential revoked = seed(CredentialStatus.REVOKED, null, gradId);
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(gradId)
                .name("All").scope(ShareScope.FULL_TIMELINE).shareToken("t")
                .createdAt(Instant.now()).build();
        when(shareRepository.findByShareToken("t")).thenReturn(Optional.of(share));
        when(credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(gradId))
                .thenReturn(List.of(good, revoked));

        @SuppressWarnings("unchecked")
        List<VerificationResponse> out = (List<VerificationResponse>) service.verifyByShareToken("t");

        assertEquals(2, out.size());
        assertTrue(out.stream().anyMatch(r -> r.result() == VerificationResult.VERIFIED));
        assertTrue(out.stream().anyMatch(r -> r.result() == VerificationResult.REVOKED));
    }

    // --- EXPIRED path ---

    @Test
    void expiredCredentialReadsExpiredEvenWithValidSignature() {
        Credential c = seed(CredentialStatus.ISSUED,
                Instant.now().minus(1, ChronoUnit.DAYS), UUID.randomUUID());

        VerificationResponse out = service.verifyById(c.getId());

        assertEquals(VerificationResult.EXPIRED, out.result());
    }

    // --- bulk ---

    @Test
    void bulkVerifySkipsHeaderAndBlankLinesAndFlagsGarbage() {
        Credential ok = seed(CredentialStatus.ISSUED, null, UUID.randomUUID());
        String csv = "certificate_id\n" + ok.getId() + "\n\n" + "not-a-uuid\n";
        MockMultipartFile file = new MockMultipartFile("file", "b.csv", "text/csv",
                csv.getBytes());

        List<BulkVerifyRow> rows = service.verifyBulk(file);

        assertEquals(2, rows.size());
        assertEquals(VerificationResult.VERIFIED, rows.get(0).result());
        assertEquals(VerificationResult.INVALID_NOT_FOUND, rows.get(1).result());
    }

    // --- file ---

    @Test
    void verifyByFileReadsCredentialIdFromJson() {
        Credential ok = seed(CredentialStatus.ISSUED, null, UUID.randomUUID());
        MockMultipartFile file = new MockMultipartFile("file", "c.json", "application/json",
                ("{\"credentialId\":\"" + ok.getId() + "\"}").getBytes());

        assertEquals(VerificationResult.VERIFIED, service.verifyByFile(file).result());
    }

    @Test
    void verifyByFileWithNoCredentialIdIsNotFound() {
        MockMultipartFile file = new MockMultipartFile("file", "c.json", "application/json",
                "{\"foo\":\"bar\"}".getBytes());
        assertEquals(VerificationResult.INVALID_NOT_FOUND, service.verifyByFile(file).result());
    }
}
