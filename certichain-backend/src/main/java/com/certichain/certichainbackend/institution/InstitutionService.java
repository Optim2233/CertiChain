package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface InstitutionService {
    Institution apply(String name, String ministry, List<MultipartFile> documents);
    Institution getOwnInstitution();
    Page<Credential> listCredentials(int page, int size);
    Credential issueCertificate(String graduateEmail, List<Map<String, String>> fields);
    List<Map<String, Object>> issueBatch(MultipartFile spreadsheet);
    Credential issueActivityRecord(String graduateEmail, String activity, String date);
    void revokeCredential(UUID credentialId, String reason);
    List<?> listDisputes();
    void upholdDispute(UUID disputeId, String resolutionNote, String action);
    void dismissDispute(UUID disputeId, String resolutionNote);
}
