package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Institution;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface VerifierService {
    VerificationResponse verifyById(UUID credentialId);
    VerificationResponse verifyByFile(MultipartFile file);
    Object verifyByShareToken(String token);
    List<Institution> publicInstitutionDirectory();
    List<BulkVerifyRow> verifyBulk(MultipartFile csv);
    TrustStats getTrustStats();
    int countApprovedInstitutions();
    int countVerifications();
}
