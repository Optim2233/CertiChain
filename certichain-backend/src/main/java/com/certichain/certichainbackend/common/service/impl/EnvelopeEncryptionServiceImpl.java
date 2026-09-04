package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * AES-256-GCM envelope encryption. See {@link EnvelopeEncryptionService} for why wrap and
 * encrypt share one implementation.
 *
 * ponytail: the KEK here is a UTF-8 property value from .env, same interim approach as
 * {@code certichain.signing.interim-hmac-secret} - a real deployment would pull this from a
 * KMS/secrets manager instead. Called out explicitly per the feature spec's own limitation
 * note; not solved here.
 */
@Service
public class EnvelopeEncryptionServiceImpl implements EnvelopeEncryptionService {

    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;   // NIST-recommended GCM nonce size
    private static final int GCM_TAG_LENGTH_BITS = 128;  // appended to ciphertext by doFinal()
    private static final int AES_KEY_LENGTH_BYTES = 32;  // AES-256

    private final SecureRandom secureRandom = new SecureRandom();
    private final SecretKey kek;

    public EnvelopeEncryptionServiceImpl(@Value("${certichain.encryption.kek}") String kekValue) {
        byte[] kekBytes = kekValue.getBytes(StandardCharsets.UTF_8);
        if (kekBytes.length != AES_KEY_LENGTH_BYTES) {
            // Fail loudly at startup - a wrong-length key would otherwise surface as a cryptic
            // InvalidKeyException the first time something tries to encrypt.
            throw new IllegalStateException(
                    "certichain.encryption.kek must be exactly " + AES_KEY_LENGTH_BYTES
                            + " UTF-8 bytes for AES-256, got " + kekBytes.length);
        }
        this.kek = new SecretKeySpec(kekBytes, "AES");
    }

    @Override
    public SecretKey kek() {
        return kek;
    }

    @Override
    public SecretKey generateDek() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
            keyGenerator.init(AES_KEY_LENGTH_BYTES * 8, secureRandom);
            return keyGenerator.generateKey();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate DEK", e);
        }
    }

    @Override
    public EncryptedPayload encrypt(byte[] plaintext, SecretKey key) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext);

            return new EncryptedPayload(ciphertext, iv);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    @Override
    public byte[] decrypt(EncryptedPayload payload, SecretKey key) {
        try {
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, payload.iv()));
            return cipher.doFinal(payload.ciphertext());
        } catch (Exception e) {
            // Covers both a wrong key and a tampered ciphertext/IV - GCM's auth tag check
            // fails the same way (AEADBadTagException) for either, which is the point.
            throw new IllegalStateException("Decryption failed - wrong key or tampered data", e);
        }
    }
}
