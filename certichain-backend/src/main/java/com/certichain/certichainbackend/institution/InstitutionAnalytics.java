package com.certichain.certichainbackend.institution;

import java.util.List;

/** Institution analytics dashboard: totals plus daily trend buckets for the last N days. */
public record InstitutionAnalytics(
        int totalIssued,
        int totalVerifications,
        int expiringSoon,
        List<DailyCount> issuancesByDay,
        List<DailyCount> verificationsByDay
) {}
