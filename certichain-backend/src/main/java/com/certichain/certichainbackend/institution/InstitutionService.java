package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface InstitutionService {
    /**
     * Self-registration. Creates the Institution (PENDING), the INSTITUTION-role User that
     * logs in from here on, and the uploaded accreditation documents.
     *
     * <p>email/password are not in 02-institution.md's documented request body, but that
     * body cannot satisfy its own requirement to create "a User to log in with going
     * forward" - and the users table CHECK constraint forces an institution user to carry an
     * institution_id. Confirmed with the team before changing this signature.
     */
    Institution apply(String name, String ministry, String email, String password,
                      List<MultipartFile> documents);
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
