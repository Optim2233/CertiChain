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

    /** Copy with an already-decrypted title - the {@code title} slot is the only field
     *  the record ever ships in encrypted form. */
    public CredentialListItem withTitle(String replacement) {
        return new CredentialListItem(id, type, replacement, institutionName, graduateEmail, status,
                revokeReason, merkleRoot, signature, issuedAt, expiresAt,
                institutionBrandColor, institutionSecondaryBrandColor, institutionLogoUrl,
                institutionAccentPattern, institutionAccentColor, institutionWatermarkOpacity,
                institutionPatternScale, institutionCardRadius, institutionTitleFont,
                institutionLogoShape, institutionMedalStyle, institutionMedalShape,
                institutionMedalPosition, institutionMedalIcon, institutionMedalSize,
                institutionWatermarkIcon);
    }
}
