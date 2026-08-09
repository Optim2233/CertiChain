package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.InstitutionStatus;
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

    /** Encrypted private key — never stored or returned as raw PKCS#8. */
    @Column(name = "private_key_enc", columnDefinition = "text")
    private String privateKeyEnc;

    @Column(name = "key_algorithm", length = 20)
    private String keyAlgorithm;

    @Column(name = "key_generated_at")
    private Instant keyGeneratedAt;
}
