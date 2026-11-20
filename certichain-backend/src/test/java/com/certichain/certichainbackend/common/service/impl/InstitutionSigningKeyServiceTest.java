package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.InstitutionSigningKeyService.GeneratedKeys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RSA keypair generation, sign, and verify round-trip - real crypto, mocked DEK lookup. */
class InstitutionSigningKeyServiceTest {

    private final EnvelopeEncryptionService envelope =
            new EnvelopeEncryptionServiceImpl("A".repeat(32));
    private final CredentialFieldCryptoService credentialFieldCryptoService =
            mock(CredentialFieldCryptoService.class);
    private final InstitutionSigningKeyService service =
            new InstitutionSigningKeyService(envelope, credentialFieldCryptoService);

    private Institution keyedInstitution() {
        SecretKey dek = envelope.generateDek();
        GeneratedKeys keys = service.generate(dek);
        UUID id = UUID.randomUUID();
        // Per-ID stub so multiple keyed institutions each decrypt with their own DEK.
        when(credentialFieldCryptoService.institutionDek(id)).thenReturn(dek);
        return Institution.builder().id(id)
                .publicKey(keys.publicKey()).privateKeyEnc(keys.privateKeyEnc()).build();
    }

    @Test
    void generatedKeysAreDistinctPerInstitution() {
        SecretKey dek = envelope.generateDek();
        GeneratedKeys a = service.generate(dek);
        GeneratedKeys b = service.generate(dek);
        assertNotEquals(a.publicKey(), b.publicKey());
        assertEquals("RSA", InstitutionSigningKeyService.KEY_ALGORITHM);
    }

    @Test
    void signVerifyRoundTrip() {
        Institution inst = keyedInstitution();
        String signature = service.sign(inst, "merkle-root");

        assertTrue(service.verify(inst, "merkle-root", signature));
        // Tampered data or signature fails.
        assertFalse(service.verify(inst, "tampered-root", signature));
        assertFalse(service.verify(inst, "merkle-root", "forged"));
        assertFalse(service.verify(inst, "merkle-root", null));
    }

    @Test
    void anotherInstitutionsKeyDoesNotVerifyThisSignature() {
        Institution inst = keyedInstitution();
        Institution other = keyedInstitution();
        String signature = service.sign(inst, "merkle-root");

        assertFalse(service.verify(other, "merkle-root", signature));
    }

    @Test
    void keylessInstitutionFailsClosed() {
        Institution keyless = Institution.builder().id(UUID.randomUUID()).build();
        assertFalse(service.verify(keyless, "merkle-root", "anything"));
        assertFalse(service.verify(null, "merkle-root", "anything"));
    }
}
