package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, UUID> {
}
