package com.certichain.certichainbackend.common.service;

import com.certichain.certichainbackend.common.enums.VerificationResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface SigningService {
    SignedCredential signCredential(List<Field> fields, UUID institutionId);

    VerificationResult verify(UUID credentialId, Map<String, String> disclosedFields,
                               List<DisclosureProof.ProofStep> proofPath);
}
