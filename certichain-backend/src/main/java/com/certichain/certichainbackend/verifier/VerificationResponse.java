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
        String institutionWatermarkIcon,
        // Per-credential ledger provenance: the credential's latest chain event
        // (ISSUED/AMENDED/REVOKED/RESTORED) and, when an on-chain anchor covers that
        // entry, the Sepolia transaction URL. Both null for credentials that predate
        // the ledger - the frontend hides the line entirely for those.
        String ledgerEvent,
        String ledgerAnchorTxUrl
) {
    public record DisclosedField(String name, String value) {}
}
