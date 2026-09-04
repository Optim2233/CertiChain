package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Institution;
import java.time.Instant;
import java.util.UUID;

public record InstitutionResponse(UUID id, String name, String ministry, String status, String statusReason,
                                   Instant appliedAt, Instant decidedAt, String publicKey, String keyAlgorithm,
                                   Instant keyGeneratedAt, String phone, String website, String profileImageUrl,
                                   String brandColor, String accentPattern,
                                   String secondaryBrandColor, String accentColor, Integer watermarkOpacity,
                                   String patternScale, String cardRadius, String titleFont, String logoShape,
                                   String medalStyle, String medalShape, String medalPosition, String medalIcon,
                                   String medalSize, String watermarkIcon,
                                   Instant updatedAt, long version) {
    public static InstitutionResponse from(Institution e) {
        return new InstitutionResponse(e.getId(), e.getName(), e.getMinistry(),
                e.getStatus() != null ? e.getStatus().name() : null, e.getStatusReason(),
                e.getAppliedAt(), e.getDecidedAt(), e.getPublicKey(), e.getKeyAlgorithm(),
                e.getKeyGeneratedAt(), e.getPhone(), e.getWebsite(), e.getProfileImageUrl(),
                e.getBrandColor(), e.getAccentPattern(),
                e.getSecondaryBrandColor(), e.getAccentColor(), e.getWatermarkOpacity(),
                e.getPatternScale(), e.getCardRadius(), e.getTitleFont(), e.getLogoShape(),
                e.getMedalStyle(), e.getMedalShape(), e.getMedalPosition(), e.getMedalIcon(),
                e.getMedalSize(), e.getWatermarkIcon(),
                e.getUpdatedAt(), e.getVersion());
    }
}
