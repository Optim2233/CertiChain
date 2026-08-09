package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CredentialRepository extends JpaRepository<Credential, UUID> {
    Page<Credential> findByInstitutionId(UUID institutionId, Pageable pageable);

    List<Credential> findByInstitutionId(UUID institutionId);

    List<Credential> findByGraduateUserIdOrderByIssuedAtDesc(UUID graduateUserId);

    List<Credential> findByGraduateEmailAndStatus(String graduateEmail, CredentialStatus status);

    int countByGraduateEmailAndStatus(String graduateEmail, CredentialStatus status);
}
