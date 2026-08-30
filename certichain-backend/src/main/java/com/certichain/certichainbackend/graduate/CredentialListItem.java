package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.time.Instant;
import java.util.UUID;

/**
 * Timeline row for the graduate's credential cards. The bare Credential entity carries
 * neither the credential's title (a credential_field row) nor the issuer's name (a join
 * away), so cards had nothing identifying to show and fell back to the literal word
 * "Certificate" on every one of them. Both are joined in here so the list renders from a
 * single query instead of N per-credential field fetches.
 */
// Records are final, so the Redis cache's default typing skips them and a cached list comes
// back as LinkedHashMaps. Tagging the type here makes the cached value self-describing.
@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@class")
public record CredentialListItem(
        UUID id,
        CredentialType type,
        String title,
        String institutionName,
        String graduateEmail,
        CredentialStatus status,
        String revokeReason,
        String merkleRoot,
        String signature,
        Instant issuedAt,
        Instant expiresAt) {
}
