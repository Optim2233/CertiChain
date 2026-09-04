package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;

import java.time.Instant;
import java.util.UUID;

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
        Instant expiresAt,
        String institutionBrandColor,
        String institutionSecondaryBrandColor,
        String institutionLogoUrl,
        String institutionAccentPattern,
        String institutionAccentColor,
        Integer institutionWatermarkOpacity,
        String institutionPatternScale,
        String institutionCardRadius,
        String institutionTitleFont,
        String institutionLogoShape,
        String institutionMedalStyle,
        String institutionMedalShape,
        String institutionMedalPosition,
        String institutionMedalIcon,
        String institutionMedalSize,
        String institutionWatermarkIcon) {
}
