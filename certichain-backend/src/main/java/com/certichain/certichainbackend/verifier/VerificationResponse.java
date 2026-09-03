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
        Instant expiresAt,
        Instant revokedAt,
        String revokeReason,
        List<DisclosedField> disclosedFields,
        String signatureDetails,
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
        String institutionMedalSize,
        String institutionWatermarkIcon
) {
    public record DisclosedField(String name, String value) {}
}
