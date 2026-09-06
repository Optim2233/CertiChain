package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Encrypted-email lookups - pass {@code PiiCryptoService.emailHmac(normalizedEmail)}. */
    Optional<User> findByEmailHmac(String emailHmac);

    boolean existsByEmailHmac(String emailHmac);

    List<User> findByInstitutionId(UUID institutionId);
}
