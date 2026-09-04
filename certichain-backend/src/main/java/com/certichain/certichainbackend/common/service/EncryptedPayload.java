package com.certichain.certichainbackend.common.service;

/**
 * Result of one AES-GCM encryption: the ciphertext (which already has the 16-byte auth tag
 * appended by {@link javax.crypto.Cipher#doFinal}) plus the IV that produced it. The IV isn't
 * secret - it just has to be unique per encryption under the same key, and the decrypting side
 * needs the exact same one, so it's stored alongside the ciphertext rather than derived.
 */
public record EncryptedPayload(byte[] ciphertext, byte[] iv) {}
