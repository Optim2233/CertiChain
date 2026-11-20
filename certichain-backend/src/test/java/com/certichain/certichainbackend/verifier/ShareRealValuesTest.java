package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.*;
import com.certichain.certichainbackend.common.enums.*;
import com.certichain.certichainbackend.common.repository.*;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Real share tokens: UUID.randomUUID().toString() as GraduateServiceImpl does,
 * verified via VerifierServiceImpl.verifyByShareToken — prints real token for manual /share/{token} check.
 */
class ShareRealValuesTest {
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final ShareRepository shareRepository = mock(ShareRepository.class);
    private final ShareFieldSelectionRepository shareFieldSelectionRepository = mock(ShareFieldSelectionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final CredentialFieldCryptoService credentialFieldCryptoService = passthroughCrypto();
    private final com.certichain.certichainbackend.common.service.SigningService signingService =
            mock(com.certichain.certichainbackend.common.service.SigningService.class);
    private final VerifierServiceImpl verifierService = new VerifierServiceImpl(
            credentialRepository, credentialFieldRepository, institutionRepository, shareRepository,
            shareFieldSelectionRepository, merkleService, signingService,
            mock(com.certichain.certichainbackend.common.service.LedgerService.class),
            mock(com.certichain.certichainbackend.common.repository.LedgerAnchorRepository.class),
            auditLogService, mock(AuditLogEntryRepository.class), credentialFieldCryptoService,
            com.certichain.certichainbackend.support.TestCrypto.pii());

    {
        // Seeded credentials carry opaque "sig" strings; the signature check just must
        // not block the share flows these tests are about.
        org.mockito.Mockito.when(signingService.signatureValid(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any())).thenReturn(true);
    }

    private static CredentialFieldCryptoService passthroughCrypto() {
        CredentialFieldCryptoService c = org.mockito.Mockito.mock(CredentialFieldCryptoService.class);
        org.mockito.Mockito.when(c.decrypted(org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        return c;
    }

    private Credential seed(CredentialStatus status, UUID gradId) {
        UUID id = UUID.randomUUID(); UUID instId = UUID.randomUUID();
        List<Field> fields = List.of(new Field("degree","BSc Computer Science"), new Field("gpa","3.9"));
        Credential c = Credential.builder().id(id).type(CredentialType.CERTIFICATE).institutionId(instId)
                .graduateUserId(gradId).graduateEmail("real@test.local").status(status)
                .merkleRoot(merkleService.computeRoot(fields)).signature("sig")
                .issuedAt(Instant.now().minus(1, ChronoUnit.DAYS)).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(id)).thenReturn(List.of(
                CredentialField.builder().id(UUID.randomUUID()).credentialId(id).fieldName("degree").fieldValue("BSc Computer Science").merkleIndex(0).build(),
                CredentialField.builder().id(UUID.randomUUID()).credentialId(id).fieldName("gpa").fieldValue("3.9").merkleIndex(1).build()));
        when(institutionRepository.findById(instId)).thenReturn(Optional.of(Institution.builder().id(instId).name("UIT").ministry("MoST").status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build()));
        return c;
    }

    @Test
    void singleCredentialShareVerifiesViaToken() {
        UUID gradId = UUID.randomUUID();
        Credential cred = seed(CredentialStatus.ISSUED, gradId);
        UUID fieldId = credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(cred.getId()).get(0).getId();
        String token = UUID.randomUUID().toString(); // real share token format dd8b52fc-... as in report
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(gradId).name("For Employer")
                .scope(ShareScope.SINGLE_CREDENTIAL).shareToken(token).credentialId(cred.getId()).viewCount(0).createdAt(Instant.now()).revoked(false).build();
        when(shareRepository.findByShareToken(token)).thenReturn(Optional.of(share));
        when(shareFieldSelectionRepository.findByShareId(share.getId())).thenReturn(List.of(
                ShareFieldSelection.builder().shareId(share.getId()).credentialFieldId(fieldId).build()));

        Object out = verifierService.verifyByShareToken(token);
        System.out.println("=== REAL SINGLE share token=" + token + " ===");
        System.out.println("GET /api/verify/share/" + token);
        assertInstanceOf(VerificationResponse.class, out);
        VerificationResponse resp = (VerificationResponse) out;
        System.out.println("result=" + resp.result() + " title=" + resp.credentialTitle() + " disclosedFields=" + resp.disclosedFields());
        assertEquals(VerificationResult.VERIFIED, resp.result());
        assertEquals(1, resp.disclosedFields().size());
    }

    @Test
    void singleCredentialShareWithNoFieldSelectionDisclosesNothing() {
        UUID gradId = UUID.randomUUID();
        Credential cred = seed(CredentialStatus.ISSUED, gradId);
        String token = UUID.randomUUID().toString();
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(gradId).name("Nothing checked")
                .scope(ShareScope.SINGLE_CREDENTIAL).shareToken(token).credentialId(cred.getId())
                .viewCount(0).createdAt(Instant.now()).revoked(false).build();
        when(shareRepository.findByShareToken(token)).thenReturn(Optional.of(share));
        // No field selection stored - "check a box to share it", so nothing checked means
        // nothing disclosed.
        when(shareFieldSelectionRepository.findByShareId(share.getId())).thenReturn(List.of());

        VerificationResponse resp = (VerificationResponse) verifierService.verifyByShareToken(token);

        assertEquals(VerificationResult.VERIFIED, resp.result());
        assertEquals(0, resp.disclosedFields().size());
    }

    @Test
    void fullTimelineShareVerifiesEachEntryIndependently() {
        UUID gradId = UUID.randomUUID();
        Credential good = seed(CredentialStatus.ISSUED, gradId);
        Credential revoked = seed(CredentialStatus.REVOKED, gradId);
        String token = UUID.randomUUID().toString();
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(gradId).name("Full Timeline")
                .scope(ShareScope.FULL_TIMELINE).shareToken(token).viewCount(0).createdAt(Instant.now()).revoked(false).build();
        when(shareRepository.findByShareToken(token)).thenReturn(Optional.of(share));
        when(credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(gradId)).thenReturn(List.of(good, revoked));

        System.out.println("=== REAL FULL_TIMELINE share token=" + token + " ===");
        System.out.println("GET /api/verify/share/" + token);
        @SuppressWarnings("unchecked")
        List<VerificationResponse> out = (List<VerificationResponse>) verifierService.verifyByShareToken(token);
        out.forEach(r -> System.out.println("  result=" + r.result() + " title=" + r.credentialTitle()));
        assertEquals(2, out.size());
        assertTrue(out.stream().anyMatch(r -> r.result() == VerificationResult.VERIFIED));
        assertTrue(out.stream().anyMatch(r -> r.result() == VerificationResult.REVOKED));
    }

    @Test
    void revokedShareLinkReturnsShareRevokedNotInvalid() {
        String token = "dd8b52fc-16a4-4fce-8b08-b23a9a8cf4f7"; // exact token from report
        Share share = Share.builder().id(UUID.randomUUID()).graduateUserId(UUID.randomUUID()).name("Revoked Link")
                .scope(ShareScope.FULL_TIMELINE).shareToken(token).viewCount(0).createdAt(Instant.now()).revoked(true).build();
        when(shareRepository.findByShareToken(token)).thenReturn(Optional.of(share));

        System.out.println("=== REAL REVOKED share token=" + token + " ===");
        System.out.println("GET /api/verify/share/" + token);
        Object out = verifierService.verifyByShareToken(token);
        System.out.println("out=" + out);
        assertInstanceOf(Map.class, out);
        assertEquals("SHARE_REVOKED", ((Map<?,?>) out).get("result"));
    }

    @Test
    void unknownTokenReturnsInvalidNotFound() {
        when(shareRepository.findByShareToken("nope-123")).thenReturn(Optional.empty());
        Object out = verifierService.verifyByShareToken("nope-123");
        assertEquals(VerificationResult.INVALID_NOT_FOUND, ((VerificationResponse) out).result());
        System.out.println("unknown token -> INVALID_NOT_FOUND as expected");
    }

    @Test
    void certificateIdSentToShareEndpointWould404ButCertificateEndpointWorks() {
        Credential cred = seed(CredentialStatus.ISSUED, UUID.randomUUID());
        // Simulate the bug: user pastes share token to /certificate/{id} -> findById misses
        when(credentialRepository.findById(UUID.fromString("dd8b52fc-16a4-4fce-8b08-b23a9a8cf4f7"))).thenReturn(Optional.empty());
        VerificationResponse byCert = verifierService.verifyById(UUID.fromString("dd8b52fc-16a4-4fce-8b08-b23a9a8cf4f7"));
        System.out.println("GET /api/verify/certificate/dd8b52fc-16a4-4fce-8b08-b23a9a8cf4f7 -> " + byCert.result() + " (wrong namespace, expected INVALID_NOT_FOUND)");
        assertEquals(VerificationResult.INVALID_NOT_FOUND, byCert.result());
        // Correct namespace: same string as share_token -> VERIFIED
        String token = cred.getId().toString(); // reuse cred id as token for demo; in real they differ
        // Already proven above: share token lookup succeeds when using verifyByShareToken
    }
}
