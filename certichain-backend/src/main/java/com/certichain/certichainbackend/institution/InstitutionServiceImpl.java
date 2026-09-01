package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.SignedCredential;
import com.certichain.certichainbackend.common.service.SigningService;
import com.certichain.certichainbackend.common.service.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstitutionServiceImpl implements InstitutionService {

    private final InstitutionRepository institutionRepository;
    private final InstitutionDocumentRepository institutionDocumentRepository;
    private final UserRepository userRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialFieldRepository credentialFieldRepository;
    private final DisputeFlagRepository disputeFlagRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final SigningService signingService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final SupabaseStorageService supabaseStorageService;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    @Override
    @Transactional
    public Institution apply(String name, String ministry, String email, String password,
                              String phone, String website,
                              List<MultipartFile> documents) {
        requireText(name, "name");
        requireText(ministry, "ministry");
        requireText(email, "email");
        requireText(password, "password");
        if (userRepository.existsByEmail(email)) {
            throw new ValidationException("Email already registered");
        }
        if (phone != null && phone.length() > 50) {
            throw new ValidationException("phone too long (max 50)");
        }
        if (website != null && website.length() > 255) {
            throw new ValidationException("website too long (max 255)");
        }

        // Institution first: the user row's FK and the chk_user_institution_role CHECK both
        // need the institution to exist already.
        Institution institution = institutionRepository.save(Institution.builder()
                .name(name)
                .ministry(ministry)
                .phone(phone != null && !phone.isBlank() ? phone.trim() : null)
                .website(website != null && !website.isBlank() ? website.trim() : null)
                .status(InstitutionStatus.PENDING)
                .appliedAt(Instant.now())
                .build());

        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.INSTITUTION)
                .institutionId(institution.getId())
                .createdAt(Instant.now())
                .lastBriefedAt(Instant.now()) // zero gap: no briefing card on first login
                .build());

        if (documents != null) {
            for (MultipartFile document : documents) {
                if (document == null || document.isEmpty()) {
                    continue;
                }
                // ponytail: 5MB per file cap before loading bytes; larger needs streaming storage
                if (document.getSize() > 5L * 1024 * 1024) {
                    throw new ValidationException("Document too large (max 5MB): " + document.getOriginalFilename());
                }
                String fn = document.getOriginalFilename();
                if (fn != null && fn.length() > 255) {
                    throw new ValidationException("File name too long (max 255)");
                }
                String ct = document.getContentType();
                if (ct != null && !ct.equals("application/pdf") && !ct.equals("application/octet-stream")) {
                    // Allow pdf only; octet-stream is common for renamed pdfs
                    throw new ValidationException("Only PDF documents are accepted");
                }
                String safeName = fn == null || fn.isBlank() ? "document.pdf" : fn.replaceAll("[^a-zA-Z0-9._-]", "_");
                institutionDocumentRepository.save(InstitutionDocument.builder()
                        .institutionId(institution.getId())
                        .fileName(safeName)
                        .fileData(readBytes(document))
                        .uploadedAt(Instant.now())
                        .build());
            }
        }

        auditLogService.log("Institution application submitted", null, institution.getId(), null);
        return institution;
    }

    @Override
    @Cacheable(cacheNames = "institution", key = "'own:' + @currentUser.institutionId()")
    public Institution getOwnInstitution() {
        return load(currentUser.institutionId());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Institution updateOwnInstitution(String name, String phone, String website,
                                            String profileImageUrl, MultipartFile profileImage,
                                            String brandColor, String accentPattern) {
        Institution institution = load(currentUser.institutionId());

        boolean changed = false;

        if (name != null && !name.isBlank()) {
            requireText(name, "name");
            if (!name.trim().equals(institution.getName())) {
                institution.setName(name.trim());
                changed = true;
            }
        }
        if (phone != null) {
            String trimmed = phone.isBlank() ? null : phone.trim();
            if (trimmed != null && trimmed.length() > 50) {
                throw new ValidationException("phone too long (max 50)");
            }
            if (!java.util.Objects.equals(trimmed, institution.getPhone())) {
                institution.setPhone(trimmed);
                changed = true;
            }
        }
        if (website != null) {
            String trimmed = website.isBlank() ? null : website.trim();
            if (trimmed != null && trimmed.length() > 255) {
                throw new ValidationException("website too long (max 255)");
            }
            if (!java.util.Objects.equals(trimmed, institution.getWebsite())) {
                institution.setWebsite(trimmed);
                changed = true;
            }
        }

        String resolvedImageUrl = null;
        if (profileImage != null && !profileImage.isEmpty()) {
            resolvedImageUrl = supabaseStorageService.uploadProfileImage(institution.getId(), profileImage);
        } else if (profileImageUrl != null) {
            String trimmed = profileImageUrl.isBlank() ? null : profileImageUrl.trim();
            if (trimmed != null && trimmed.length() > 2048) {
                throw new ValidationException("profileImageUrl too long");
            }
            if (trimmed != null && !(trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
                throw new ValidationException("profileImageUrl must start with http:// or https://");
            }
            resolvedImageUrl = trimmed;
        }

        if (resolvedImageUrl != null || (profileImageUrl != null && profileImageUrl.isBlank() && institution.getProfileImageUrl() != null)) {
            String toSet = resolvedImageUrl;
            if (profileImageUrl != null && profileImageUrl.isBlank()) {
                toSet = null;
            }
            if (!java.util.Objects.equals(toSet, institution.getProfileImageUrl())) {
                institution.setProfileImageUrl(toSet);
                changed = true;
            }
        }

        if (brandColor != null) {
            String trimmed = brandColor.isBlank() ? null : brandColor.trim();
            if (trimmed != null) {
                if (!trimmed.matches("^#[0-9a-fA-F]{6}$")) {
                    throw new ValidationException("brand color must be a #RRGGBB hex value");
                }
                if (contrastRatioAgainstWhite(trimmed) < 4.5) {
                    throw new ValidationException(
                            "brand color is too light for white text - pick a deeper shade");
                }
            }
            if (!java.util.Objects.equals(trimmed, institution.getBrandColor())) {
                institution.setBrandColor(trimmed);
                changed = true;
            }
        }
        if (accentPattern != null && !accentPattern.isBlank()) {
            String trimmed = accentPattern.trim().toLowerCase();
            if (!trimmed.equals("hatch") && !trimmed.equals("dots") && !trimmed.equals("none")) {
                throw new ValidationException("accent pattern must be one of: hatch, dots, none");
            }
            if (!trimmed.equals(institution.getAccentPattern())) {
                institution.setAccentPattern(trimmed);
                changed = true;
            }
        }

        if (changed) {
            institution = institutionRepository.save(institution);
            auditLogService.log("Institution profile updated", currentUser.id(), institution.getId(), null);
        }
        return institution;
    }

    /** WCAG contrast ratio of white (#FFFFFF) against the given #RRGGBB colour. */
    private static double contrastRatioAgainstWhite(String hex) {
        double r = channelLuminance(Integer.parseInt(hex.substring(1, 3), 16));
        double g = channelLuminance(Integer.parseInt(hex.substring(3, 5), 16));
        double b = channelLuminance(Integer.parseInt(hex.substring(5, 7), 16));
        double luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // white luminance is 1.0; lighter colour is the numerator
        return 1.05 / (luminance + 0.05);
    }

    private static double channelLuminance(int value) {
        double c = value / 255.0;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    @Override
    // Not @Cacheable: Spring Data's PageImpl has no default constructor and does not
    // survive the Redis JSON round trip (InvalidDefinitionException: no Creators).
    public Page<Credential> listCredentials(String status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("issuedAt").descending());
        if (status == null || status.isBlank()) {
            return credentialRepository.findByInstitutionId(currentUser.institutionId(), pageRequest);
        }
        return credentialRepository.findByInstitutionIdAndStatus(
                currentUser.institutionId(), parseCredentialStatus(status), pageRequest);
    }

    // Not cached: record DTOs do not survive the Redis round trip - see CacheSerializationTest.
    @Override
    public CredentialSummary getCredentialSummary() {
        UUID institutionId = currentUser.institutionId();
        return new CredentialSummary(
                credentialRepository.countByInstitutionId(institutionId),
                credentialRepository.countByInstitutionIdAndStatus(institutionId, CredentialStatus.REVOKED),
                credentialRepository.countByInstitutionIdAndStatus(institutionId, CredentialStatus.PENDING_CLAIM));
    }

    // Not cached: record DTOs do not survive the Redis round trip - see CacheSerializationTest.
    @Override
    public InstitutionAnalytics getAnalytics() {
        UUID institutionId = currentUser.institutionId();
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant soon = Instant.now().plus(30, ChronoUnit.DAYS);

        List<Credential> credentials = credentialRepository.findByInstitutionId(institutionId);
        List<UUID> credentialIds = credentials.stream().map(Credential::getId).toList();
        int totalVerifications = credentialIds.isEmpty() ? 0
                : auditLogEntryRepository.countByEventAndCredentialIdIn(AuditEvents.VERIFY_EVENT, credentialIds);

        return new InstitutionAnalytics(
                credentials.size(),
                totalVerifications,
                credentialRepository.countByInstitutionIdAndStatusAndExpiresAtBetween(
                        institutionId, CredentialStatus.ISSUED, Instant.now(), soon),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.CERTIFICATE_ISSUED_EVENT, since)),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.VERIFY_EVENT, since)));
    }

    /**
     * Native query rows come back as [day, count]. The driver/Hibernate version in use maps
     * date_trunc()'s timestamptz result to java.sql.Timestamp OR java.time.Instant/OffsetDateTime
     * depending on version - handle whatever actually shows up rather than betting on one.
     */
    private List<DailyCount> toDailyCounts(List<Object[]> rows) {
        return rows.stream()
                .map(row -> new DailyCount(toLocalDate(row[0]), ((Number) row[1]).longValue()))
                .toList();
    }

    private LocalDate toLocalDate(Object value) {
        Instant instant = switch (value) {
            case java.sql.Timestamp ts -> ts.toInstant();
            case Instant i -> i;
            case java.time.OffsetDateTime odt -> odt.toInstant();
            case java.time.LocalDateTime ldt -> ldt.toInstant(ZoneOffset.UTC);
            default -> throw new IllegalStateException(
                    "Unexpected date_trunc() result type: " + value.getClass());
        };
        return instant.atZone(ZoneOffset.UTC).toLocalDate();
    }

    private CredentialStatus parseCredentialStatus(String status) {
        try {
            return CredentialStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Unknown status: " + status);
        }
    }

    /** Blank/missing "type" column defaults to CERTIFICATE - every pre-existing batch CSV still works unchanged. */
    private CredentialType parseBatchType(String type) {
        if (type == null || type.isBlank()) {
            return CredentialType.CERTIFICATE;
        }
        try {
            return CredentialType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Unknown type: " + type + " (expected certificate or activity_record)");
        }
    }

    /** Optional column; blank/absent means the credential never expires. */
    private Instant parseBatchExpiry(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(expiresAt.trim()).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException ex) {
            throw new ValidationException("Invalid expires_at (expected YYYY-MM-DD): " + expiresAt);
        }
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Credential issueCertificate(String graduateEmail, List<Map<String, String>> fields, Instant expiresAt) {
        if (fields == null || fields.isEmpty()) {
            throw new ValidationException("At least one field is required");
        }
        List<Field> parsed = new ArrayList<>();
        for (Map<String, String> field : fields) {
            String fieldName = field.get("name");
            requireText(fieldName, "field name");
            parsed.add(new Field(fieldName, field.getOrDefault("value", "")));
        }
        return issue(graduateEmail, parsed, CredentialType.CERTIFICATE, expiresAt);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Credential issueActivityRecord(String graduateEmail, String activity, String date, Instant expiresAt) {
        requireText(activity, "activity");
        requireText(date, "date");
        return issue(graduateEmail,
                List.of(new Field("activity", activity), new Field("date", date)),
                CredentialType.ACTIVITY_RECORD, expiresAt);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public List<Map<String, Object>> issueBatch(MultipartFile spreadsheet) {
        // @Transactional (read-write) is required: the class default is readOnly=true, under
        // which Hibernate silently skips the flush and every issued row is discarded on commit.
        // Per-row errors are caught inside the loop, so a bad row never rolls back good ones.
        // Synchronous with per-row results: one bad row is a row-level error, never a failed
        // request. Rows are fully validated before anything is written, so a rejected row
        // leaves nothing behind.
        UUID batchId = UUID.randomUUID();
        List<Map<String, Object>> results = new ArrayList<>();
        List<Map<String, String>> rows = parseCsv(readText(spreadsheet));

        int rowNumber = 1; // header is row 1
        for (Map<String, String> row : rows) {
            rowNumber++;
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("row", rowNumber);
            String email = row.get("graduate_email");
            result.put("graduate", email);
            try {
                if (email == null || email.isBlank()) {
                    throw new ValidationException("missing graduate_email");
                }
                CredentialType type = parseBatchType(row.get("type"));
                Instant expiresAt = parseBatchExpiry(row.get("expires_at"));
                List<Field> fields = row.entrySet().stream()
                        .filter(e -> !e.getKey().equals("graduate_email") && !e.getKey().equals("type")
                                && !e.getKey().equals("expires_at"))
                        .map(e -> new Field(e.getKey(), e.getValue()))
                        .toList();
                if (fields.isEmpty()) {
                    throw new ValidationException("no credential fields in row");
                }
                Credential credential = issue(email, fields, type, expiresAt, batchId);
                result.put("status", "OK");
                result.put("credentialId", credential.getId());
                result.put("batchId", batchId);
            } catch (RuntimeException ex) {
                result.put("status", "ERROR");
                result.put("error", ex.getMessage());
            }
            results.add(result);
        }
        return results;
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public void revokeCredential(UUID credentialId, String reason) {
        requireText(reason, "reason");
        Credential credential = ownCredential(credentialId);
        applyRevocation(credential, reason);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public BatchRevokeResult revokeBatch(UUID batchId, String reason) {
        requireText(reason, "reason");
        List<Credential> members = credentialRepository.findByInstitutionIdAndBatchId(
                currentUser.institutionId(), batchId);
        // Empty also covers a batch owned by another institution - the institutionId filter
        // makes it indistinguishable from "no such batch", same as ownCredential's 404.
        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Batch not found");
        }
        int revoked = 0;
        int alreadyRevoked = 0;
        for (Credential credential : members) {
            if (credential.getStatus() == CredentialStatus.REVOKED) {
                alreadyRevoked++;
                continue;
            }
            applyRevocation(credential, reason);
            revoked++;
        }
        return new BatchRevokeResult(revoked, alreadyRevoked);
    }

    /** Shared revoke behaviour: status + reason + timestamp, audit entry, graduate notification. */
    private void applyRevocation(Credential credential, String reason) {
        credential.setStatus(CredentialStatus.REVOKED);
        credential.setRevokeReason(reason);
        credential.setRevokedAt(Instant.now());
        auditLogService.log(AuditEvents.CERTIFICATE_REVOKED_EVENT, currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(credential.getGraduateUserId(), "Certificate revoked",
                "A credential you hold was revoked. Reason: " + reason);
    }

    @Override
    public List<BatchSummaryRow> listBatches() {
        return credentialRepository.findBatchSummaries(currentUser.institutionId());
    }

    @Override
    @Cacheable(cacheNames = "institution",
            key = "'credentialFields:' + @currentUser.institutionId() + ':' + #credentialId")
    public List<CredentialField> getCredentialFields(UUID credentialId) {
        ownCredential(credentialId); // authorization check only
        return credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId);
    }

    @Override
    @Cacheable(cacheNames = "institution",
            key = "'credential:' + @currentUser.institutionId() + ':' + #credentialId")
    public Credential getCredential(UUID credentialId) {
        return ownCredential(credentialId);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Credential editCredential(UUID credentialId, List<Map<String, String>> fields) {
        Credential credential = ownCredential(credentialId);
        if (credential.getStatus() == CredentialStatus.REVOKED) {
            throw new ValidationException("Cannot edit a revoked credential");
        }
        if (fields == null || fields.isEmpty()) {
            throw new ValidationException("At least one field is required");
        }
        List<Field> toSign = new ArrayList<>();
        for (Map<String, String> field : fields) {
            String fieldName = field.get("name");
            requireText(fieldName, "field name");
            toSign.add(new Field(fieldName, field.getOrDefault("value", "")));
        }
        resignFields(credential, toSign);
        auditLogService.log("Certificate edited", currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(credential.getGraduateUserId(), "Certificate edited",
                "A credential you hold was edited and re-signed by the issuing institution.");
        return credential;
    }

    @Override
    @Cacheable(cacheNames = "institution", key = "'disputes:' + @currentUser.institutionId()")
    public List<?> listDisputes() {
        List<UUID> credentialIds = credentialRepository
                .findByInstitutionId(currentUser.institutionId()).stream()
                .map(Credential::getId)
                .toList();
        if (credentialIds.isEmpty()) {
            return List.of(); // an empty IN () is a SQL error on some drivers
        }
        return disputeFlagRepository.findByCredentialIdInAndStatus(credentialIds, DisputeStatus.OPEN);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public void upholdDispute(UUID disputeId, String resolutionNote, String action, List<Map<String, String>> fields) {
        requireText(resolutionNote, "resolution_note");
        DisputeFlag dispute = openDispute(disputeId);
        Credential credential = ownCredential(dispute.getCredentialId());

        if ("REVOKE".equalsIgnoreCase(action)) {
            credential.setStatus(CredentialStatus.REVOKED);
            credential.setRevokeReason(resolutionNote);
            credential.setRevokedAt(Instant.now());
            auditLogService.log(AuditEvents.CERTIFICATE_REVOKED_EVENT, currentUser.id(),
                    credential.getInstitutionId(), credential.getId());
        } else if ("EDIT".equalsIgnoreCase(action)) {
            // Corrected values from the resolution UI take priority; falls back to re-signing
            // the stored values unchanged if the caller sends no fields (keeps old callers working).
            List<Field> toSign;
            if (fields != null && !fields.isEmpty()) {
                toSign = new ArrayList<>();
                for (Map<String, String> field : fields) {
                    String fieldName = field.get("name");
                    requireText(fieldName, "field name");
                    toSign.add(new Field(fieldName, field.getOrDefault("value", "")));
                }
            } else {
                toSign = credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId()).stream()
                        .map(f -> new Field(f.getFieldName(), f.getFieldValue()))
                        .toList();
            }

            resignFields(credential, toSign);
        } else {
            throw new ValidationException("action must be EDIT or REVOKE");
        }

        dispute.setStatus(DisputeStatus.UPHELD);
        dispute.setResolutionNote(resolutionNote);
        dispute.setResolvedAt(Instant.now());
        auditLogService.log("Dispute upheld", currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(dispute.getGraduateUserId(), "Dispute upheld",
                "Your dispute was upheld. Resolution: " + resolutionNote);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public void dismissDispute(UUID disputeId, String resolutionNote) {
        requireText(resolutionNote, "resolution_note");
        DisputeFlag dispute = openDispute(disputeId);
        Credential credential = ownCredential(dispute.getCredentialId());

        // Record stands as issued - the credential is deliberately untouched.
        dispute.setStatus(DisputeStatus.DISMISSED);
        dispute.setResolutionNote(resolutionNote);
        dispute.setResolvedAt(Instant.now());
        auditLogService.log("Dispute dismissed", currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(dispute.getGraduateUserId(), "Dispute dismissed",
                "Your dispute was dismissed. Resolution: " + resolutionNote);
    }

    /** Re-signs a credential's field set and replaces its stored fields with the signed result. */
    private void resignFields(Credential credential, List<Field> toSign) {
        // ponytail: unique field names guard before delete to avoid transient constraint violation
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (Field f : toSign) {
            String n = f.name().trim().toLowerCase();
            if (!seen.add(n)) {
                throw new ValidationException("Duplicate field name: " + f.name());
            }
        }
        SignedCredential signed = signingService.signCredential(toSign, credential.getInstitutionId());
        credential.setMerkleRoot(signed.merkleRoot());
        credential.setSignature(signed.signature());

        credentialFieldRepository.deleteByCredentialId(credential.getId());
        credentialFieldRepository.flush();
        credentialFieldRepository.saveAll(signed.fields().stream().map(field -> CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    .merkleIndex(field.merkleIndex())
                    .build()).toList());
    }

    /**
     * The single issuance path - single certificates, activity records and every batch row
     * funnel through here, so the APPROVED gate cannot be bypassed on one of them.
     */
    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type, Instant expiresAt) {
        return issue(graduateEmail, fields, type, expiresAt, null);
    }

    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type,
                             Instant expiresAt, UUID batchId) {
        requireText(graduateEmail, "graduate_email");
        String normGradEmail = graduateEmail.trim().toLowerCase();
        UUID institutionId = currentUser.institutionId();
        Institution institution = load(institutionId);
        if (institution.getStatus() != InstitutionStatus.APPROVED) {
            throw new ForbiddenActionException(
                    "Institution is not approved to issue credentials (status: "
                            + institution.getStatus() + ")");
        }

        SignedCredential signed = signingService.signCredential(fields, institutionId);

        // Reject an exact re-issue. The DB's uq_credential_institution_merkle_active is the
        // race-safe guarantee; this check just turns it into a clean message instead of a
        // generic DATA_CONFLICT 409. A revoked credential with the same fields is allowed
        // through - that is a corrected re-issue, not a duplicate.
        if (credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, signed.merkleRoot(), CredentialStatus.REVOKED)) {
            throw new ValidationException(
                    "An identical credential has already been issued to this graduate");
        }

        // Claim-on-issue: an existing account gets the credential outright, otherwise it
        // waits in PENDING_CLAIM until that email signs up.
        Optional<User> graduate = userRepository.findByEmail(normGradEmail);
        Credential credential = credentialRepository.save(Credential.builder()
                .type(type)
                .institutionId(institutionId)
                .graduateUserId(graduate.map(User::getId).orElse(null))
                .graduateEmail(normGradEmail)
                .batchId(batchId)
                .status(graduate.isPresent() ? CredentialStatus.ISSUED : CredentialStatus.PENDING_CLAIM)
                .merkleRoot(signed.merkleRoot())
                .signature(signed.signature())
                .issuedAt(Instant.now())
                .expiresAt(expiresAt)
                .build());

        credentialFieldRepository.saveAll(signed.fields().stream().map(field -> CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    .merkleIndex(field.merkleIndex())
                    .build()).toList());
        auditLogService.log(AuditEvents.CERTIFICATE_ISSUED_EVENT, currentUser.id(), institutionId, credential.getId());
        // Unclaimed (PENDING_CLAIM) credentials have no user yet - notify() no-ops on null.
        notificationService.notify(credential.getGraduateUserId(), "Certificate issued",
                "A new credential has been issued to you by an accredited institution.");
        return credential;
    }

    /**
     * Header row names the fields; graduate_email is the one reserved column.
     * ponytail: minimal quoted handling + 5000 row cap; use commons-csv if richer CSV needed.
     */
    static List<Map<String, String>> parseCsv(String content) {
        List<Map<String, String>> rows = new ArrayList<>();
        String[] lines = content.split("\\r?\\n");
        if (lines.length == 0 || lines[0].isBlank()) {
            return rows;
        }

        // Excel writes a UTF-8 BOM; without stripping it the first column name never matches.
        String headerLine = lines[0].startsWith("\uFEFF") ? lines[0].substring(1) : lines[0];
        String[] headers = splitCsvLine(headerLine);
        for (int i = 0; i < headers.length; i++) {
            headers[i] = headers[i].trim();
        }

        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank()) {
                continue;
            }
            if (rows.size() >= 5000) {
                throw new ValidationException("CSV too large (max 5000 rows)");
            }
            String[] values = splitCsvLine(lines[i]);
            Map<String, String> row = new LinkedHashMap<>();
            for (int c = 0; c < headers.length; c++) {
                row.put(headers[c], c < values.length ? values[c].trim() : "");
            }
            rows.add(row);
        }
        return rows;
    }

    private static String[] splitCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQ = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQ && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++;
                } else {
                    inQ = !inQ;
                }
            } else if (c == ',' && !inQ) {
                out.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        out.add(cur.toString());
        return out.toArray(new String[0]);
    }

    private DisputeFlag openDispute(UUID disputeId) {
        DisputeFlag dispute = disputeFlagRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found"));
        if (dispute.getStatus() != DisputeStatus.OPEN) {
            throw new ValidationException("Dispute already resolved");
        }
        return dispute;
    }

    /** Loads a credential and proves it belongs to the caller's institution. */
    private Credential ownCredential(UUID credentialId) {
        Credential credential = credentialRepository.findById(credentialId)
                .orElseThrow(() -> new ResourceNotFoundException("Credential not found"));
        if (!credential.getInstitutionId().equals(currentUser.institutionId())) {
            throw new ForbiddenActionException("Credential belongs to another institution");
        }
        return credential;
    }

    private Institution load(UUID id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found"));
    }

    private void requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(fieldName + " is required");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (Exception ex) {
            throw new ValidationException("Could not read uploaded file: " + file.getOriginalFilename());
        }
    }

    private String readText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("A spreadsheet file is required");
        }
        // ponytail: streaming read; 20MB at 10MB per file cap via multipart max-size
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            int lines = 0;
            while ((line = reader.readLine()) != null) {
                if (++lines > 5001) throw new ValidationException("CSV too large (max 5000 rows)");
                sb.append(line).append('\n');
            }
            return sb.toString();
        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception ex) {
            throw new ValidationException("Could not read the uploaded spreadsheet");
        }
    }
}
