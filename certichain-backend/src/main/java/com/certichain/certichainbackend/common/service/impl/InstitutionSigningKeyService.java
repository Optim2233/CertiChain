package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Per-institution RSA signing keys - the upgrade from the shared-HMAC interim signing
 * previously documented in SigningServiceImpl. A 2048-bit keypair is minted once, at AA
 * approval (AccreditationServiceImpl.approve/reinstate) or by SigningKeyBackfill for
 * institutions approved before this shipped.
 *
 * <p>The public key is safe to expose: it already rides on InstitutionResponse and the
 * public institution directory, so anyone can verify a credential's signature without
 * trusting this backend. The private key is encrypted under the institution's own DEK -
 * same envelope encryption as every other institution secret, so crypto-shredding the
 * DEK also silences that institution's ability to sign anything new.
 */
@Service
@RequiredArgsConstructor
public class InstitutionSigningKeyService {

    public static final String KEY_ALGORITHM = "RSA";
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";
    private static final int RSA_KEY_BITS = 2048;

    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final CredentialFieldCryptoService credentialFieldCryptoService;

    public record GeneratedKeys(String publicKey, String privateKeyEnc) {}

    /**
     * Fresh RSA-2048 keypair. The private key is returned DEK-encrypted in the house
     * format (Base64(iv) + "." + Base64(ciphertext), same as PiiCryptoService) - it never
     * exists in the clear outside this call's locals.
     */
    public GeneratedKeys generate(SecretKey dek) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(KEY_ALGORITHM);
            generator.initialize(RSA_KEY_BITS);
            KeyPair pair = generator.generateKeyPair();

            EncryptedPayload enc = envelopeEncryptionService.encrypt(
                    pair.getPrivate().getEncoded(), dek);
            Base64.Encoder b64 = Base64.getEncoder();
            return new GeneratedKeys(
                    b64.encodeToString(pair.getPublic().getEncoded()),
                    b64.encodeToString(enc.iv()) + "." + b64.encodeToString(enc.ciphertext()));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to generate institution signing keypair", e);
        }
    }

    /** SHA256withRSA signature over {@code data}, Base64. Only called for keyed institutions. */
    public String sign(Institution institution, String data) {
        try {
            SecretKey dek = credentialFieldCryptoService.institutionDek(institution.getId());
            byte[] pkcs8 = envelopeEncryptionService.decrypt(
                    decode(institution.getPrivateKeyEnc()), dek);
            PrivateKey key = KeyFactory.getInstance(KEY_ALGORITHM)
                    .generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
            Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
            sig.initSign(key);
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to sign with institution "
                    + institution.getId() + "'s private key", e);
        }
    }

    /**
     * RSA verification. Returns false, never throws, when the institution has no keys or
     * the signature is malformed - callers fall back to the legacy HMAC check, and a
     * legacy HMAC string is not valid RSA input by construction.
     */
    public boolean verify(Institution institution, String data, String base64Signature) {
        if (institution == null || institution.getPublicKey() == null || base64Signature == null) {
            return false;
        }
        try {
            PublicKey key = KeyFactory.getInstance(KEY_ALGORITHM).generatePublic(
                    new X509EncodedKeySpec(Base64.getDecoder().decode(institution.getPublicKey())));
            Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
            sig.initVerify(key);
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return sig.verify(Base64.getDecoder().decode(base64Signature));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return false;
        }
    }

    /** House ciphertext format: Base64(iv) + "." + Base64(ciphertext). */
    private static EncryptedPayload decode(String stored) {
        int dot = stored.indexOf('.');
        Base64.Decoder b64 = Base64.getDecoder();
        return new EncryptedPayload(
                b64.decode(stored.substring(dot + 1)), b64.decode(stored.substring(0, dot)));
    }
}
