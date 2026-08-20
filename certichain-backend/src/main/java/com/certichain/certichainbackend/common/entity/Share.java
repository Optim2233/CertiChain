package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.ShareScope;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "share")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Share {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "graduate_user_id", nullable = false)
    private UUID graduateUserId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShareScope scope;

    @Column(name = "credential_id")
    private UUID credentialId;

    @Column(name = "share_token", nullable = false, unique = true)
    private String shareToken;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private int viewCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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
