package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Share;

import java.util.List;
import java.util.UUID;

public interface GraduateService {
    int checkPendingCredentials(String email);
    void signup(String email, String password);
    List<Credential> getTimeline();
    List<CredentialField> getCredentialFields(UUID credentialId);
    Share createShare(String name, String scope, UUID credentialId, List<UUID> selectedFieldIds);
    List<Share> listShares();
    void revokeShare(UUID shareId);
    DisputeFlag flagCredential(UUID credentialId, String reason);
    List<DisputeFlag> getCredentialFlags(UUID credentialId);
}
