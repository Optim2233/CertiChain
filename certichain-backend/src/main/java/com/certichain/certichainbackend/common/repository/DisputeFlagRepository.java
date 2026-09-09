package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface DisputeFlagRepository extends JpaRepository<DisputeFlag, UUID> {
    List<DisputeFlag> findByCredentialId(UUID credentialId);

    List<DisputeFlag> findByCredentialIdInAndStatus(Collection<UUID> credentialIds, DisputeStatus status);

    List<DisputeFlag> findByCredentialIdInOrderByCreatedAtDesc(Collection<UUID> credentialIds);

    int countByCredentialIdInAndStatus(Collection<UUID> credentialIds, DisputeStatus status);

    boolean existsByCredentialIdAndStatus(UUID credentialId, DisputeStatus status);

    int countByCredentialIdInAndCreatedAtAfter(Collection<UUID> credentialIds, Instant createdAt);
}
