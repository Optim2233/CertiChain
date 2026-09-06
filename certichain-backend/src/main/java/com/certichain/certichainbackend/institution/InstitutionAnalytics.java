package com.certichain.certichainbackend.institution;

import java.util.List;
import java.util.Map;

public record InstitutionAnalytics(
        int totalIssued,
        int totalVerifications,
        int totalRevokedVerifications,
        int expiringSoon,
        List<DailyCount> issuancesByDay,
        List<DailyCount> verificationsByDay,
        List<DailyCount> revokedVerificationsByDay,
        List<DailyCount> revocationsByDay,
        List<DailyCount> disputesByDay,
        StatusBreakdown status,
        TypeBreakdown byType,
        DisputeSummary disputes,
        List<Bucket> claimLatency,
        List<Bucket> expiryBuckets,
        List<TopCredential> topVerified,
        double verificationYield,
        Map<String, Long> revokeReasonTop
) {
    public record StatusBreakdown(int issued, int revoked, int pendingClaim, int expired) {}
    public record TypeBreakdown(int certificate, int activityRecord) {}
    public record DisputeSummary(int open, int upheld, int dismissed, Double medianResolutionHours) {}
    public record Bucket(String label, int count) {}
    public record TopCredential(String credentialId, String title, long verifications) {}
}
