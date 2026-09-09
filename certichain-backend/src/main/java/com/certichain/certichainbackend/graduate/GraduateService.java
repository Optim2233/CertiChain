package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Share;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface GraduateService {
    int checkPendingCredentials(String email);
    void signup(String email, String password, String firstName, String lastName, String phone);
    GraduateProfileResponse getOwnProfile();
    GraduateProfileResponse updateOwnProfile(String firstName, String lastName, String phone,
                                             String profileImageUrl, MultipartFile profileImage);
    List<CredentialListItem> getTimeline();
    List<CredentialField> getCredentialFields(UUID credentialId);
    Share createShare(String name, String scope, UUID credentialId, List<UUID> selectedFieldIds);
    List<Share> listShares();
    void revokeShare(UUID shareId);
    void unrevokeShare(UUID shareId);
    BatchShareRevokeResult revokeShares(List<UUID> shareIds);
    List<Instant> getShareActivity(UUID shareId);
    DisputeFlag flagCredential(UUID credentialId, String reason);
    List<DisputeFlag> getCredentialFlags(UUID credentialId);
    int countOpenDisputes();
    List<DisputeFlag> listOpenDisputes();
    List<DisputeFlag> listAllDisputes();
    void withdrawDispute(UUID disputeId);
    int countVerifications();
    List<Instant> getCredentialVerificationHistory(UUID credentialId);
}
