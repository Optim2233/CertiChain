package com.certichain.certichainbackend.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** One Sepolia transaction that anchored a ledger chain head on-chain. */
@Entity
@Table(name = "ledger_anchor")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LedgerAnchor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "head_hash", nullable = false, length = 64, unique = true)
    private String headHash;

    /** Chain length at anchor time - context for "how much history does this anchor cover". */
    @Column(name = "entries", nullable = false)
    private long entries;

    @Column(name = "tx_hash", nullable = false, length = 66)
    private String txHash;

    /** Settled block, best-effort: null until the transaction is mined. */
    @Column(name = "block_number")
    private Long blockNumber;

    @Column(name = "anchored_at", nullable = false)
    private Instant anchoredAt;
}
