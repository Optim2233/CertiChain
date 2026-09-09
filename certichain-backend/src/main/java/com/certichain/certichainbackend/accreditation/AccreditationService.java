package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface AccreditationService {
    Page<Institution> listInstitutions(String status, String q, int page, int size);
    List<UUID> institutionsWithOpenDisputes();
    InstitutionDetailResponse getInstitution(UUID id);
    void approve(UUID id);
    void requestInfo(UUID id, String note);
    void reject(UUID id, String reason);
    void suspend(UUID id, String reason);
    void reinstate(UUID id);
    void revoke(UUID id, String reason);
    Page<AuditLogEntryResponse> auditLog(UUID institutionId, String q, String event, int page, int size);
    List<InstitutionDocumentResponse> listDocuments(UUID institutionId);
    InstitutionDocument getDocument(UUID institutionId, UUID documentId);
    void verifyDocument(UUID institutionId, UUID documentId);
}
