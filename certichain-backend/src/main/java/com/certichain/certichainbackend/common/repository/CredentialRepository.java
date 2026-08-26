package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    // No JPA relation between Credential and DisputeFlag (plain UUID FKs) - joined via a
    // credential-id subquery instead of a mapped association.
    @Query("SELECT DISTINCT c.institutionId FROM Credential c WHERE c.id IN "
            + "(SELECT d.credentialId FROM DisputeFlag d WHERE d.status = "
            + "com.certichain.certichainbackend.common.enums.DisputeStatus.OPEN)")
    List<UUID> findInstitutionIdsWithOpenDisputes();
}
