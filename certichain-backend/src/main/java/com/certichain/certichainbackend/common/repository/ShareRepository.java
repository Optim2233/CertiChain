package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Share;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShareRepository extends JpaRepository<Share, UUID> {
    Optional<Share> findByShareToken(String shareToken);

    List<Share> findByShareTokenIn(Collection<String> shareTokens);

    List<Share> findByGraduateUserIdOrderByCreatedAtDesc(UUID graduateUserId);
}
