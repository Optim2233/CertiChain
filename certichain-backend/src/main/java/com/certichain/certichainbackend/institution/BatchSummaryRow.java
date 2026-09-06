package com.certichain.certichainbackend.institution;

import java.time.Instant;
import java.util.UUID;

// One row per batch upload on the institution's Batches page. Spring Data projection -
// populated by CredentialRepository.findBatchSummaries.
public interface BatchSummaryRow {
    UUID getBatchId();

    Instant getIssuedAt();

    long getTotal();

    long getRevoked();
}
