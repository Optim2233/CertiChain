package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);
}
