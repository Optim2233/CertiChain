package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "credential")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Credential {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CredentialType type;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "graduate_user_id")
    private UUID graduateUserId;

    @Column(name = "graduate_email", nullable = false)
    private String graduateEmail;

    /** Hex HMAC-SHA256 of the normalized graduate email - exact-match lookups on encrypted emails. */
    @Column(name = "graduate_email_hmac", length = 64)
    private String graduateEmailHmac;

    /** Set only for credentials created by one batch upload; null for single issuance. */
    @Column(name = "batch_id")
    private UUID batchId;

    /** Optional label the institution gave the batch at upload time (e.g. "Fall 2026 Cohort"). */
    @Column(name = "batch_name")
    private String batchName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CredentialStatus status;

    @Column(name = "revoke_reason")
    private String revokeReason;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "merkle_root", columnDefinition = "text")
    private String merkleRoot;

    @Column(columnDefinition = "text")
    private String signature;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    /** Optional, institution's choice at issuance. Null means never expires. */
    @Column(name = "expires_at")
    private Instant expiresAt;

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
