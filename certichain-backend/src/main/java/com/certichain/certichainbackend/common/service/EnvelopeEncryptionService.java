package com.certichain.certichainbackend.common.service;

import javax.crypto.SecretKey;

/**
 * Envelope encryption primitive: one AES-256-GCM encrypt/decrypt pair, reused for two purposes
 * across the codebase -
 * <ul>
 *   <li>Wrapping a per-institution DEK with the app-wide KEK before storing it
 *       (institution.dek_wrapped / dek_iv).</li>
 *   <li>Encrypting a graduate data field with that institution's (unwrapped) DEK before
 *       storing it (credential_field.field_value + field_value_iv).</li>
 * </ul>
 * "Wrapping" a key and "encrypting" data are the same AES-GCM operation on different bytes -
 * there's deliberately no separate wrap/unwrap method pair here.
 */
public interface EnvelopeEncryptionService {

    /** Encrypts {@code plaintext} under {@code key} with a freshly generated random IV. */
    EncryptedPayload encrypt(byte[] plaintext, SecretKey key);

    /**
     * Decrypts a payload produced by {@link #encrypt}. Throws if {@code key} is wrong or the
     * ciphertext/IV was tampered with - GCM's auth tag makes this detectable rather than
     * silently returning garbage.
     */
    byte[] decrypt(EncryptedPayload payload, SecretKey key);

    /** Generates a new random AES-256 key - used to mint a fresh DEK per institution. */
    SecretKey generateDek();

    /** The single app-wide Key Encryption Key, loaded from {@code certichain.encryption.kek}. */
    SecretKey kek();
}
