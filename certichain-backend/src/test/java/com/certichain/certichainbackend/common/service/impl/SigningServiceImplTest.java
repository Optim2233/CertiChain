package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.SignedCredential;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Interim HMAC signing: determinism, institution-binding, and verify() status precedence. */
class SigningServiceImplTest {

    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final SigningServiceImpl service = new SigningServiceImpl(merkleService, credentialRepository);

    {
        ReflectionTestUtils.setField(service, "hmacSecret", "test-signing-hmac-secret-at-least-32-bytes");
    }

    private final List<Field> fields = List.of(
            new Field("degree", "BSc"), new Field("gpa", "3.9"));

    @Test
    void signatureIsDeterministicForSameRootAndInstitution() {
        UUID inst = UUID.randomUUID();
        SignedCredential a = service.signCredential(fields, inst);
        SignedCredential b = service.signCredential(fields, inst);

        assertEquals(a.merkleRoot(), b.merkleRoot());
        assertEquals(a.signature(), b.signature());
        assertEquals(merkleService.computeRoot(fields), a.merkleRoot());
    }

    @Test
    void differentInstitutionsGetDifferentSignatures() {
        SignedCredential a = service.signCredential(fields, UUID.randomUUID());
        SignedCredential b = service.signCredential(fields, UUID.randomUUID());
        assertNotEquals(a.signature(), b.signature());
    }

    @Test
    void fieldsAreIndexedInInputOrder() {
        SignedCredential signed = service.signCredential(fields, UUID.randomUUID());
        assertEquals(0, signed.fields().get(0).merkleIndex());
        assertEquals(1, signed.fields().get(1).merkleIndex());
        assertEquals("degree", signed.fields().get(0).name());
    }

    // --- verify() ---

    private Credential credentialSignedBy(UUID institutionId, CredentialStatus status) {
        UUID id = UUID.randomUUID();
        SignedCredential signed = service.signCredential(fields, institutionId);
        Credential c = Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(institutionId)
                .graduateEmail("a@x.com").status(status)
                .merkleRoot(signed.merkleRoot()).signature(signed.signature())
                .issuedAt(Instant.now()).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    void verifyReturnsNotFoundForUnknownId() {
        UUID id = UUID.randomUUID();
        when(credentialRepository.findById(id)).thenReturn(Optional.empty());
        assertEquals(VerificationResult.INVALID_NOT_FOUND,
                service.verify(id, Map.of(), List.of()));
    }

    @Test
    void verifyReportsRevokedBeforeCheckingSignature() {
        Credential c = credentialSignedBy(UUID.randomUUID(), CredentialStatus.REVOKED);
        assertEquals(VerificationResult.REVOKED,
                service.verify(c.getId(), Map.of("degree", "BSc"), List.of()));
    }

    @Test
    void verifyRejectsATamperedSignature() {
        Credential c = credentialSignedBy(UUID.randomUUID(), CredentialStatus.ISSUED);
        c.setSignature("forged");
        assertEquals(VerificationResult.INVALID_NOT_FOUND,
                service.verify(c.getId(), Map.of("degree", "BSc"), List.of()));
    }

    @Test
    void verifyAcceptsAGenuineSingleFieldDisclosure() {
        // Single-leaf tree: root == leaf hash, empty proof path reconstructs it directly.
        UUID inst = UUID.randomUUID();
        List<Field> one = List.of(new Field("degree", "BSc"));
        SignedCredential signed = service.signCredential(one, inst);
        UUID id = UUID.randomUUID();
        Credential c = Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(inst)
                .graduateEmail("a@x.com").status(CredentialStatus.ISSUED)
                .merkleRoot(signed.merkleRoot()).signature(signed.signature())
                .issuedAt(Instant.now()).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));

        assertEquals(VerificationResult.VERIFIED,
                service.verify(id, Map.of("degree", "BSc"), List.of()));
    }
}
