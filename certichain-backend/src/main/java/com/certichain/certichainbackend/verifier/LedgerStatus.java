package com.certichain.certichainbackend.verifier;

import java.time.Instant;

/**
 * Public ledger status: chain integrity plus the most recent on-chain anchor.
 * The explorer URL lets anyone confirm the anchored head on Sepolia without
 * trusting this backend at all.
 */
public record LedgerStatus(
        boolean valid,
        long entries,
        Long brokenAtId,
        String headHash,
        String lastAnchorTxHash,
        String lastAnchorHeadHash,
        Instant lastAnchorAt,
        String lastAnchorExplorerUrl) {}
