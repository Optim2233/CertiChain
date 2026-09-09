package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Institution;
import java.time.Instant;
import java.util.UUID;

/**
 * The unauthenticated directory row (`GET /api/verify/institutions`). Deliberately
 * narrower than {@link InstitutionResponse}: only fields that survive
 * PiiCryptoService#publicDirectoryCopy, and no keys/branding the directory
 * has no use for.
 */
public record PublicInstitutionResponse(UUID id, String name, String ministry, String status,
                                        String institutionType, String stateRegion, String district,
                                        Instant decidedAt, String website, String profileImageUrl,
                                        String brandColor) {
    public static PublicInstitutionResponse from(Institution e) {
        return new PublicInstitutionResponse(e.getId(), e.getName(), e.getMinistry(),
                e.getStatus() != null ? e.getStatus().name() : null,
                e.getInstitutionType(), e.getStateRegion(), e.getDistrict(),
                e.getDecidedAt(), e.getWebsite(), e.getProfileImageUrl(), e.getBrandColor());
    }
}
