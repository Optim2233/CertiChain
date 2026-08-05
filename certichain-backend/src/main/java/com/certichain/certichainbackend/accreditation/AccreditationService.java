package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import com.certichain.certichainbackend.common.entity.Institution;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface AccreditationService {
    Page<Institution> listInstitutions(String status, int page, int size);
    Institution getInstitution(UUID id);
    void approve(UUID id);
    void requestInfo(UUID id, String note);
    void reject(UUID id, String reason);
    void suspend(UUID id, String reason);
    void reinstate(UUID id);
    void revoke(UUID id, String reason);
    Page<AuditLogEntry> auditLog(UUID institutionId, int page, int size);
}
