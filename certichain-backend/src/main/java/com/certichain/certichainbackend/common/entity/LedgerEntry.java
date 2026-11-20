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
import java.util.UUID;

/**
 * One append-only chain link. {@code hash} covers previousHash + payload + createdAt,
 * so editing any stored field breaks every hash after it. {@code signature} is the
 * issuing institution's signature over the hash (per-institution RSA, or the legacy
 * shared-HMAC for entries from institutions predating per-institution keys). Never
 * updated or deleted - a correction is a new entry.
 */
@Entity
@Table(name = "ledger_entry")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "previous_hash", nullable = false, length = 64)
    private String previousHash;

    @Column(name = "hash", nullable = false, length = 64, unique = true)
    private String hash;

    @Column(name = "event_type", nullable = false, length = 20)
    private String eventType;

    @Column(name = "credential_id", nullable = false)
    private UUID credentialId;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    /**
     * PII-free JSON: the event type, credentialId and merkleRoot only. The event type
     * lives inside the hashed material (not just the column) so flipping e.g. ISSUED
     * to REVOKED directly in the DB is detectable by recomputation.
     */
    @Column(name = "payload", nullable = false, columnDefinition = "text")
    private String payload;

    @Column(name = "signature", nullable = false, columnDefinition = "text")
    private String signature;

    /** Millis precision: the hashed material must round-trip through Postgres exactly. */
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
