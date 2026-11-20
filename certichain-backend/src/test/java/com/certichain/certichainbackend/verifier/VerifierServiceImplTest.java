package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.SigningService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.MerkleServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Uses the REAL MerkleServiceImpl so the root comparison is genuine, not a stubbed boolean.
 * credentialFieldCryptoService is stubbed as a passthrough (returns its input unchanged) -
 * these tests seed plaintext field values directly and are about verification logic, not
 * encryption, which EnvelopeEncryptionServiceImplTest already covers on its own.
 */
class VerifierServiceImplTest {

    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final CredentialFieldCryptoService credentialFieldCryptoService = mock(CredentialFieldCryptoService.class);
    private final SigningService signingService = mock(SigningService.class);

    private final VerifierServiceImpl service = new VerifierServiceImpl(
            credentialRepository, credentialFieldRepository, institutionRepository,
            null, null, merkleService, signingService,
            mock(com.certichain.certichainbackend.common.service.LedgerService.class),
            mock(com.certichain.certichainbackend.common.repository.LedgerAnchorRepository.class),
            auditLogService, null, credentialFieldCryptoService,
            com.certichain.certichainbackend.support.TestCrypto.pii());

    {
        when(credentialFieldCryptoService.decrypted(anyList(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        // Seeded credentials carry opaque "sig" strings - the signature logic itself is
        // SigningServiceImplTest's job; here it must just not block the flow under test.
        when(signingService.signatureValid(any(), any(), any())).thenReturn(true);
    }

    private final List<Field> fields = List.of(
            new Field("degree", "BSc Computer Science"),
            new Field("gpa", "3.9"));

    /** Builds a credential whose stored merkle root genuinely matches its stored fields. */
    private Credential seedCredential(CredentialStatus status, InstitutionStatus institutionStatus) {
        UUID credentialId = UUID.randomUUID();
        UUID institutionId = UUID.randomUUID();

        Credential credential = Credential.builder()
                .id(credentialId)
                .type(CredentialType.CERTIFICATE)
                .institutionId(institutionId)
                .graduateEmail("alice@example.com")
                .status(status)
                .merkleRoot(merkleService.computeRoot(fields))
                .signature("sig")
                .issuedAt(Instant.now())
                .build();

        when(credentialRepository.findById(credentialId)).thenReturn(Optional.of(credential));
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId))
                .thenReturn(List.of(
                        CredentialField.builder().id(UUID.randomUUID()).credentialId(credentialId)
                                .fieldName("degree").fieldValue("BSc Computer Science").merkleIndex(0).build(),
                        CredentialField.builder().id(UUID.randomUUID()).credentialId(credentialId)
                                .fieldName("gpa").fieldValue("3.9").merkleIndex(1).build()));
        when(institutionRepository.findById(institutionId)).thenReturn(Optional.of(
                Institution.builder().id(institutionId).name("UIT").ministry("MoST")
                        .status(institutionStatus).appliedAt(Instant.now()).build()));
        return credential;
    }

    @Test
    void intactCredentialVerifies() {
        Credential credential = seedCredential(CredentialStatus.ISSUED, InstitutionStatus.APPROVED);

        VerificationResponse response = service.verifyById(credential.getId());

        assertEquals(VerificationResult.VERIFIED, response.result());
        assertEquals("BSc Computer Science", response.credentialTitle());
        assertEquals("UIT", response.institutionName());
        assertEquals(2, response.disclosedFields().size());
    }

    @Test
    void revokedCredentialWithAPerfectlyValidSignatureStillReadsRevoked() {
        // The signature on a revoked credential is still cryptographically valid. If the
        // signature check ran first this would come back VERIFIED, which would let a revoked
        // certificate pass verification - the single worst bug this system could have.
        Credential credential = seedCredential(CredentialStatus.REVOKED, InstitutionStatus.APPROVED);

        VerificationResponse response = service.verifyById(credential.getId());

        assertEquals(VerificationResult.REVOKED, response.result());
        assertEquals("UIT", response.institutionName());
    }

    @Test
    void tamperedFieldValueFailsVerification() {
        Credential credential = seedCredential(CredentialStatus.ISSUED, InstitutionStatus.APPROVED);
        // Someone edits a GPA directly in the database; the stored root no longer matches.
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId()))
                .thenReturn(List.of(
                        CredentialField.builder().id(UUID.randomUUID()).credentialId(credential.getId())
                                .fieldName("degree").fieldValue("BSc Computer Science").merkleIndex(0).build(),
                        CredentialField.builder().id(UUID.randomUUID()).credentialId(credential.getId())
                                .fieldName("gpa").fieldValue("4.0").merkleIndex(1).build()));

        assertEquals(VerificationResult.INVALID_NOT_FOUND,
                service.verifyById(credential.getId()).result());
    }

    @Test
    void unknownIdIsAResultNotAnException() {
        UUID unknown = UUID.randomUUID();
        when(credentialRepository.findById(unknown)).thenReturn(Optional.empty());

        VerificationResponse response = service.verifyById(unknown);

        assertEquals(VerificationResult.INVALID_NOT_FOUND, response.result());
        assertTrue(response.disclosedFields().isEmpty());
        // Nothing to log: a lookup miss is not a verification event.
        verify(auditLogService, never()).log(any(), any(), any(), any());
    }

    @Test
    void successfulLookupIsAuditedWithNoActor() {
        Credential credential = seedCredential(CredentialStatus.ISSUED, InstitutionStatus.APPROVED);

        service.verifyById(credential.getId());

        // null actor: there is deliberately no verifier identity to record.
        verify(auditLogService).log(
                "Certificate verified (view-only, no personal data shown)",
                null, credential.getInstitutionId(), credential.getId());
    }

    @Test
    void publicDirectoryShowsApprovedAndSuspendedOnly() {
        service.publicInstitutionDirectory();

        // Confirmed product decision: suspended institutions stay visible (dimmed), only
        // PENDING/REJECTED/REVOKED are hidden.
        verify(institutionRepository).findByStatusInOrderByNameAsc(
                List.of(InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED));
    }
}
