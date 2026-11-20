package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.DisclosureProof;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.MerkleService;
import com.certichain.certichainbackend.common.service.SignedCredential;
import com.certichain.certichainbackend.common.service.SigningService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Credential signing with per-institution RSA keys, plus a legacy shared-HMAC fallback.
 *
 * <p>The Merkle root computation delegated to {@link MerkleServiceImpl} is real and
 * unchanged. Signing is now asymmetric: at AA approval each institution gets an RSA-2048
 * keypair (see {@link InstitutionSigningKeyService}); the merkle root is signed with that
 * institution's private key and verifiable by anyone against its published public key.
 * The signature proves "issued by this institution", not "issued by this backend".
 *
 * <p>Credentials issued before this shipped still carry the old shared-HMAC signature,
 * so both {@link #signCredential} and {@link #signatureValid} keep the HMAC path:
 * keyless institutions sign the legacy way, and verification accepts either a valid
 * RSA signature or the matching legacy HMAC. Once every environment has run
 * SigningKeyBackfill the HMAC path is reachability-dead, but it stays until then so no
 * existing credential stops verifying.
 */
@Service
@RequiredArgsConstructor
public class SigningServiceImpl implements SigningService {

    private final MerkleService merkleService;
    private final CredentialRepository credentialRepository;
    private final InstitutionRepository institutionRepository;
    private final InstitutionSigningKeyService signingKeyService;

    @Value("${certichain.signing.interim-hmac-secret}")
    private String hmacSecret;

    @Override
    public SignedCredential signCredential(List<Field> fields, UUID institutionId) {
        List<SignedCredential.FieldWithIndex> indexed = new ArrayList<>();
        for (int i = 0; i < fields.size(); i++) {
            Field f = fields.get(i);
            indexed.add(new SignedCredential.FieldWithIndex(f.name(), f.value(), i));
        }

        String root = merkleService.computeRoot(fields);
        // Per-institution RSA when the issuer has keys; legacy shared HMAC for the
        // keyless window between this upgrade and SigningKeyBackfill having run.
        Institution institution = institutionRepository.findById(institutionId).orElse(null);
        String signature = institution != null && institution.getPublicKey() != null
                ? signingKeyService.sign(institution, root)
                : hmac(root + "|" + institutionId);
        return new SignedCredential(root, signature, indexed);
    }

    @Override
    public VerificationResult verify(UUID credentialId, Map<String, String> disclosedFields,
                                      List<DisclosureProof.ProofStep> proofPath) {
        Optional<Credential> credentialOpt = credentialRepository.findById(credentialId);
        if (credentialOpt.isEmpty()) {
            return VerificationResult.INVALID_NOT_FOUND;
        }

        Credential credential = credentialOpt.get();
        if (credential.getStatus() == CredentialStatus.REVOKED) {
            return VerificationResult.REVOKED;
        }

        if (!signatureValid(credential.getInstitutionId(), credential.getMerkleRoot(),
                credential.getSignature())) {
            return VerificationResult.INVALID_NOT_FOUND;
        }

        List<DisclosureProof.DisclosedField> disclosed = disclosedFields.entrySet().stream()
                .map(e -> new DisclosureProof.DisclosedField(e.getKey(), e.getValue(), 0))
                .toList();
        DisclosureProof proof = new DisclosureProof(credential.getMerkleRoot(), disclosed, proofPath);

        boolean valid = merkleService.verifyDisclosure(credential.getMerkleRoot(), proof);
        return valid ? VerificationResult.VERIFIED : VerificationResult.INVALID_NOT_FOUND;
    }

    @Override
    public String sign(String data, UUID institutionId) {
        Institution institution = institutionRepository.findById(institutionId).orElse(null);
        return institution != null && institution.getPublicKey() != null
                ? signingKeyService.sign(institution, data)
                : hmac(data + "|" + institutionId);
    }

    @Override
    public boolean signatureValid(UUID institutionId, String merkleRoot, String signature) {
        if (merkleRoot == null || signature == null) {
            return false;
        }
        // RSA first when the issuer has keys; the HMAC fallback also covers a keyed
        // institution's credentials issued before its keys existed.
        Institution institution = institutionRepository.findById(institutionId).orElse(null);
        if (institution != null && signingKeyService.verify(institution, merkleRoot, signature)) {
            return true;
        }
        return hmac(merkleRoot + "|" + institutionId).equals(signature);
    }

    private String hmac(String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC signature", e);
        }
    }
}
