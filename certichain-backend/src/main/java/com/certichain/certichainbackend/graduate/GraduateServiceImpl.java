package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Share;
import com.certichain.certichainbackend.common.entity.ShareFieldSelection;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.enums.ShareScope;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.ShareFieldSelectionRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GraduateServiceImpl implements GraduateService {

    private final UserRepository userRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialFieldRepository credentialFieldRepository;
    private final ShareRepository shareRepository;
    private final ShareFieldSelectionRepository shareFieldSelectionRepository;
    private final DisputeFlagRepository disputeFlagRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    // ponytail: unused for now - wire this in once graduate actions (flag
    // filed, share created/revoked) need an audit trail. Kept, not dead code.
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;
    private final CredentialFieldCryptoService credentialFieldCryptoService;

    @Override
    public int checkPendingCredentials(String email) {
        requireText(email, "email");
        // Pre-signup preview only - deliberately creates nothing.
        return credentialRepository.countByGraduateEmailAndStatus(email, CredentialStatus.PENDING_CLAIM);
    }

    @Override
    @Transactional
    public void signup(String email, String password) {
        requireText(email, "email");
        requireText(password, "password");
        if (userRepository.existsByEmail(email)) {
            throw new ValidationException("Email already registered");
        }

        User user = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.GRADUATE)
                .createdAt(Instant.now())
                .build());

        // Claim everything already issued to this email. Same transaction as the account
        // creation, so a half-claimed account can't exist.
        List<Credential> pending = credentialRepository
                .findByGraduateEmailAndStatus(email, CredentialStatus.PENDING_CLAIM);
        for (Credential credential : pending) {
            credential.setGraduateUserId(user.getId());
            credential.setStatus(CredentialStatus.ISSUED);
        }
        credentialRepository.saveAll(pending);
    }

    @Override
    public List<Credential> getTimeline() {
        return credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(currentUser.id());
    }

    @Override
    public List<CredentialField> getCredentialFields(UUID credentialId) {
        Credential credential = ownCredential(credentialId);
        List<CredentialField> fields =
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId);
        return credentialFieldCryptoService.decrypted(fields, credential.getInstitutionId());
    }

    @Override
    @Transactional
    public Share createShare(String name, String scope, UUID credentialId, List<UUID> selectedFieldIds) {
        requireText(name, "name");
        ShareScope shareScope = parseScope(scope);

        // Mirror the DB's chk_share_credential_scope in code so a bad combination is a clean
        // 400 instead of a constraint-violation 500.
        if (shareScope == ShareScope.SINGLE_CREDENTIAL && credentialId == null) {
            throw new ValidationException("credentialId is required for a SINGLE_CREDENTIAL share");
        }
        if (shareScope == ShareScope.FULL_TIMELINE && credentialId != null) {
            throw new ValidationException("credentialId must be omitted for a FULL_TIMELINE share");
        }
        if (shareScope == ShareScope.SINGLE_CREDENTIAL) {
            ownCredential(credentialId);
        }

        Share share = shareRepository.save(Share.builder()
                .graduateUserId(currentUser.id())
                .name(name)
                .scope(shareScope)
                // 122 bits of SecureRandom-backed entropy, already in the stdlib.
                .shareToken(UUID.randomUUID().toString())
                .credentialId(credentialId)
                .createdAt(Instant.now())
                .build());

        if (shareScope == ShareScope.SINGLE_CREDENTIAL && selectedFieldIds != null) {
            List<UUID> ownFieldIds = credentialFieldRepository
                    .findByCredentialIdOrderByMerkleIndex(credentialId).stream()
                    .map(CredentialField::getId)
                    .toList();
            for (UUID fieldId : selectedFieldIds) {
                if (!ownFieldIds.contains(fieldId)) {
                    throw new ValidationException("Field does not belong to this credential");
                }
                shareFieldSelectionRepository.save(ShareFieldSelection.builder()
                        .shareId(share.getId())
                        .credentialFieldId(fieldId)
                        .build());
            }
        }
        return share;
    }

    @Override
    public List<Share> listShares() {
        return shareRepository.findByGraduateUserIdOrderByCreatedAtDesc(currentUser.id());
    }

    @Override
    @Transactional
    public void revokeShare(UUID shareId) {
        Share share = shareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        if (!share.getGraduateUserId().equals(currentUser.id())) {
            throw new ForbiddenActionException("Share belongs to another graduate");
        }
        // Kills this link only - the underlying credential is untouched.
        share.setRevoked(true);
    }

    @Override
    @Transactional
    public DisputeFlag flagCredential(UUID credentialId, String reason) {
        requireText(reason, "reason");
        ownCredential(credentialId);
        // OPEN doesn't change what verifiers see - only the institution's resolution does.
        return disputeFlagRepository.save(DisputeFlag.builder()
                .credentialId(credentialId)
                .graduateUserId(currentUser.id())
                .reason(reason)
                .status(DisputeStatus.OPEN)
                .createdAt(Instant.now())
                .build());
    }

    @Override
    public List<DisputeFlag> getCredentialFlags(UUID credentialId) {
        ownCredential(credentialId);
        return disputeFlagRepository.findByCredentialId(credentialId);
    }

    @Override
    public int countOpenDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return 0; // an empty IN () is a SQL error on some drivers
        }
        return disputeFlagRepository.countByCredentialIdInAndStatus(credentialIds, DisputeStatus.OPEN);
    }

    @Override
    public List<DisputeFlag> listOpenDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return List.of();
        }
        return disputeFlagRepository.findByCredentialIdInAndStatus(credentialIds, DisputeStatus.OPEN);
    }

    @Override
    public List<DisputeFlag> listAllDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return List.of();
        }
        return disputeFlagRepository.findByCredentialIdInOrderByCreatedAtDesc(credentialIds);
    }

    private List<UUID> myCredentialIds() {
        return credentialRepository
                .findByGraduateUserIdOrderByIssuedAtDesc(currentUser.id()).stream()
                .map(Credential::getId)
                .toList();
    }

    @Override
    public int countVerifications() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return 0;
        }
        return auditLogEntryRepository.countByEventAndCredentialIdIn(AuditEvents.VERIFY_EVENT, credentialIds);
    }

    /** Without this check any graduate could read or flag any other graduate's credential. */
    private Credential ownCredential(UUID credentialId) {
        Credential credential = credentialRepository.findById(credentialId)
                .orElseThrow(() -> new ResourceNotFoundException("Credential not found"));
        if (!currentUser.id().equals(credential.getGraduateUserId())) {
            throw new ForbiddenActionException("Credential belongs to another graduate");
        }
        return credential;
    }

    private ShareScope parseScope(String scope) {
        try {
            return ShareScope.valueOf(scope);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ValidationException("scope must be SINGLE_CREDENTIAL or FULL_TIMELINE");
        }
    }

    private void requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(fieldName + " is required");
        }
    }
}
