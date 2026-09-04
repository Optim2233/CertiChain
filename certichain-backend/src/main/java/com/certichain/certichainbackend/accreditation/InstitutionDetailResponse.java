package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.common.enums.InstitutionStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Full institution record for the AA detail page. A record rather than the raw
 * Institution entity because contact email lives on the User row - something has
 * to join the two - and because a record has no privateKeyEnc field to leak.
 * Cache-safe: records survive the Redis JSON round trip (see InstitutionDocumentResponse).
 */
public record InstitutionDetailResponse(
        UUID id, String name, String ministry, InstitutionStatus status,
        String statusReason, Instant appliedAt, Instant decidedAt,
        String publicKey, String keyAlgorithm, Instant keyGeneratedAt,
        String phone, String website, String profileImageUrl,
        String brandColor, String accentPattern,
        Instant updatedAt, long version,
        String contactEmail, Instant contactSince
) {}
