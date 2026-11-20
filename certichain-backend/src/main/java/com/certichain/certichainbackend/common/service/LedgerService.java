package com.certichain.certichainbackend.common.service;

import com.certichain.certichainbackend.common.enums.LedgerEventType;

import java.util.UUID;

/**
 * The hash-chained append-only event ledger. Each entry's hash covers the previous
 * entry's hash, its payload and its timestamp, and is signed by the issuing
 * institution's key - so any edit to a historical row breaks every hash after it,
 * detectable by {@link #validateChain()}.
 */
public interface LedgerService {

    /**
     * Appends one chain entry inside the caller's transaction. Never updates or deletes:
     * a correction is a new entry.
     */
    void append(LedgerEventType type, UUID credentialId, UUID institutionId, String merkleRoot);

    /**
     * Walks the chain from genesis: recomputes every hash, checks every link, verifies
     * every institution signature. First broken entry is reported by id; the head hash
     * of the intact prefix is what a future external anchor (public testnet) stamps.
     */
    ChainValidation validateChain();

    /**
     * Per-credential provenance for the verify page: the credential's latest ledger
     * event and, when an on-chain anchor covers that entry, the Sepolia tx URL.
     * Null when the credential predates the ledger.
     */
    AnchorInfo anchorInfoFor(UUID credentialId);

    record AnchorInfo(String event, String anchorTxUrl) {}

    /** Public explorer prefix for anchor transactions (Sepolia today). */
    String SEPOLIA_TX_URL_PREFIX = "https://sepolia.etherscan.io/tx/";

    record ChainValidation(boolean valid, long entries, Long brokenAtId, String headHash) {}
}
