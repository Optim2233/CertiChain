package com.certichain.certichainbackend.common.service;

import com.certichain.certichainbackend.common.enums.VerificationResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface SigningService {
    SignedCredential signCredential(List<Field> fields, UUID institutionId);

    VerificationResult verify(UUID credentialId, Map<String, String> disclosedFields,
                               List<DisclosureProof.ProofStep> proofPath);

    /**
     * Signs arbitrary material (the ledger chain-link hash) with the institution's own
     * RSA key, or the legacy shared-HMAC while keyless institutions exist. Mirrors
     * {@link #signCredential}'s fallback so chain entries and credentials stay
     * verifiable by the same {@link #signatureValid} check.
     */
    String sign(String data, UUID institutionId);

    /**
     * Full signature check for a stored credential: per-institution RSA when the issuer
     * has keys, legacy shared-HMAC otherwise (credentials issued before per-institution
     * signing shipped). False means the signature is forged or the row was tampered with.
     */
    boolean signatureValid(UUID institutionId, String merkleRoot, String signature);
}
