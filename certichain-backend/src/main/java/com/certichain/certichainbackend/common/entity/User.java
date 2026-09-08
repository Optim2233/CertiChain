package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    /** Hex HMAC-SHA256 of the normalized email - exact-match lookups on encrypted emails. */
    @Column(name = "email_hmac", length = 64, unique = true)
    private String emailHmac;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "institution_id")
    private UUID institutionId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "phone")
    private String phone;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    // Advances only when the user acknowledges a "while you were away" briefing,
    // never on login. See V10 migration and BriefingServiceImpl.
    @Column(name = "last_briefed_at", nullable = false)
    private Instant lastBriefedAt;
}
