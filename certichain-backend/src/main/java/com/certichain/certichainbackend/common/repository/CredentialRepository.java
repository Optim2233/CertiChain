package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.graduate.CredentialListItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CredentialRepository extends JpaRepository<Credential, UUID> {
    Page<Credential> findByInstitutionId(UUID institutionId, Pageable pageable);

    Page<Credential> findByInstitutionIdAndStatus(UUID institutionId, CredentialStatus status, Pageable pageable);

    List<Credential> findByInstitutionId(UUID institutionId);

    List<Credential> findByGraduateUserIdOrderByIssuedAtDesc(UUID graduateUserId);

    List<Credential> findByGraduateEmailAndStatus(String graduateEmail, CredentialStatus status);

    int countByGraduateEmailAndStatus(String graduateEmail, CredentialStatus status);

    int countByInstitutionId(UUID institutionId);

    int countByInstitutionIdAndStatus(UUID institutionId, CredentialStatus status);

    int countByInstitutionIdAndStatusAndExpiresAtBetween(
            UUID institutionId, CredentialStatus status, Instant from, Instant to);

    // Cards need the credential's title and its issuer's name, neither of which lives on
    // Credential. Left joins so a credential still lists if its institution row or its
    // "title" field is missing - a card with a blank title beats a card that vanishes.
    @Query("""
            SELECT new com.certichain.certichainbackend.graduate.CredentialListItem(
                c.id, c.type, f.fieldValue, i.name, c.graduateEmail, c.status,
                c.revokeReason, c.merkleRoot, c.signature, c.issuedAt, c.expiresAt,
                i.brandColor, i.profileImageUrl, i.accentPattern)
            FROM Credential c
            LEFT JOIN Institution i ON i.id = c.institutionId
            LEFT JOIN CredentialField f ON f.credentialId = c.id AND f.fieldName = 'title'
            WHERE c.graduateUserId = :graduateUserId
            ORDER BY c.issuedAt DESC
            """)
    List<CredentialListItem> findTimelineByGraduateUserId(@Param("graduateUserId") UUID graduateUserId);

    // No JPA relation between Credential and DisputeFlag (plain UUID FKs) - joined via a
    // credential-id subquery instead of a mapped association.
    @Query("SELECT DISTINCT c.institutionId FROM Credential c WHERE c.id IN "
            + "(SELECT d.credentialId FROM DisputeFlag d WHERE d.status = "
            + "com.certichain.certichainbackend.common.enums.DisputeStatus.OPEN)")
    List<UUID> findInstitutionIdsWithOpenDisputes();
}
