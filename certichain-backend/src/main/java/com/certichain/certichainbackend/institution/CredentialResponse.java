package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Credential;
import java.time.Instant;
import java.util.UUID;

public record CredentialResponse(UUID id, String type, UUID institutionId, UUID graduateUserId,
                                  String graduateEmail, UUID batchId, String batchName, String status, String revokeReason,
                                  Instant revokedAt, String merkleRoot, String signature,
                                  Instant issuedAt, Instant expiresAt, Instant updatedAt, long version) {
    public static CredentialResponse from(Credential e) {
        return new CredentialResponse(e.getId(), e.getType() != null ? e.getType().name() : null,
                e.getInstitutionId(), e.getGraduateUserId(), e.getGraduateEmail(), e.getBatchId(), e.getBatchName(),
                e.getStatus() != null ? e.getStatus().name() : null, e.getRevokeReason(), e.getRevokedAt(),
                e.getMerkleRoot(), e.getSignature(), e.getIssuedAt(), e.getExpiresAt(), e.getUpdatedAt(), e.getVersion());
    }
}
