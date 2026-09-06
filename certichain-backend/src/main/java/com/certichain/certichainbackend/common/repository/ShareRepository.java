package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Share;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShareRepository extends JpaRepository<Share, UUID> {
    Optional<Share> findByShareToken(String shareToken);

    List<Share> findByShareTokenIn(Collection<String> shareTokens);

    List<Share> findByGraduateUserIdOrderByCreatedAtDesc(UUID graduateUserId);

    /** Atomic view-count bump that never version-checks: concurrent verifications of
     *  the same link (or a repeated token inside one bulk file) must not 409. */
    @Modifying
    @Query("UPDATE Share s SET s.viewCount = s.viewCount + 1 WHERE s.id = :id")
    void incrementViewCount(@Param("id") UUID id);
}
