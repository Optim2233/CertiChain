package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.SignedCredential;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Per-institution RSA signing with legacy-HMAC fallback: determinism, institution
 * binding, RSA round-trip, and verify() status precedence.
 */
class SigningServiceImplTest {

    private static final String HMAC_SECRET = "test-signing-hmac-secret-at-least-32-bytes";

    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final InstitutionSigningKeyService signingKeyService = mock(InstitutionSigningKeyService.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
    private final SigningServiceImpl service = new SigningServiceImpl(
            merkleService, credentialRepository, institutionRepository, signingKeyService);

    {
        ReflectionTestUtils.setField(service, "hmacSecret", HMAC_SECRET);
    }

    private final List<Field> fields = List.of(
            new Field("degree", "BSc"), new Field("gpa", "3.9"));

    // --- legacy HMAC path (keyless institutions) ---

    @Test
    void legacySignatureIsDeterministicForSameRootAndInstitution() {
        UUID inst = UUID.randomUUID();
        SignedCredential a = service.signCredential(fields, inst);
        SignedCredential b = service.signCredential(fields, inst);

        assertEquals(a.merkleRoot(), b.merkleRoot());
        assertEquals(a.signature(), b.signature());
        assertEquals(merkleService.computeRoot(fields), a.merkleRoot());
    }

    @Test
    void differentInstitutionsGetDifferentLegacySignatures() {
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

    @Test
    void legacyHmacCredentialStillValidatesForKeylessInstitution() {
        UUID inst = UUID.randomUUID();
        SignedCredential signed = service.signCredential(fields, inst);
        assertTrue(service.signatureValid(inst, signed.merkleRoot(), signed.signature()));
        assertFalse(service.signatureValid(inst, signed.merkleRoot(), "forged"));
        assertFalse(service.signatureValid(inst, signed.merkleRoot(), null));
    }

    // --- per-institution RSA path (real crypto end to end) ---

    /**
     * Real envelope crypto + real key service: a keyed institution signs RSA, the
     * signature validates against its own public key, and the legacy HMAC of the same
     * root (a pre-keys credential of that same institution) still validates too.
     */
    @Test
    void keyedInstitutionSignsRsaAndValidatesWithFallback() {
        EnvelopeEncryptionServiceImpl envelope = new EnvelopeEncryptionServiceImpl("A".repeat(32));
        CredentialFieldCryptoService credFieldCrypto = mock(CredentialFieldCryptoService.class);
        InstitutionSigningKeyService realKeys =
                new InstitutionSigningKeyService(envelope, credFieldCrypto);
        SigningServiceImpl rsaService = new SigningServiceImpl(
                merkleService, credentialRepository, institutionRepository, realKeys);
        ReflectionTestUtils.setField(rsaService, "hmacSecret", HMAC_SECRET);

        javax.crypto.SecretKey dek = envelope.generateDek();
        when(credFieldCrypto.institutionDek(any())).thenReturn(dek);
        InstitutionSigningKeyService.GeneratedKeys keys = realKeys.generate(dek);
        UUID inst = UUID.randomUUID();
        when(institutionRepository.findById(inst)).thenReturn(Optional.of(Institution.builder()
                .id(inst).publicKey(keys.publicKey()).privateKeyEnc(keys.privateKeyEnc()).build()));

        SignedCredential signed = rsaService.signCredential(fields, inst);
        // RSA path: valid with the institution's key, invalid for tampered data/signature.
        assertTrue(rsaService.signatureValid(inst, signed.merkleRoot(), signed.signature()));
        assertFalse(rsaService.signatureValid(inst, "tampered-root", signed.signature()));
        assertFalse(rsaService.signatureValid(inst, signed.merkleRoot(), "forged"));
        // Legacy fallback: a pre-keys credential of this same institution (HMAC-signed
        // root) still validates even though the institution now has RSA keys.
        String legacySignature = hmac(HMAC_SECRET, signed.merkleRoot() + "|" + inst);
        assertTrue(rsaService.signatureValid(inst, signed.merkleRoot(), legacySignature));
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

    private static String hmac(String secret, String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
