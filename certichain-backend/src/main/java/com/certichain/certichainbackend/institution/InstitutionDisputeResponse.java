package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.DisputeStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * A DisputeFlag enriched with the disputed credential's title + type and the
 * graduate's email. The raw flag only stores UUIDs, which are meaningless to a
 * registrar scanning the disputes table. Plain record so it survives the Redis
 * cache round trip.
 */
public record InstitutionDisputeResponse(
        UUID id,
        UUID credentialId,
        String credentialTitle,
        CredentialType credentialType,
        String graduateEmail,
        String reason,
        DisputeStatus status,
        String resolutionNote,
        Instant createdAt,
        Instant resolvedAt) {}
