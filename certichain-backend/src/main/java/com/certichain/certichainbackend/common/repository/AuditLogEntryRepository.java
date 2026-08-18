package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.UUID;

public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, UUID> {
    Page<AuditLogEntry> findByInstitutionId(UUID institutionId, Pageable pageable);

    int countByEventAndCredentialIdIn(String event, Collection<UUID> credentialIds);

    int countByEvent(String event);
}
