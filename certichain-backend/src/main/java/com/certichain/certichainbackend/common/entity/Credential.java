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
}
