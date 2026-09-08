package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.service.EncryptedPayload;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Pure algorithm test - no Spring context, no DB, no KMS. */
class EnvelopeEncryptionServiceImplTest {

    // Exactly 32 ASCII chars = 32 UTF-8 bytes, satisfying the constructor's AES-256 check.
    private final EnvelopeEncryptionServiceImpl service =
            new EnvelopeEncryptionServiceImpl("A".repeat(32));

    @Test
    void encryptThenDecryptRecoversTheOriginalPlaintext() {
        byte[] plaintext = "Bachelor of Science in Computer Science".getBytes(StandardCharsets.UTF_8);
        SecretKey dek = service.generateDek();

        EncryptedPayload payload = service.encrypt(plaintext, dek);
        byte[] recovered = service.decrypt(payload, dek);

        assertArrayEquals(plaintext, recovered);
    }

    @Test
    void twoEncryptionsOfTheSamePlaintextProduceDifferentCiphertextAndIv() {
        byte[] plaintext = "same value both times".getBytes(StandardCharsets.UTF_8);
        SecretKey dek = service.generateDek();

        EncryptedPayload first = service.encrypt(plaintext, dek);
        EncryptedPayload second = service.encrypt(plaintext, dek);

        // A fresh random IV per call means ciphertext never repeats even for identical
        // plaintext - the whole point of never reusing an IV under the same key.
        assertNotEquals(Arrays.toString(first.iv()), Arrays.toString(second.iv()));
        assertNotEquals(Arrays.toString(first.ciphertext()), Arrays.toString(second.ciphertext()));
    }

    @Test
    void decryptingWithTheWrongKeyFails() {
        byte[] plaintext = "sensitive graduate data".getBytes(StandardCharsets.UTF_8);
        SecretKey correctKey = service.generateDek();
        SecretKey wrongKey = service.generateDek();

        EncryptedPayload payload = service.encrypt(plaintext, correctKey);

        // GCM's auth tag check fails closed rather than returning garbage bytes.
        assertThrows(IllegalStateException.class, () -> service.decrypt(payload, wrongKey));
    }

    @Test
    void wrappingADekWithTheKekRoundTrips() {
        // The same encrypt/decrypt pair used for data also wraps a DEK with the KEK -
        // "wrapping" is just encrypting a key's raw bytes instead of a field's plaintext.
        SecretKey dek = service.generateDek();

        EncryptedPayload wrapped = service.encrypt(dek.getEncoded(), service.kek());
        byte[] unwrapped = service.decrypt(wrapped, service.kek());

        assertArrayEquals(dek.getEncoded(), unwrapped);
    }

    @Test
    void constructorRejectsAKekOfTheWrongLength() {
        assertThrows(IllegalStateException.class,
                () -> new EnvelopeEncryptionServiceImpl("too-short"));
    }

    @Test
    void generateDekProducesDistinctKeysEachTime() {
        SecretKey first = service.generateDek();
        SecretKey second = service.generateDek();
        assertNotEquals(Arrays.toString(first.getEncoded()), Arrays.toString(second.getEncoded()));
        assertEquals(32, first.getEncoded().length);
    }
}
