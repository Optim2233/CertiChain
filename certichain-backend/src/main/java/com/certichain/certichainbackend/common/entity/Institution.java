package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "institution")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String ministry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstitutionStatus status;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    /** Institution's signing public key. Null until the AA approves the institution. */
    @Column(name = "public_key", columnDefinition = "text")
    private String publicKey;

    /**
     * Encrypted private key — never stored as raw PKCS#8, and never
     * serialized out over HTTP either: every endpoint that returns
     * Institution directly (including the unauthenticated
     * /api/verify/institutions directory) would otherwise leak this to
     * whoever called it. Backend-internal use only (signing service).
     */
    @JsonIgnore
    @Column(name = "private_key_enc", columnDefinition = "text")
    private String privateKeyEnc;

    @Column(name = "key_algorithm", length = 20)
    private String keyAlgorithm;

    @Column(name = "key_generated_at")
    private Instant keyGeneratedAt;

    /**
     * This institution's Data Encryption Key (DEK), itself encrypted ("wrapped") with the
     * app-wide KEK - see EnvelopeEncryptionService. Same never-serialize rule as
     * privateKeyEnc: backend-internal use only.
     */
    @JsonIgnore
    @Column(name = "dek_wrapped")
    private byte[] dekWrapped;

    @JsonIgnore
    @Column(name = "dek_iv")
    private byte[] dekIv;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private long version = 0;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
