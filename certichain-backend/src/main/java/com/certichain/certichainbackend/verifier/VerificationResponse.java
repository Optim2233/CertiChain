package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.enums.VerificationResult;

import java.time.Instant;
import java.util.List;

public record VerificationResponse(
        VerificationResult result,
        String credentialTitle,
        String issuedTo,
        String institutionName,
        String institutionStatus,
        Instant issuedAt,
        Instant revokedAt,
        List<DisclosedField> disclosedFields,
        String signatureDetails
) {
    public record DisclosedField(String name, String value) {}
}
