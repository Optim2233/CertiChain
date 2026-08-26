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
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    @Override
    @Transactional
    public Institution apply(String name, String ministry, String email, String password,
                              List<MultipartFile> documents) {
        requireText(name, "name");
        requireText(ministry, "ministry");
        requireText(email, "email");
        requireText(password, "password");
        if (userRepository.existsByEmail(email)) {
            throw new ValidationException("Email already registered");
        }

        // Institution first: the user row's FK and the chk_user_institution_role CHECK both
        // need the institution to exist already.
        Institution institution = institutionRepository.save(Institution.builder()
                .name(name)
                .ministry(ministry)
                .status(InstitutionStatus.PENDING)
                .appliedAt(Instant.now())
                .build());

        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.INSTITUTION)
                .institutionId(institution.getId())
                .createdAt(Instant.now())
                .build());

        if (documents != null) {
            for (MultipartFile document : documents) {
                if (document == null || document.isEmpty()) {
                    continue;
                }
                institutionDocumentRepository.save(InstitutionDocument.builder()
                        .institutionId(institution.getId())
                        .fileName(document.getOriginalFilename())
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
    @Cacheable(cacheNames = "institution",
            key = "'credentials:' + @currentUser.institutionId() + ':' + #status + ':' + #page + ':' + #size")
    public Page<Credential> listCredentials(String status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("issuedAt").descending());
        if (status == null || status.isBlank()) {
            return credentialRepository.findByInstitutionId(currentUser.institutionId(), pageRequest);
        }
        return credentialRepository.findByInstitutionIdAndStatus(
                currentUser.institutionId(), parseCredentialStatus(status), pageRequest);
    }

    @Override
    @Cacheable(cacheNames = "institution", key = "'summary:' + @currentUser.institutionId()")
    public CredentialSummary getCredentialSummary() {
        UUID institutionId = currentUser.institutionId();
        return new CredentialSummary(
                credentialRepository.countByInstitutionId(institutionId),
                credentialRepository.countByInstitutionIdAndStatus(institutionId, CredentialStatus.REVOKED),
                credentialRepository.countByInstitutionIdAndStatus(institutionId, CredentialStatus.PENDING_CLAIM));
    }

    @Override
    @Cacheable(cacheNames = "institution", key = "'analytics:' + @currentUser.institutionId()")
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

    /** Native query rows come back as [Timestamp, Long] - map to the response record's shape. */
    private List<DailyCount> toDailyCounts(List<Object[]> rows) {
        return rows.stream()
                .map(row -> new DailyCount(
                        ((java.sql.Timestamp) row[0]).toInstant().atZone(ZoneOffset.UTC).toLocalDate(),
                        ((Number) row[1]).longValue()))
                .toList();
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
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public List<Map<String, Object>> issueBatch(MultipartFile spreadsheet) {
        // Synchronous with per-row results: one bad row is a row-level error, never a failed
        // request. Rows are fully validated before anything is written, so a rejected row
        // leaves nothing behind.
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
                Credential credential = issue(email, fields, type, expiresAt);
                result.put("status", "OK");
                result.put("credentialId", credential.getId());
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
        credential.setStatus(CredentialStatus.REVOKED);
        credential.setRevokeReason(reason);
        credential.setRevokedAt(Instant.now());
        auditLogService.log("Certificate revoked", currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(credential.getGraduateUserId(), "Certificate revoked",
                "A credential you hold was revoked. Reason: " + reason);
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
            auditLogService.log("Certificate revoked", currentUser.id(),
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
        SignedCredential signed = signingService.signCredential(toSign, credential.getInstitutionId());
        credential.setMerkleRoot(signed.merkleRoot());
        credential.setSignature(signed.signature());

        credentialFieldRepository.deleteByCredentialId(credential.getId());
        for (SignedCredential.FieldWithIndex field : signed.fields()) {
            credentialFieldRepository.save(CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    .merkleIndex(field.merkleIndex())
                    .build());
        }
    }

    /**
     * The single issuance path - single certificates, activity records and every batch row
     * funnel through here, so the APPROVED gate cannot be bypassed on one of them.
     */
    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type, Instant expiresAt) {
        requireText(graduateEmail, "graduate_email");
        UUID institutionId = currentUser.institutionId();
        Institution institution = load(institutionId);
        if (institution.getStatus() != InstitutionStatus.APPROVED) {
            throw new ForbiddenActionException(
                    "Institution is not approved to issue credentials (status: "
                            + institution.getStatus() + ")");
        }

        SignedCredential signed = signingService.signCredential(fields, institutionId);

        // Claim-on-issue: an existing account gets the credential outright, otherwise it
        // waits in PENDING_CLAIM until that email signs up.
        Optional<User> graduate = userRepository.findByEmail(graduateEmail);
        Credential credential = credentialRepository.save(Credential.builder()
                .type(type)
                .institutionId(institutionId)
                .graduateUserId(graduate.map(User::getId).orElse(null))
                .graduateEmail(graduateEmail)
                .status(graduate.isPresent() ? CredentialStatus.ISSUED : CredentialStatus.PENDING_CLAIM)
                .merkleRoot(signed.merkleRoot())
                .signature(signed.signature())
                .issuedAt(Instant.now())
                .expiresAt(expiresAt)
                .build());

        for (SignedCredential.FieldWithIndex field : signed.fields()) {
            credentialFieldRepository.save(CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    // The signed tree's index, never the loop counter - they must agree or
                    // proofs won't reconstruct.
                    .merkleIndex(field.merkleIndex())
                    .build());
        }
        auditLogService.log(AuditEvents.CERTIFICATE_ISSUED_EVENT, currentUser.id(), institutionId, credential.getId());
        // Unclaimed (PENDING_CLAIM) credentials have no user yet - notify() no-ops on null.
        notificationService.notify(credential.getGraduateUserId(), "Certificate issued",
                "A new credential has been issued to you by an accredited institution.");
        return credential;
    }

    /**
     * Header row names the fields; graduate_email is the one reserved column.
     *
     * ponytail: naive split(",") - breaks on quoted values containing commas. Swap in
     * commons-csv if a real institution's export needs quoting.
     */
    static List<Map<String, String>> parseCsv(String content) {
        List<Map<String, String>> rows = new ArrayList<>();
        String[] lines = content.split("\\r?\\n");
        if (lines.length == 0 || lines[0].isBlank()) {
            return rows;
        }

        // Excel writes a UTF-8 BOM; without stripping it the first column name never matches.
        String headerLine = lines[0].startsWith("﻿") ? lines[0].substring(1) : lines[0];
        String[] headers = headerLine.split(",");
        for (int i = 0; i < headers.length; i++) {
            headers[i] = headers[i].trim();
        }

        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank()) {
                continue;
            }
            String[] values = lines[i].split(",", -1);
            Map<String, String> row = new LinkedHashMap<>();
            for (int c = 0; c < headers.length; c++) {
                row.put(headers[c], c < values.length ? values[c].trim() : "");
            }
            rows.add(row);
        }
        return rows;
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
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().reduce(new StringBuilder(),
                    (sb, line) -> sb.append(line).append('\n'), StringBuilder::append).toString();
        } catch (Exception ex) {
            throw new ValidationException("Could not read the uploaded spreadsheet");
        }
    }
}
