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
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final PiiCryptoService piiCryptoService;

    @Override
    @Transactional
    public Institution apply(ApplyInstitutionRequest req) {
        requireText(req.getName(), "name");
        requireText(req.getEmail(), "email");
        requireText(req.getPassword(), "password");
        if (userRepository.existsByEmailHmac(piiCryptoService.emailHmac(req.getEmail()))) throw new ValidationException("Email already registered");
        if (req.getPhone() != null && req.getPhone().length() > 50) throw new ValidationException("phone too long (max 50)");
        if (req.getWebsite() != null && req.getWebsite().length() > 255) throw new ValidationException("website too long (max 255)");

        String type = req.getInstitutionType() != null ? req.getInstitutionType().trim().toLowerCase() : null;
        // backward compat: old clients send ministry but no institutionType -> treat as private
        if (type == null) {
            if (req.getGoverningMinistry() != null && !req.getGoverningMinistry().isBlank()) type = "private";
            else type = "private";
        }
        if (!type.equals("public") && !type.equals("private")) throw new ValidationException("institutionType must be public or private");
        if (req.getInstitutionCategory() != null && !req.getInstitutionCategory().isBlank()) {
            String cat = req.getInstitutionCategory().trim();
            if (!java.util.Set.of("university","college","degreeCollege","institute","center").contains(cat))
                throw new ValidationException("Invalid institutionCategory");
        }
        if ("public".equals(type)) {
            if (req.getGoverningMinistry() == null || req.getGoverningMinistry().isBlank())
                throw new ValidationException("governingMinistry is required for public institutions");
        }

        // validate JSONB shapes lightly (must be valid JSON)
        String foundersJson = req.getFoundersJson() != null && !req.getFoundersJson().isBlank() ? req.getFoundersJson().trim() : "[]";
        String adminJson = req.getAdministratorJson();
        // ponytail: light JSON shape check without extra dep; full parse if jackson available, else just brackets
        if (adminJson != null && !adminJson.isBlank()) {
            String t = adminJson.trim();
            if (!(t.startsWith("{") && t.endsWith("}"))) throw new ValidationException("Invalid administrator JSON");
        }
        { String t = foundersJson.trim(); if (!(t.startsWith("[") && t.endsWith("]"))) throw new ValidationException("Invalid founders JSON"); }

        java.time.LocalDate estDate = null;
        if (req.getEstablishmentDocIssueDate() != null && !req.getEstablishmentDocIssueDate().isBlank()) {
            try { estDate = java.time.LocalDate.parse(req.getEstablishmentDocIssueDate().trim()); }
            catch (Exception e) { throw new ValidationException("Invalid establishmentDocIssueDate (expected YYYY-MM-DD)"); }
        }
        java.time.LocalDate incorpDate = null;
        if (req.getIncorporationDate() != null && !req.getIncorporationDate().isBlank()) {
            try { incorpDate = java.time.LocalDate.parse(req.getIncorporationDate().trim()); }
            catch (Exception e) { throw new ValidationException("Invalid incorporationDate (expected YYYY-MM-DD)"); }
        }

        // Mint the DEK at application time (not approval) so applicant PII is encrypted
        // from the first write. approve()/reinstate() keep their mint-if-unset guards for
        // pre-encryption rows.
        javax.crypto.SecretKey newDek = credentialFieldCryptoService.generateDek();
        com.certichain.certichainbackend.common.service.EncryptedPayload wrappedDek =
                credentialFieldCryptoService.wrapDek(newDek);

        Institution institution = Institution.builder()
                .name(req.getName().trim())
                .ministry(req.getGoverningMinistry() != null && !req.getGoverningMinistry().isBlank() ? req.getGoverningMinistry().trim() : null)
                .institutionType(type)
                .institutionNameMm(req.getInstitutionNameMm() != null && !req.getInstitutionNameMm().isBlank() ? req.getInstitutionNameMm().trim() : null)
                .institutionCategory(req.getInstitutionCategory() != null && !req.getInstitutionCategory().isBlank() ? req.getInstitutionCategory().trim() : null)
                .phone(piiCryptoService.encryptInstitutionField(trimToNull(req.getPhone()), newDek))
                .website(req.getWebsite() != null && !req.getWebsite().isBlank() ? req.getWebsite().trim() : null)
                .stateRegion(req.getStateRegion() != null && !req.getStateRegion().isBlank() ? req.getStateRegion().trim() : null)
                .district(req.getDistrict() != null && !req.getDistrict().isBlank() ? req.getDistrict().trim() : null)
                .township(req.getTownship() != null && !req.getTownship().isBlank() ? req.getTownship().trim() : null)
                .ward(piiCryptoService.encryptInstitutionField(trimToNull(req.getWard()), newDek))
                .street(piiCryptoService.encryptInstitutionField(trimToNull(req.getStreet()), newDek))
                .postalCode(piiCryptoService.encryptInstitutionField(trimToNull(req.getPostalCode()), newDek))
                .yearEstablished(req.getYearEstablished())
                .establishmentDocType(req.getEstablishmentDocType() != null && !req.getEstablishmentDocType().isBlank() ? req.getEstablishmentDocType().trim() : null)
                .establishmentDocTitle(piiCryptoService.encryptInstitutionField(trimToNull(req.getEstablishmentDocTitle()), newDek))
                .establishmentDocRef(piiCryptoService.encryptInstitutionField(trimToNull(req.getEstablishmentDocRef()), newDek))
                .establishmentDocIssueDate(estDate)
                .companyName(piiCryptoService.encryptInstitutionField(trimToNull(req.getCompanyName()), newDek))
                .dicaCertificateNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getDicaCertificateNumber()), newDek))
                .mycoRegistrationNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getMycoRegistrationNumber()), newDek))
                .tinNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getTinNumber()), newDek))
                .incorporationDate(incorpDate)
                .ownershipStructure(req.getOwnershipStructure() != null && !req.getOwnershipStructure().isBlank() ? req.getOwnershipStructure().trim() : null)
                .investmentAmount(req.getInvestmentAmount())
                .foreignInvolvement(Boolean.TRUE.equals(req.getForeignInvolvement()))
                .micPermitNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getMicPermitNumber()), newDek))
                .founders(piiCryptoService.encryptJson(foundersJson, newDek))
                .administrator(piiCryptoService.encryptJson(
                        adminJson != null && !adminJson.isBlank() ? adminJson.trim() : null, newDek))
                .dekWrapped(wrappedDek.ciphertext())
                .dekIv(wrappedDek.iv())
                .status(InstitutionStatus.PENDING)
                .appliedAt(Instant.now())
                .build();

        institution = institutionRepository.save(institution);

        // Supabase uploads (preferred) — fall back to inline BYTEA only if not configured
        institution.setEstablishmentDocUrl(uploadIfPresent(institution.getId(), "establishment", req.getEstablishmentDocFile()));
        institution.setDicaCertificateUrl(uploadIfPresent(institution.getId(), "dica", req.getDicaCertificate()));
        institution.setTaxClearanceUrl(uploadIfPresent(institution.getId(), "tax", req.getTaxClearance()));
        institution.setMicPermitUrl(uploadIfPresent(institution.getId(), "mic", req.getMicPermit()));
        institution = institutionRepository.save(institution);

        // legacy documents[] fallback (inline BYTEA)
        if (req.getDocuments() != null) {
            for (MultipartFile document : req.getDocuments()) {
                if (document == null || document.isEmpty()) continue;
                if (document.getSize() > 10L * 1024 * 1024) throw new ValidationException("Document too large (max 10MB): " + document.getOriginalFilename());
                String fn = document.getOriginalFilename();
                if (fn != null && fn.length() > 255) throw new ValidationException("File name too long (max 255)");
                String ct = document.getContentType();
                if (ct != null && !ct.equals("application/pdf") && !ct.equals("application/octet-stream"))
                    throw new ValidationException("Only PDF documents are accepted");
                String safeName = fn == null || fn.isBlank() ? "document.pdf" : fn.replaceAll("[^a-zA-Z0-9._-]", "_");
                // try Supabase first
                String url = null;
                if (supabaseStorageService.isConfigured()) {
                    try { url = supabaseStorageService.uploadDocument(institution.getId(), "legacy", document); } catch (Exception ignored) {}
                }
                InstitutionDocument doc = InstitutionDocument.builder()
                        .institutionId(institution.getId())
                        .fileName(safeName)
                        .fileData(url != null ? new byte[0] : piiCryptoService.encryptBytes(
                                readBytes(document), institution.getId()))
                        .fileUrl(url)
                        .uploadedAt(Instant.now())
                        .build();
                institutionDocumentRepository.save(doc);
            }
        }

        String normEmail = PiiCryptoService.normalizeEmail(req.getEmail());
        userRepository.save(User.builder()
                .email(piiCryptoService.encryptUserField(normEmail))
                .emailHmac(piiCryptoService.emailHmac(normEmail))
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(Role.INSTITUTION)
                .institutionId(institution.getId())
                .createdAt(Instant.now())
                .lastBriefedAt(Instant.now())
                .build());

        auditLogService.log("Institution application submitted", null, institution.getId(), null);
        // Decrypted copy with the just-minted DEK: the managed entity holds ciphertext
        // from here on. Key-direct (no storage re-read) so the response can't fail
        // independently of the write that just succeeded.
        return piiCryptoService.decryptedCopy(institution, newDek);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Institution resubmit(ApplyInstitutionRequest req) {
        Institution institution = load(currentUser.institutionId());
        if (institution.getStatus() != InstitutionStatus.REJECTED) {
            throw new ValidationException("Only a REJECTED application can be resubmitted");
        }
        UUID id = institution.getId();
        if (req.getName() != null && !req.getName().isBlank()) institution.setName(req.getName().trim());
        if (req.getPhone() != null) institution.setPhone(piiCryptoService.encryptInstitutionField(trimToNull(req.getPhone()), id));
        if (req.getWebsite() != null) institution.setWebsite(trimToNull(req.getWebsite()));
        if (req.getInstitutionNameMm() != null) institution.setInstitutionNameMm(trimToNull(req.getInstitutionNameMm()));
        if (req.getInstitutionCategory() != null && !req.getInstitutionCategory().isBlank()) institution.setInstitutionCategory(req.getInstitutionCategory().trim());
        if (req.getInstitutionType() != null && !req.getInstitutionType().isBlank()) {
            String t = req.getInstitutionType().trim().toLowerCase();
            if (!t.equals("public") && !t.equals("private")) throw new ValidationException("institutionType must be public or private");
            institution.setInstitutionType(t);
        }
        if (req.getStateRegion() != null) institution.setStateRegion(trimToNull(req.getStateRegion()));
        if (req.getDistrict() != null) institution.setDistrict(trimToNull(req.getDistrict()));
        if (req.getTownship() != null) institution.setTownship(trimToNull(req.getTownship()));
        if (req.getWard() != null) institution.setWard(piiCryptoService.encryptInstitutionField(trimToNull(req.getWard()), id));
        if (req.getStreet() != null) institution.setStreet(piiCryptoService.encryptInstitutionField(trimToNull(req.getStreet()), id));
        if (req.getPostalCode() != null) institution.setPostalCode(piiCryptoService.encryptInstitutionField(trimToNull(req.getPostalCode()), id));
        if (req.getGoverningMinistry() != null) institution.setMinistry(trimToNull(req.getGoverningMinistry()));
        if (req.getYearEstablished() != null) institution.setYearEstablished(req.getYearEstablished());
        if (req.getEstablishmentDocType() != null) institution.setEstablishmentDocType(trimToNull(req.getEstablishmentDocType()));
        if (req.getEstablishmentDocTitle() != null) institution.setEstablishmentDocTitle(piiCryptoService.encryptInstitutionField(trimToNull(req.getEstablishmentDocTitle()), id));
        if (req.getEstablishmentDocRef() != null) institution.setEstablishmentDocRef(piiCryptoService.encryptInstitutionField(trimToNull(req.getEstablishmentDocRef()), id));
        if (req.getEstablishmentDocIssueDate() != null && !req.getEstablishmentDocIssueDate().isBlank()) {
            try { institution.setEstablishmentDocIssueDate(java.time.LocalDate.parse(req.getEstablishmentDocIssueDate().trim())); }
            catch (Exception e) { throw new ValidationException("Invalid establishmentDocIssueDate (expected YYYY-MM-DD)"); }
        }
        if (req.getCompanyName() != null) institution.setCompanyName(piiCryptoService.encryptInstitutionField(trimToNull(req.getCompanyName()), id));
        if (req.getDicaCertificateNumber() != null) institution.setDicaCertificateNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getDicaCertificateNumber()), id));
        if (req.getMycoRegistrationNumber() != null) institution.setMycoRegistrationNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getMycoRegistrationNumber()), id));
        if (req.getTinNumber() != null) institution.setTinNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getTinNumber()), id));
        if (req.getIncorporationDate() != null && !req.getIncorporationDate().isBlank()) {
            try { institution.setIncorporationDate(java.time.LocalDate.parse(req.getIncorporationDate().trim())); }
            catch (Exception e) { throw new ValidationException("Invalid incorporationDate (expected YYYY-MM-DD)"); }
        }
        if (req.getOwnershipStructure() != null) institution.setOwnershipStructure(trimToNull(req.getOwnershipStructure()));
        if (req.getInvestmentAmount() != null) institution.setInvestmentAmount(req.getInvestmentAmount());
        if (req.getForeignInvolvement() != null) institution.setForeignInvolvement(req.getForeignInvolvement());
        if (req.getMicPermitNumber() != null) institution.setMicPermitNumber(piiCryptoService.encryptInstitutionField(trimToNull(req.getMicPermitNumber()), id));
        if (req.getFoundersJson() != null && !req.getFoundersJson().isBlank()) {
            String t = req.getFoundersJson().trim();
            if (!(t.startsWith("[") && t.endsWith("]"))) throw new ValidationException("Invalid founders JSON");
            institution.setFounders(piiCryptoService.encryptJson(t, id));
        }
        if (req.getAdministratorJson() != null && !req.getAdministratorJson().isBlank()) {
            String t = req.getAdministratorJson().trim();
            if (!(t.startsWith("{") && t.endsWith("}"))) throw new ValidationException("Invalid administrator JSON");
            institution.setAdministrator(piiCryptoService.encryptJson(t, id));
        }
        String url;
        if ((url = uploadIfPresent(id, "establishment", req.getEstablishmentDocFile())) != null) institution.setEstablishmentDocUrl(url);
        if ((url = uploadIfPresent(id, "dica", req.getDicaCertificate())) != null) institution.setDicaCertificateUrl(url);
        if ((url = uploadIfPresent(id, "tax", req.getTaxClearance())) != null) institution.setTaxClearanceUrl(url);
        if ((url = uploadIfPresent(id, "mic", req.getMicPermit())) != null) institution.setMicPermitUrl(url);
        institution.setStatus(InstitutionStatus.PENDING);
        institution.setStatusReason(null);
        institution.setDecidedAt(null);
        institution.setAppliedAt(Instant.now());
        institution = institutionRepository.save(institution);
        auditLogService.log("Institution application resubmitted", currentUser.id(), id, null);
        return piiCryptoService.decryptedCopy(institution);
    }

    private String uploadIfPresent(UUID instId, String kind, MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (supabaseStorageService.isConfigured()) {
            return supabaseStorageService.uploadDocument(instId, kind, file);
        }
        // dev fallback: store inline as legacy document and return null URL (will be read from institution_document)
        InstitutionDocument doc = InstitutionDocument.builder()
                .institutionId(instId)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_") : kind + ".pdf")
                .fileData(piiCryptoService.encryptBytes(readBytes(file), instId))
                .uploadedAt(Instant.now())
                .build();
        institutionDocumentRepository.save(doc);
        return null;
    }

    @Override
    @Cacheable(cacheNames = "institution", key = "'own:' + @currentUser.institutionId()")
    public Institution getOwnInstitution() {
        return piiCryptoService.decryptedCopy(load(currentUser.institutionId()));
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Institution updateOwnInstitution(String name, String phone, String website,
                                             String profileImageUrl, MultipartFile profileImage,
                                             String brandColor, String accentPattern,
                                             String secondaryBrandColor, String accentColor,
                                             String patternScale,
                                             String titleFont, String medalPosition, String watermarkIcon) {
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
            UUID instId = institution.getId();
            if (!java.util.Objects.equals(trimmed,
                    piiCryptoService.decryptInstitutionField(institution.getPhone(), instId))) {
                institution.setPhone(piiCryptoService.encryptInstitutionField(trimmed, instId));
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
                double ratio = contrastRatioAgainstWhite(trimmed);
                if (ratio < MIN_CONTRAST_RATIO) {
                    throw new ValidationException(String.format(
                            "brand color is too light for white text (contrast %.2f:1, need at least %.1f:1) - pick a deeper shade",
                            ratio, MIN_CONTRAST_RATIO));
                }
            }
            if (!java.util.Objects.equals(trimmed, institution.getBrandColor())) {
                institution.setBrandColor(trimmed);
                changed = true;
            }
        }
        if (accentPattern != null && !accentPattern.isBlank()) {
            String trimmed = accentPattern.trim().toLowerCase();
            if (!java.util.Set.of("hatch","dots","none","grid","waves","circles").contains(trimmed)) {
                throw new ValidationException("accent pattern must be one of: hatch, dots, none, grid, waves, circles");
            }
            if (!trimmed.equals(institution.getAccentPattern())) {
                institution.setAccentPattern(trimmed);
                changed = true;
            }
        }
        if (secondaryBrandColor != null) {
            String t = secondaryBrandColor.isBlank() ? null : secondaryBrandColor.trim();
            if (t != null) {
                if (!t.matches("^#[0-9a-fA-F]{6}$")) throw new ValidationException("secondary brand color must be #RRGGBB");
                double ratio = contrastRatioAgainstWhite(t);
                if (ratio < MIN_CONTRAST_RATIO) throw new ValidationException(String.format(
                        "secondary brand color is too light for white text (contrast %.2f:1, need at least %.1f:1)",
                        ratio, MIN_CONTRAST_RATIO));
            }
            if (!java.util.Objects.equals(t, institution.getSecondaryBrandColor())) { institution.setSecondaryBrandColor(t); changed = true; }
        }
        if (accentColor != null && !accentColor.isBlank()) {
            String t = accentColor.trim().toLowerCase();
            if (!java.util.Set.of("light","brand","gold").contains(t)) throw new ValidationException("accentColor must be light, brand or gold");
            if (!t.equals(institution.getAccentColor())) { institution.setAccentColor(t); changed = true; }
        }
        if (patternScale != null && !patternScale.isBlank()) {
            String t = patternScale.trim().toLowerCase();
            if (!java.util.Set.of("sm","md","lg").contains(t)) throw new ValidationException("patternScale must be sm, md, lg");
            if (!t.equals(institution.getPatternScale())) { institution.setPatternScale(t); changed = true; }
        }
        if (titleFont != null && !titleFont.isBlank()) {
            String t = titleFont.trim().toLowerCase();
            if (!java.util.Set.of("heading","serif","mono").contains(t)) throw new ValidationException("titleFont must be heading, serif, mono");
            if (!t.equals(institution.getTitleFont())) { institution.setTitleFont(t); changed = true; }
        }
        if (medalPosition != null && !medalPosition.isBlank()) {
            String t = medalPosition.trim().toLowerCase();
            if (!java.util.Set.of("top-left","top-right").contains(t)) throw new ValidationException("medalPosition must be top-left or top-right");
            if (!t.equals(institution.getMedalPosition())) { institution.setMedalPosition(t); changed = true; }
        }
        if (watermarkIcon != null && !watermarkIcon.isBlank()) {
            String t = watermarkIcon.trim().toLowerCase();
            if (!java.util.Set.of("workspace_premium","verified","stars","none").contains(t)) throw new ValidationException("watermarkIcon must be workspace_premium, verified, stars, none");
            if (!t.equals(institution.getWatermarkIcon())) { institution.setWatermarkIcon(t); changed = true; }
        }

        if (changed) {
            institution = institutionRepository.save(institution);
            auditLogService.log("Institution profile updated", currentUser.id(), institution.getId(), null);
        }
        return piiCryptoService.decryptedCopy(institution);
    }

    /** WCAG contrast ratio of white (#FFFFFF) against the given #RRGGBB colour. */
    // WCAG's large/bold-text threshold (not the 4.5 normal-text one) - the card title
    // this guards is always large, bold text, so 3.0 is the right bar, not 4.5.
    private static final double MIN_CONTRAST_RATIO = 3.0;

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
        Page<Credential> result;
        if (status == null || status.isBlank()) {
            result = credentialRepository.findByInstitutionId(currentUser.institutionId(), pageRequest);
        } else {
            result = credentialRepository.findByInstitutionIdAndStatus(
                    currentUser.institutionId(), parseCredentialStatus(status), pageRequest);
        }
        // Decrypted copies: the controller maps CredentialResponse::from over this page.
        return result.map(piiCryptoService::decryptedCredentialCopy);
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

    // Single-record return, so it survives the Redis round trip (see CacheSerializationTest) -
    // cached because this method scans every credential/dispute row for the institution.
    @Override
    @Cacheable(cacheNames = "institution", key = "'analytics:' + @currentUser.institutionId() + ':' + #days")
    public InstitutionAnalytics getAnalytics(int days) {
        int d = (days == 7 || days == 30 || days == 90 || days == 180 || days == 365) ? days : 30;
        UUID institutionId = currentUser.institutionId();
        Instant now = Instant.now();
        Instant since = now.minus(d, ChronoUnit.DAYS);
        Instant soon30 = now.plus(30, ChronoUnit.DAYS);

        List<Credential> credentials = credentialRepository.findByInstitutionId(institutionId);
        List<UUID> credentialIds = credentials.stream().map(Credential::getId).toList();

        int totalVerifications = credentialIds.isEmpty() ? 0
                : auditLogEntryRepository.countByEventAndCredentialIdIn(AuditEvents.VERIFY_EVENT, credentialIds);
        int totalRevokedVerifications = credentialIds.isEmpty() ? 0
                : auditLogEntryRepository.countByEventAndCredentialIdIn(AuditEvents.VERIFY_REVOKED_EVENT, credentialIds);

        // status breakdown
        int issued = 0, revoked = 0, pendingClaim = 0, expired = 0;
        int cert = 0, act = 0;
        Map<String, Long> revokeReasons = new java.util.HashMap<>();
        // for claim latency / expiry buckets
        int c0_7 = 0, c8_30 = 0, c31_90 = 0, c90p = 0, cUnclaimed = 0;
        int e0_7 = 0, e8_30 = 0, e31_90 = 0;
        for (Credential c : credentials) {
            if (c.getStatus() == CredentialStatus.REVOKED) revoked++;
            else if (c.getStatus() == CredentialStatus.PENDING_CLAIM) pendingClaim++;
            else if (c.getStatus() == CredentialStatus.ISSUED) {
                if (c.getExpiresAt() != null && c.getExpiresAt().isBefore(now)) expired++;
                else issued++;
            }
            if (c.getType() == CredentialType.CERTIFICATE) cert++; else act++;
            if (c.getStatus() == CredentialStatus.REVOKED && c.getRevokeReason() != null) {
                String key = piiCryptoService.decryptInstitutionField(
                        c.getRevokeReason(), c.getInstitutionId()).trim();
                if (!key.isEmpty()) revokeReasons.merge(key.length() > 60 ? key.substring(0,60) : key, 1L, Long::sum);
            }
            // expiry buckets (only non-revoked, non-expired with future expiry)
            if (c.getStatus() == CredentialStatus.ISSUED && c.getExpiresAt() != null && c.getExpiresAt().isAfter(now)) {
                long daysToExpiry = ChronoUnit.DAYS.between(now, c.getExpiresAt());
                if (daysToExpiry <= 7) e0_7++;
                else if (daysToExpiry <= 30) e8_30++;
                else if (daysToExpiry <= 90) e31_90++;
            }
            // claim latency: ponytail — no claimed_at column, approx from status
            // PENDING_CLAIM = unclaimed, else assume claimed within bucket by age (conservative)
            if (c.getStatus() == CredentialStatus.PENDING_CLAIM) cUnclaimed++;
            else {
                long ageDays = ChronoUnit.DAYS.between(c.getIssuedAt(), now);
                // if still pending logic not needed; for issued/revoked we bucket by age as proxy
                // ponytail: add claimed_at column if precise latency needed
                if (ageDays <= 7) c0_7++;
                else if (ageDays <= 30) c8_30++;
                else if (ageDays <= 90) c31_90++;
                else c90p++;
            }
        }
        // ponytail: top verified via in-memory count map (cheap for <10k creds); add GROUP BY query if larger
        List<InstitutionAnalytics.TopCredential> topVerified = List.of();
        if (!credentialIds.isEmpty()) {
            Map<UUID, Long> counts = auditLogEntryRepository.findByEventAndCredentialIdInOrderByOccurredAtDesc(
                    AuditEvents.VERIFY_EVENT, credentialIds).stream()
                    .collect(Collectors.groupingBy(com.certichain.certichainbackend.common.entity.AuditLogEntry::getCredentialId, Collectors.counting()));
            // also include revoked verifications in counts? keep separate — top is clean verifies
            // title rows are ciphertext in the DB - decrypt per owning institution (this
            // institution's own DEK only) so the labels are readable. Per-row isolation:
            // one bad title/DEK falls back to the id-prefix label below instead of 500ing
            // the whole dashboard.
            Map<UUID, UUID> credentialToInstitution = credentials.stream()
                    .collect(Collectors.toMap(Credential::getId, Credential::getInstitutionId));
            final Map<UUID, String> titleById =
                    decryptTitlesOrEmpty(credentialToInstitution, credentialIds);
            topVerified = counts.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                    .limit(5)
                    .map(e -> new InstitutionAnalytics.TopCredential(e.getKey().toString(),
                            titleById.getOrDefault(e.getKey(), e.getKey().toString().substring(0,8)), e.getValue()))
                    .toList();
        }

        // disputes + disputesByDay (grouped in-memory from dispute_flag — no audit event for flag)
        int open = 0, upheld = 0, dismissed = 0;
        int disputeCert = 0, disputeAct = 0;
        Double medianHours = null;
        Map<String, Long> disputeReasons = new java.util.HashMap<>();
        List<DisputeFlag> allFlags = List.of();
        if (!credentialIds.isEmpty()) {
            Map<UUID, CredentialType> typeById = credentials.stream()
                    .collect(Collectors.toMap(Credential::getId, Credential::getType));
            allFlags = disputeFlagRepository.findByCredentialIdInOrderByCreatedAtDesc(credentialIds);
            List<Long> hours = new ArrayList<>();
            for (DisputeFlag f : allFlags) {
                if (f.getStatus() == DisputeStatus.OPEN) open++;
                else if (f.getStatus() == DisputeStatus.UPHELD) upheld++;
                else if (f.getStatus() == DisputeStatus.DISMISSED) dismissed++;
                if (f.getResolvedAt() != null) {
                    hours.add(ChronoUnit.HOURS.between(f.getCreatedAt(), f.getResolvedAt()));
                }
                if (typeById.get(f.getCredentialId()) == CredentialType.CERTIFICATE) disputeCert++; else disputeAct++;
                if (f.getReason() != null) {
                    String key = f.getReason().trim();
                    if (!key.isEmpty()) disputeReasons.merge(key.length() > 60 ? key.substring(0, 60) : key, 1L, Long::sum);
                }
            }
            if (!hours.isEmpty()) {
                hours.sort(Long::compareTo);
                int mid = hours.size() / 2;
                medianHours = hours.size() % 2 == 0 ? (hours.get(mid-1)+hours.get(mid))/2.0 : (double) hours.get(mid);
            }
        }
        Map<String, Long> topDisputeReasons = disputeReasons.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a,b)->a, LinkedHashMap::new));

        double yield = credentials.isEmpty() ? 0 : (double) totalVerifications / credentials.size();
        // revoke reason top 3
        Map<String, Long> topReasons = revokeReasons.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(5)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a,b)->a, LinkedHashMap::new));

        // disputesByDay from dispute_flag createdAt
        Map<LocalDate, Long> disputeDayMap = allFlags.stream()
                .filter(f -> !f.getCreatedAt().isBefore(since))
                .collect(Collectors.groupingBy(f -> f.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(), Collectors.counting()));
        List<DailyCount> disputesByDay = disputeDayMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new DailyCount(e.getKey(), e.getValue()))
                .toList();

        return new InstitutionAnalytics(
                credentials.size(),
                totalVerifications,
                totalRevokedVerifications,
                credentialRepository.countByInstitutionIdAndStatusAndExpiresAtBetween(
                        institutionId, CredentialStatus.ISSUED, now, soon30),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.CERTIFICATE_ISSUED_EVENT, since)),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.VERIFY_EVENT, since)),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.VERIFY_REVOKED_EVENT, since)),
                toDailyCounts(auditLogEntryRepository.dailyCountsByInstitutionAndEvent(
                        institutionId, AuditEvents.CERTIFICATE_REVOKED_EVENT, since)),
                disputesByDay,
                new InstitutionAnalytics.StatusBreakdown(issued, revoked, pendingClaim, expired),
                new InstitutionAnalytics.TypeBreakdown(cert, act),
                new InstitutionAnalytics.DisputeSummary(open, upheld, dismissed, medianHours),
                List.of(new InstitutionAnalytics.Bucket("0-7d", c0_7), new InstitutionAnalytics.Bucket("8-30d", c8_30),
                        new InstitutionAnalytics.Bucket("31-90d", c31_90), new InstitutionAnalytics.Bucket("90d+", c90p),
                        new InstitutionAnalytics.Bucket("Unclaimed", cUnclaimed)),
                List.of(new InstitutionAnalytics.Bucket("0-7 days", e0_7), new InstitutionAnalytics.Bucket("8-30 days", e8_30),
                        new InstitutionAnalytics.Bucket("31-90 days", e31_90)),
                topVerified,
                Math.round(yield*1000)/1000.0,
                topReasons,
                new InstitutionAnalytics.TypeBreakdown(disputeCert, disputeAct),
                topDisputeReasons);
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
        return piiCryptoService.decryptedCredentialCopy(
                issue(graduateEmail, parsed, CredentialType.CERTIFICATE, expiresAt));
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public Credential issueActivityRecord(String graduateEmail, String activity, String date, Instant expiresAt) {
        requireText(activity, "activity");
        requireText(date, "date");
        return piiCryptoService.decryptedCredentialCopy(issue(graduateEmail,
                List.of(new Field("activity", activity), new Field("date", date)),
                CredentialType.ACTIVITY_RECORD, expiresAt));
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public List<Map<String, Object>> issueBatch(MultipartFile spreadsheet, String batchName) {
        // @Transactional (read-write) is required: the class default is readOnly=true, under
        // which Hibernate silently skips the flush and every issued row is discarded on commit.
        // Per-row errors are caught inside the loop, so a bad row never rolls back good ones.
        // Synchronous with per-row results: one bad row is a row-level error, never a failed
        // request. Rows are fully validated before anything is written, so a rejected row
        // leaves nothing behind.
        UUID batchId = UUID.randomUUID();
        String trimmedBatchName = (batchName == null || batchName.isBlank()) ? null : batchName.trim();
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
    public void unrevokeCredential(UUID credentialId) {
        Credential credential = ownCredential(credentialId);
        if (credential.getStatus() != CredentialStatus.REVOKED) {
            throw new ValidationException("Credential is not revoked");
        }
        applyRestoration(credential);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public BatchRevokeResult revokeBatch(UUID batchId, String reason, List<UUID> credentialIds) {
        requireText(reason, "reason");
        List<Credential> members = credentialRepository.findByInstitutionIdAndBatchId(
                currentUser.institutionId(), batchId);
        // Empty also covers a batch owned by another institution - the institutionId filter
        // makes it indistinguishable from "no such batch", same as ownCredential's 404.
        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Batch not found");
        }
        // credentialIds absent/empty -> whole-batch revoke (original behaviour, unchanged).
        // Present -> only revoke the selected subset; anything outside the batch is ignored
        // rather than erroring, since the id list is a filter, not a separate lookup.
        Set<UUID> selection = (credentialIds == null || credentialIds.isEmpty())
                ? null : new java.util.HashSet<>(credentialIds);
        int revoked = 0;
        int alreadyRevoked = 0;
        for (Credential credential : members) {
            if (selection != null && !selection.contains(credential.getId())) {
                continue;
            }
            if (credential.getStatus() == CredentialStatus.REVOKED) {
                alreadyRevoked++;
                continue;
            }
            applyRevocation(credential, reason);
            revoked++;
        }
        return new BatchRevokeResult(revoked, alreadyRevoked);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "institution", allEntries = true)
    public BatchUnrevokeResult unrevokeBatch(UUID batchId, List<UUID> credentialIds) {
        List<Credential> members = credentialRepository.findByInstitutionIdAndBatchId(
                currentUser.institutionId(), batchId);
        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Batch not found");
        }
        // Same selection semantics as revokeBatch: absent/empty -> whole batch, else the subset.
        Set<UUID> selection = (credentialIds == null || credentialIds.isEmpty())
                ? null : new java.util.HashSet<>(credentialIds);
        int restored = 0;
        int alreadyActive = 0;
        for (Credential credential : members) {
            if (selection != null && !selection.contains(credential.getId())) {
                continue;
            }
            if (credential.getStatus() != CredentialStatus.REVOKED) {
                alreadyActive++;
                continue;
            }
            applyRestoration(credential);
            restored++;
        }
        return new BatchUnrevokeResult(restored, alreadyActive);
    }

    /** Shared revoke behaviour: status + reason + timestamp, audit entry, graduate notification. */
    private void applyRevocation(Credential credential, String reason) {
        credential.setStatus(CredentialStatus.REVOKED);
        credential.setRevokeReason(piiCryptoService.encryptInstitutionField(
                reason, credential.getInstitutionId()));
        credential.setRevokedAt(Instant.now());
        auditLogService.log(AuditEvents.CERTIFICATE_REVOKED_EVENT, currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(credential.getGraduateUserId(), "Certificate revoked",
                "A credential you hold was revoked. Reason: " + reason);
    }

    /**
     * Shared restore behaviour: flips status back to ISSUED and clears the revoke
     * metadata. The prior revoke's audit entry is left in place (it's history, not
     * an error) and a new "Certificate restored" entry is added alongside it, so
     * the timeline reads "revoked on X, restored on Y" rather than erasing that it
     * ever happened. Revoke never touches merkleRoot/signature (see applyRevocation),
     * so restoring doesn't need to re-sign either — it's a status-field flip both ways.
     */
    private void applyRestoration(Credential credential) {
        credential.setStatus(CredentialStatus.ISSUED);
        credential.setRevokeReason(null);
        credential.setRevokedAt(null);
        auditLogService.log(AuditEvents.CERTIFICATE_RESTORED_EVENT, currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(credential.getGraduateUserId(), "Certificate restored",
                "A credential you hold that was previously revoked has been restored by the issuing institution.");
    }

    @Override
    public List<BatchSummaryRow> listBatches() {
        return credentialRepository.findBatchSummaries(currentUser.institutionId());
    }

    @Override
    // Not cached: returns decrypted copies (title etc.), same rationale as getCredential.
    public List<Credential> listBatchMembers(UUID batchId) {
        List<Credential> members = credentialRepository.findByInstitutionIdAndBatchId(
                currentUser.institutionId(), batchId);
        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Batch not found");
        }
        return members.stream().map(piiCryptoService::decryptedCredentialCopy).toList();
    }

    @Override
    @Cacheable(cacheNames = "institution",
            key = "'credentialFields:' + @currentUser.institutionId() + ':' + #credentialId")
    public List<CredentialField> getCredentialFields(UUID credentialId) {
        ownCredential(credentialId); // authorization check only
        List<CredentialField> fields =
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId);
        return credentialFieldCryptoService.decrypted(fields, currentUser.institutionId());
    }

    @Override
    // Not cached: returns a decrypted copy, and plaintext PII must not sit in Redis.
    // Single indexed PK lookup - the cache bought little anyway.
    public Credential getCredential(UUID credentialId) {
        return piiCryptoService.decryptedCredentialCopy(ownCredential(credentialId));
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
        return piiCryptoService.decryptedCredentialCopy(credential);
    }

    @Override
    // Not cached: returns decrypted copies, and plaintext PII must not sit in Redis.
    // Indexed per-institution queries - the cache bought little at this scale.
    public List<InstitutionDisputeResponse> listDisputes() {
        List<Credential> credentials = credentialRepository.findByInstitutionId(currentUser.institutionId());
        if (credentials.isEmpty()) {
            return List.of(); // an empty IN () is a SQL error on some drivers
        }
        List<UUID> credentialIds = credentials.stream().map(Credential::getId).toList();

        List<DisputeFlag> flags = disputeFlagRepository.findByCredentialIdInOrderByCreatedAtDesc(credentialIds);
        if (flags.isEmpty()) {
            return List.of();
        }

        Map<UUID, Credential> credById = credentials.stream()
                .collect(Collectors.toMap(Credential::getId, Function.identity()));
        // title lives in the 'title' CredentialField row; one batch query, no N+1. The row
        // comes back as ciphertext, so decrypt per owning institution before wiring it in.
        // Per-row isolation: one bad title falls back to null below, not a 500 for the list.
        Map<UUID, UUID> credentialToInstitution = credById.values().stream()
                .collect(Collectors.toMap(Credential::getId, Credential::getInstitutionId));
        final Map<UUID, String> titleById = decryptTitlesOrEmpty(credentialToInstitution, credentialIds);

        return flags.stream().map(f -> {
            Credential c = credById.get(f.getCredentialId());
            UUID instId = c != null ? c.getInstitutionId() : currentUser.institutionId();
            String gradEmail = c != null
                    ? piiCryptoService.decryptUserField(c.getGraduateEmail()) : null;
            // Dispute text lives under the issuing institution's DEK (same key as revoke reasons).
            return new InstitutionDisputeResponse(
                    f.getId(), f.getCredentialId(),
                    titleById.get(f.getCredentialId()),
                    c != null ? c.getType() : null,
                    gradEmail,
                    piiCryptoService.decryptInstitutionField(f.getReason(), instId),
                    f.getStatus(),
                    piiCryptoService.decryptInstitutionField(f.getResolutionNote(), instId),
                    f.getCreatedAt(), f.getResolvedAt());
        }).toList();
    }

    @Override
    @Transactional
    // Resolution must show on the graduate's table immediately, not after the 5-min TTL.
    @Caching(evict = {
            @CacheEvict(cacheNames = "institution", allEntries = true),
            @CacheEvict(cacheNames = "graduate", allEntries = true),
            @CacheEvict(cacheNames = "currentUser", allEntries = true)}
    )
    public void upholdDispute(UUID disputeId, String resolutionNote, String action, List<Map<String, String>> fields) {
        requireText(resolutionNote, "resolution_note");
        DisputeFlag dispute = openDispute(disputeId);
        Credential credential = ownCredential(dispute.getCredentialId());

        if ("REVOKE".equalsIgnoreCase(action)) {
            credential.setStatus(CredentialStatus.REVOKED);
            credential.setRevokeReason(piiCryptoService.encryptInstitutionField(
                    resolutionNote, credential.getInstitutionId()));
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
                List<CredentialField> existing =
                        credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId());
                toSign = credentialFieldCryptoService.decrypted(existing, credential.getInstitutionId()).stream()
                        .map(f -> new Field(f.getFieldName(), f.getFieldValue()))
                        .toList();
            }

            resignFields(credential, toSign);
        } else {
            throw new ValidationException("action must be EDIT or REVOKE");
        }

        dispute.setStatus(DisputeStatus.UPHELD);
        dispute.setResolutionNote(piiCryptoService.encryptInstitutionField(
                resolutionNote, credential.getInstitutionId()));
        dispute.setResolvedAt(Instant.now());
        auditLogService.log("Dispute upheld", currentUser.id(),
                credential.getInstitutionId(), credential.getId());
        notificationService.notify(dispute.getGraduateUserId(), "Dispute upheld",
                "Your dispute was upheld. Resolution: " + resolutionNote);
    }

    @Override
    @Transactional
    // Resolution must show on the graduate's table immediately, not after the 5-min TTL.
    @Caching(evict = {
            @CacheEvict(cacheNames = "institution", allEntries = true),
            @CacheEvict(cacheNames = "graduate", allEntries = true),
            @CacheEvict(cacheNames = "currentUser", allEntries = true)})
    public void dismissDispute(UUID disputeId, String resolutionNote) {
        requireText(resolutionNote, "resolution_note");
        DisputeFlag dispute = openDispute(disputeId);
        Credential credential = ownCredential(dispute.getCredentialId());

        // Record stands as issued - the credential is deliberately untouched.
        dispute.setStatus(DisputeStatus.DISMISSED);
        dispute.setResolutionNote(piiCryptoService.encryptInstitutionField(
                resolutionNote, credential.getInstitutionId()));
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
        for (SignedCredential.FieldWithIndex field : signed.fields()) {
            CredentialField toSave = CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    .merkleIndex(field.merkleIndex())
                    .build();
            credentialFieldCryptoService.encryptForStorage(toSave, credential.getInstitutionId());
            credentialFieldRepository.save(toSave);
        }
    }

    /**
     * The single issuance path - single certificates, activity records and every batch row
     * funnel through here, so the APPROVED gate cannot be bypassed on one of them.
     */
    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type, Instant expiresAt) {
        return issue(graduateEmail, fields, type, expiresAt, null, null);
    }

    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type,
                             Instant expiresAt, UUID batchId) {
        return issue(graduateEmail, fields, type, expiresAt, batchId, null);
    }

    private Credential issue(String graduateEmail, List<Field> fields, CredentialType type,
                             Instant expiresAt, UUID batchId, String batchName) {
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
        Optional<User> graduate = userRepository.findByEmailHmac(piiCryptoService.emailHmac(normGradEmail));
        Credential credential = credentialRepository.save(Credential.builder()
                .type(type)
                .institutionId(institutionId)
                .graduateUserId(graduate.map(User::getId).orElse(null))
                .graduateEmail(piiCryptoService.encryptUserField(normGradEmail))
                .graduateEmailHmac(piiCryptoService.emailHmac(normGradEmail))
                .batchId(batchId)
                .batchName(batchName)
                .status(graduate.isPresent() ? CredentialStatus.ISSUED : CredentialStatus.PENDING_CLAIM)
                .merkleRoot(signed.merkleRoot())
                .signature(signed.signature())
                .issuedAt(Instant.now())
                .expiresAt(expiresAt)
                .build());

for (SignedCredential.FieldWithIndex field : signed.fields()) {
            CredentialField toSave = CredentialField.builder()
                    .credentialId(credential.getId())
                    .fieldName(field.name())
                    .fieldValue(field.value())
                    .merkleIndex(field.merkleIndex())
                    .build();
            credentialFieldCryptoService.encryptForStorage(toSave, institutionId);
            credentialFieldRepository.save(toSave);
        }
        auditLogService.log(AuditEvents.CERTIFICATE_ISSUED_EVENT, currentUser.id(), institutionId, credential.getId());
        // Unclaimed (PENDING_CLAIM) credentials have no user yet - notify() no-ops on null,
        // so email the address directly or the graduate never learns the credential exists.
        if (credential.getGraduateUserId() != null) {
            notificationService.notify(credential.getGraduateUserId(), "Certificate issued",
                    "A new credential has been issued to you by an accredited institution.");
        } else {
            notificationService.notifyEmail(normGradEmail, "Certificate issued",
                    "A new credential has been issued to you by an accredited institution. Sign up with this email address to claim it.");
        }
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

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String[] splitCsvLine(String line) {        List<String> out = new ArrayList<>();
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

    /**
     * Batch-decrypts "title" rows, failing closed to an empty map so one bad
     * title/DEK falls back to the caller's default label instead of 500ing the
     * whole list. The returned map is a fresh local per call - safe for lambdas.
     */
    private Map<UUID, String> decryptTitlesOrEmpty(Map<UUID, UUID> credentialToInstitution,
                                                   List<UUID> credentialIds) {
        try {
            return credentialFieldCryptoService.decryptedTitlesByCredential(
                    credentialToInstitution,
                    credentialFieldRepository.findByCredentialIdInAndFieldName(credentialIds, "title"));
        } catch (RuntimeException e) {
            return Map.of();
        }
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
