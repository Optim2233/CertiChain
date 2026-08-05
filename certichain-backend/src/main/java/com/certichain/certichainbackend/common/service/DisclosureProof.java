package com.certichain.certichainbackend.common.service;

import java.util.List;

public record DisclosureProof(
        String merkleRoot,
        List<DisclosedField> disclosedFields,
        List<ProofStep> proofPath
) {
    public record DisclosedField(String fieldName, String fieldValue, int merkleIndex) {}
    public record ProofStep(String siblingHash, boolean isLeft) {}
}
