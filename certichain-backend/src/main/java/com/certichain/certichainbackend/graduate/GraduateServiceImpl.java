package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.AuditLogEntry;
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
import com.certichain.certichainbackend.common.service.SupabaseStorageService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final AuditLogService auditLogService;
    private final SupabaseStorageService supabaseStorageService;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final PiiCryptoService piiCryptoService;

    @Override
    public int checkPendingCredentials(String email) {
        String norm = PiiCryptoService.normalizeEmail(email);
        requireText(norm, "email");
        // Pre-signup preview only - deliberately creates nothing.
        return credentialRepository.countByGraduateEmailHmacAndStatus(
                piiCryptoService.emailHmac(norm), CredentialStatus.PENDING_CLAIM);
    }

    @Override
    @Transactional
    public void signup(String email, String password, String firstName, String lastName, String phone) {
        String normEmail = PiiCryptoService.normalizeEmail(email);
        requireText(normEmail, "email");
        requireText(password, "password");
        if (userRepository.existsByEmailHmac(piiCryptoService.emailHmac(normEmail))) {
            throw new ValidationException("Email already registered");
        }

        User user = userRepository.save(User.builder()
                .email(piiCryptoService.encryptUserField(normEmail))
                .emailHmac(piiCryptoService.emailHmac(normEmail))
                .firstName(piiCryptoService.encryptUserField(trimToNull(firstName)))
                .lastName(piiCryptoService.encryptUserField(trimToNull(lastName)))
                .phone(piiCryptoService.encryptUserField(trimToNull(phone)))
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.GRADUATE)
                .createdAt(Instant.now())
                .lastBriefedAt(Instant.now()) // zero gap: no briefing card on first login
                .build());

        // Claim everything already issued to this email. Same transaction as the account
        // creation, so a half-claimed account can't exist.
        // Graduate email stored normalized in InstitutionServiceImpl.issue().
        List<Credential> pending = credentialRepository
                .findByGraduateEmailHmacAndStatus(piiCryptoService.emailHmac(normEmail),
                        CredentialStatus.PENDING_CLAIM);
        for (Credential credential : pending) {
            credential.setGraduateUserId(user.getId());
            credential.setStatus(CredentialStatus.ISSUED);
        }
        credentialRepository.saveAll(pending);
    }

    @Override
    public GraduateProfileResponse getOwnProfile() {
        return decryptedProfile(loadCurrentUser());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "currentUser", allEntries = true)
    public GraduateProfileResponse updateOwnProfile(String firstName, String lastName, String phone,
                                                    String profileImageUrl, MultipartFile profileImage) {
        User user = loadCurrentUser();

        String fn = trimToNull(firstName);
        if (fn != null || firstName != null) {
            if (fn != null && fn.length() > 100) throw new ValidationException("first name too long (max 100)");
            user.setFirstName(piiCryptoService.encryptUserField(fn));
        }
        String ln = trimToNull(lastName);
        if (ln != null || lastName != null) {
            if (ln != null && ln.length() > 100) throw new ValidationException("last name too long (max 100)");
            user.setLastName(piiCryptoService.encryptUserField(ln));
        }
        String ph = trimToNull(phone);
        if (ph != null || phone != null) {
            if (ph != null && ph.length() > 50) throw new ValidationException("phone too long (max 50)");
            user.setPhone(piiCryptoService.encryptUserField(ph));
        }

        if (profileImage != null && !profileImage.isEmpty()) {
            user.setProfileImageUrl(supabaseStorageService.uploadImage("users/" + user.getId(), profileImage));
        } else if (profileImageUrl != null) {
            String trimmed = profileImageUrl.isBlank() ? null : profileImageUrl.trim();
            if (trimmed != null && trimmed.length() > 2048) {
                throw new ValidationException("profileImageUrl too long");
            }
            if (trimmed != null && !(trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
                throw new ValidationException("profileImageUrl must start with http:// or https://");
            }
            user.setProfileImageUrl(trimmed);
        }

        return decryptedProfile(user);
    }

    /** Decrypt-on-read copy so ciphertext on the managed entity is never flushed as plaintext. */
    private GraduateProfileResponse decryptedProfile(User user) {
        return new GraduateProfileResponse(
                piiCryptoService.decryptUserField(user.getEmail()),
                piiCryptoService.decryptUserField(user.getFirstName()),
                piiCryptoService.decryptUserField(user.getLastName()),
                piiCryptoService.decryptUserField(user.getPhone()),
                user.getProfileImageUrl());
    }

    private User loadCurrentUser() {
        return userRepository.findById(currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    // Not cached: a single indexed query, the cache bought little. (The Redis serializer
    // now writes type tags so records would survive a round trip - see CacheSerializationTest -
    // but there's no reason to add caching here.)
    @Override
    public List<CredentialListItem> getTimeline() {
        List<CredentialListItem> items = credentialRepository.findTimelineByGraduateUserId(currentUser.id());
        if (items.isEmpty()) {
            return items;
        }
        // The join in findTimelineByGraduateUserId reads the "title" field_value straight from
        // the DB, so it comes back as ciphertext - swap in the decrypted titles here.
        // Same for graduateEmail (KEK envelope): decrypt once, the timeline is one user's own rows.
        List<UUID> credentialIds = items.stream().map(CredentialListItem::id).toList();
        Map<UUID, UUID> credentialToInstitution = credentialRepository.findAllById(credentialIds).stream()
                .collect(Collectors.toMap(Credential::getId, Credential::getInstitutionId));
        // Own email is best-effort here: it must never take down the title path.
        String ownEmail = null;
        try {
            ownEmail = piiCryptoService.decryptUserField(loadCurrentUser().getEmail());
        } catch (RuntimeException ignored) {
        }
        final String emailForItems = ownEmail;
        try {
            Map<UUID, String> titles = credentialFieldCryptoService.decryptedTitlesByCredential(
                    credentialToInstitution,
                    credentialFieldRepository.findByCredentialIdInAndFieldName(credentialIds, "title"));
            return items.stream()
                    .map(item -> {
                        CredentialListItem withTitle = titles.containsKey(item.id())
                                ? item.withTitle(titles.get(item.id())) : item;
                        return withTitle.withGraduateEmail(emailForItems);
                    })
                    .toList();
        } catch (RuntimeException e) {
            // ponytail: one bad DEK/title must not 500 the whole timeline; fail closed to
            // null titles (never the raw join value, which is ciphertext straight from the DB).
            return items.stream().map(item -> item.withTitle(null).withGraduateEmail(null)).toList();
        }
    }

    @Override
    @Cacheable(cacheNames = "graduate", key = "'credentialFields:' + @currentUser.id() + ':' + #credentialId")
    public List<CredentialField> getCredentialFields(UUID credentialId) {
        Credential credential = ownCredential(credentialId);
        List<CredentialField> fields =
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId);
        return credentialFieldCryptoService.decrypted(fields, credential.getInstitutionId());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "graduate", allEntries = true)
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
        auditLogService.log(AuditEvents.SHARE_CREATED_EVENT, currentUser.id(), null, credentialId, share.getId());
        return share;
    }

    @Override
    // Not cached: a single indexed per-user query. Caching it in remote Redis added a
    // read-after-evict lag window where the list right after createShare/revokeShare still
    // served the stale value, so the freshly created row didn't show until a later refetch.
    public List<Share> listShares() {
        return shareRepository.findByGraduateUserIdOrderByCreatedAtDesc(currentUser.id());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "graduate", allEntries = true)
    public void revokeShare(UUID shareId) {
        Share share = ownShare(shareId);
        // Kills this link only - the underlying credential is untouched.
        share.setRevoked(true);
        auditLogService.log(AuditEvents.SHARE_REVOKED_EVENT, currentUser.id(), null, null, shareId);
    }

    @Override
    public List<Instant> getShareActivity(UUID shareId) {
        ownShare(shareId);
        // View events only - the create/revoke entries also carry this shareId, and
        // including them made the activity list disagree with the share's viewCount.
        // Timestamps only - no viewer identity is recorded, by design (see
        // VerifierServiceImpl's class comment).
        return auditLogEntryRepository
                .findByShareIdAndEventOrderByOccurredAtDesc(shareId, AuditEvents.SHARE_VIEWED_EVENT).stream()
                .map(AuditLogEntry::getOccurredAt)
                .toList();
    }

    /** Without this check any graduate could read or revoke any other graduate's share. */
    private Share ownShare(UUID shareId) {
        Share share = shareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        if (!share.getGraduateUserId().equals(currentUser.id())) {
            throw new ForbiddenActionException("Share belongs to another graduate");
        }
        return share;
    }

    @Override
    @Transactional
    // A new flag must show on the institution's table immediately, not after the 5-min TTL.
    @Caching(evict = {
            @CacheEvict(cacheNames = "graduate", allEntries = true),
            @CacheEvict(cacheNames = "institution", allEntries = true)})
    public DisputeFlag flagCredential(UUID credentialId, String reason) {
        requireText(reason, "reason");
        Credential credential = ownCredential(credentialId);
        // OPEN doesn't change what verifiers see - only the institution's resolution does.
        DisputeFlag saved = disputeFlagRepository.save(DisputeFlag.builder()
                .credentialId(credentialId)
                .graduateUserId(currentUser.id())
                .reason(piiCryptoService.encryptInstitutionField(
                        reason.trim(), credential.getInstitutionId()))
                .status(DisputeStatus.OPEN)
                .createdAt(Instant.now())
                .build());
        return piiCryptoService.decryptedFlagCopy(saved, credential.getInstitutionId());
    }

    @Override
    // Not cached: returns decrypted copies, and plaintext PII must not sit in Redis.
    public List<DisputeFlag> getCredentialFlags(UUID credentialId) {
        Credential credential = ownCredential(credentialId);
        UUID instId = credential.getInstitutionId();
        return disputeFlagRepository.findByCredentialId(credentialId).stream()
                .map(f -> piiCryptoService.decryptedFlagCopy(f, instId))
                .toList();
    }

    @Override
    @Cacheable(cacheNames = "graduate", key = "'openDisputeCount:' + @currentUser.id()")
    public int countOpenDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return 0; // an empty IN () is a SQL error on some drivers
        }
        return disputeFlagRepository.countByCredentialIdInAndStatus(credentialIds, DisputeStatus.OPEN);
    }

    @Override
    // Not cached: returns decrypted copies, and plaintext PII must not sit in Redis.
    public List<DisputeFlag> listOpenDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return List.of();
        }
        return decryptedFlags(
                disputeFlagRepository.findByCredentialIdInAndStatus(credentialIds, DisputeStatus.OPEN));
    }

    @Override
    // Not cached: returns decrypted copies, and plaintext PII must not sit in Redis.
    public List<DisputeFlag> listAllDisputes() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return List.of();
        }
        return decryptedFlags(
                disputeFlagRepository.findByCredentialIdInOrderByCreatedAtDesc(credentialIds));
    }

    /** Decrypt-on-read copies (never mutate managed flags - JPA would flush plaintext). */
    private List<DisputeFlag> decryptedFlags(List<DisputeFlag> flags) {
        if (flags.isEmpty()) {
            return flags;
        }
        Map<UUID, UUID> instByCredential = credentialRepository.findAllById(flags.stream()
                        .map(DisputeFlag::getCredentialId).distinct().toList()).stream()
                .collect(Collectors.toMap(Credential::getId, Credential::getInstitutionId));
        return flags.stream()
                .map(f -> piiCryptoService.decryptedFlagCopy(
                        f, instByCredential.get(f.getCredentialId())))
                .toList();
    }

    private List<UUID> myCredentialIds() {
        return credentialRepository
                .findByGraduateUserIdOrderByIssuedAtDesc(currentUser.id()).stream()
                .map(Credential::getId)
                .toList();
    }

    @Override
    @Cacheable(cacheNames = "graduate", key = "'verificationCount:' + @currentUser.id()")
    public int countVerifications() {
        List<UUID> credentialIds = myCredentialIds();
        if (credentialIds.isEmpty()) {
            return 0;
        }
        return auditLogEntryRepository.countByEventAndCredentialIdIn(AuditEvents.VERIFY_EVENT, credentialIds);
    }

    @Override
    public List<Instant> getCredentialVerificationHistory(UUID credentialId) {
        ownCredential(credentialId);
        // Timestamps only - no verifier identity is ever recorded (same reasoning as
        // getShareActivity above).
        return auditLogEntryRepository
                .findByEventAndCredentialIdInOrderByOccurredAtDesc(AuditEvents.VERIFY_EVENT, List.of(credentialId))
                .stream()
                .map(AuditLogEntry::getOccurredAt)
                .toList();
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
