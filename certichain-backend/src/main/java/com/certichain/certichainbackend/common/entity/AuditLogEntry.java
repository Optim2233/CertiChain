package com.certichain.certichainbackend.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log_entry")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String event;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "institution_id")
    private UUID institutionId;

    @Column(name = "credential_id")
    private UUID credentialId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
