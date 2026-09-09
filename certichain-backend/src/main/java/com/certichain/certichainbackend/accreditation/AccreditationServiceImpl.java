package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The trust registry. Every mutation writes an audit row inside the same transaction as the
 * status change - a status change without its audit entry is a bug, so they commit together.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccreditationServiceImpl implements AccreditationService {

    private final InstitutionRepository institutionRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final InstitutionDocumentRepository institutionDocumentRepository;
    private final CredentialRepository credentialRepository;
    private final CurrentUser currentUser;
    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final PiiCryptoService piiCryptoService;

    @Override
    // Not @Cacheable: Spring Data's PageImpl has no default constructor and does not
    // survive the Redis JSON round trip (InvalidDefinitionException: no Creators).
    public Page<Institution> listInstitutions(String status, String q, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("appliedAt").descending());
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasQuery = q != null && !q.isBlank();
        InstitutionStatus parsed = hasStatus ? parseStatus(status) : null;

        if (hasQuery) {
            String term = q.strip();
            return (hasStatus
                    ? institutionRepository.searchByNameAndStatus(term, parsed, pageRequest)
                    : institutionRepository.searchByName(term, pageRequest))
                    .map(piiCryptoService::decryptedCopy);
        }
        return (hasStatus
                ? institutionRepository.findByStatus(parsed, pageRequest)
                : institutionRepository.findAll(pageRequest))
                .map(piiCryptoService::decryptedCopy);
    }

    @Override
    @Cacheable(cacheNames = "accreditation", key = "'disputedInstitutionIds'")
    public List<UUID> institutionsWithOpenDisputes() {
        return credentialRepository.findInstitutionIdsWithOpenDisputes();
    }

    @Override
    // Not cached: returns decrypted PII, and plaintext PII must not sit in Redis.
    public InstitutionDetailResponse getInstitution(UUID id) {
        Institution i = piiCryptoService.decryptedCopy(load(id));
        User contact = userRepository.findByInstitutionId(id).stream()
                .min(Comparator.comparing(User::getCreatedAt))   // oldest = the registrant
                .orElse(null);
        return new InstitutionDetailResponse(
                i.getId(), i.getName(), i.getMinistry(), i.getStatus(), i.getStatusReason(),
                i.getAppliedAt(), i.getDecidedAt(), i.getPublicKey(), i.getKeyAlgorithm(),
                i.getKeyGeneratedAt(), i.getPhone(), i.getWebsite(), i.getProfileImageUrl(),
                i.getBrandColor(), i.getAccentPattern(), i.getUpdatedAt(), i.getVersion(),
                contact == null ? null : piiCryptoService.decryptUserField(contact.getEmail()),
                contact == null ? null : contact.getCreatedAt(),
                i.getInstitutionType(), i.getInstitutionNameMm(), i.getInstitutionCategory(),
                i.getStateRegion(), i.getDistrict(), i.getTownship(), i.getWard(),
                i.getStreet(), i.getPostalCode(),
                i.getYearEstablished(), i.getEstablishmentDocType(), i.getEstablishmentDocTitle(),
                i.getEstablishmentDocRef(),
                i.getEstablishmentDocIssueDate() == null ? null : i.getEstablishmentDocIssueDate().toString(),
                i.getEstablishmentDocUrl(),
                i.getCompanyName(), i.getDicaCertificateNumber(), i.getMycoRegistrationNumber(),
                i.getTinNumber(),
                i.getIncorporationDate() == null ? null : i.getIncorporationDate().toString(),
                i.getOwnershipStructure(), i.getInvestmentAmount(), i.getForeignInvolvement(),
                i.getMicPermitNumber(),
                i.getDicaCertificateUrl(), i.getTaxClearanceUrl(), i.getMicPermitUrl(),
                i.getFounders(), i.getAdministrator());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void approve(UUID id) {
        // REJECTED is allowed alongside PENDING so the authority can reconsider a rejected
        // application rather than forcing the institution to reapply from scratch.
        Institution institution = transition(id, InstitutionStatus.APPROVED, null,
                InstitutionStatus.PENDING, InstitutionStatus.REJECTED);
        institution.setStatusReason(null);

        // Mint this institution's Data Encryption Key here, once, at first approval - never
        // manually, never per-record. Guarded on dekWrapped being unset since the state
        // machine only ever reaches APPROVED via this method (REVOKED is terminal, so a
        // second approve() on the same institution can't normally happen).
        if (institution.getDekWrapped() == null) {
            SecretKey dek = envelopeEncryptionService.generateDek();
            EncryptedPayload wrapped = envelopeEncryptionService.encrypt(
                    dek.getEncoded(), envelopeEncryptionService.kek());
            institution.setDekWrapped(wrapped.ciphertext());
            institution.setDekIv(wrapped.iv());
        }

        audit("Institution approved", id,
                "Your institution registration was approved. You can now sign in and issue credentials.");
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void requestInfo(UUID id, String note) {
        requireReason(note, "note");
        // Deliberately NOT a status change: the application stays PENDING and the note is
        // surfaced to the institution so it can resubmit without starting over. decidedAt
        // stays null because no decision has been made yet.
        Institution institution = load(id);
        if (institution.getStatus() != InstitutionStatus.PENDING) {
            throw new ValidationException("Information can only be requested on a PENDING application");
        }
        institution.setStatusReason(piiCryptoService.encryptInstitutionField(note.trim(), id));
        audit("Information requested", id,
                "The authority requested more information on your application: " + note.trim());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void reject(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REJECTED, reason, InstitutionStatus.PENDING);
        audit("Institution rejected", id,
                "Your institution registration was rejected. Reason: " + reason.trim()
                        + " You can edit and resubmit your application.");
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void suspend(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.SUSPENDED, reason, InstitutionStatus.APPROVED);
        audit("Institution suspended", id,
                "Your institution was suspended. Reason: " + reason.trim());
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void reinstate(UUID id) {
        // Positive action, no reason required - and it clears the suspension reason.
        Institution institution = transition(id, InstitutionStatus.APPROVED, null,
                InstitutionStatus.SUSPENDED);
        institution.setStatusReason(null);
        // Pre-encryption institutions suspended before their first DEK mint would
        // otherwise stay DEK-less forever (approve() is the only minter).
        if (institution.getDekWrapped() == null) {
            SecretKey dek = envelopeEncryptionService.generateDek();
            EncryptedPayload wrapped = envelopeEncryptionService.encrypt(
                    dek.getEncoded(), envelopeEncryptionService.kek());
            institution.setDekWrapped(wrapped.ciphertext());
            institution.setDekIv(wrapped.iv());
        }
        audit("Institution reinstated", id,
                "Your institution was reinstated. You can now sign in and issue credentials.");
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void revoke(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REVOKED, reason,
                InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED);
        audit("Institution revoked", id,
                "Your institution was revoked. Reason: " + reason.trim());
    }

    @Override
    // Not @Cacheable: see listInstitutions - PageImpl does not survive Redis JSON.
    public Page<AuditLogEntryResponse> auditLog(UUID institutionId, String q, String event, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        String trimmedQ = (q == null || q.isBlank()) ? null : q.trim();
        String trimmedEvent = (event == null || event.isBlank()) ? null : event.trim();
        boolean hasQ = trimmedQ != null;
        boolean hasEvent = trimmedEvent != null;

        Page<AuditLogEntry> entries;
        if (institutionId != null) {
            entries = hasQ
                    ? auditLogEntryRepository.findByInstitutionIdAndEventContainingIgnoreCase(institutionId, trimmedQ, pageRequest)
                    : hasEvent
                        ? auditLogEntryRepository.findByInstitutionIdAndEvent(institutionId, trimmedEvent, pageRequest)
                        : auditLogEntryRepository.findByInstitutionId(institutionId, pageRequest);
        } else {
            entries = hasQ
                    ? auditLogEntryRepository.findByEventContainingIgnoreCase(trimmedQ, pageRequest)
                    : hasEvent
                        ? auditLogEntryRepository.findByEvent(trimmedEvent, pageRequest)
                        : auditLogEntryRepository.findAll(pageRequest);
        }

        // A raw UUID in "actor" means nothing to whoever reads the log - batch-resolve
        // to email in one query rather than N+1 per row.
        var actorIds = entries.getContent().stream()
                .map(AuditLogEntry::getActorUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, String> emailsById = userRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(User::getId,
                        u -> piiCryptoService.decryptUserField(u.getEmail())));

        return entries.map(entry -> new AuditLogEntryResponse(
                entry.getId(),
                entry.getEvent(),
                emailsById.get(entry.getActorUserId()),
                entry.getInstitutionId(),
                entry.getCredentialId(),
                entry.getOccurredAt()
        ));
    }

    @Override
    @Cacheable(cacheNames = "accreditation", key = "'documents:' + #institutionId")
    public List<InstitutionDocumentResponse> listDocuments(UUID institutionId) {
        return institutionDocumentRepository.findByInstitutionId(institutionId).stream()
                .map(d -> new InstitutionDocumentResponse(
                        d.getId(), d.getFileName(), d.isVerified(), d.getUploadedAt()))
                .toList();
    }

    @Override
    // Not cached: returns a decrypted copy, and plaintext PII must not sit in Redis.
    public InstitutionDocument getDocument(UUID institutionId, UUID documentId) {
        InstitutionDocument document = institutionDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        // Without this check, any document id would be downloadable regardless of which
        // institution's review page it was requested from.
        if (!document.getInstitutionId().equals(institutionId)) {
            throw new ResourceNotFoundException("Document not found");
        }
        // Detached copy with file_data decrypted - never mutate the managed row's bytes.
        return InstitutionDocument.builder()
                .id(document.getId()).institutionId(document.getInstitutionId())
                .fileName(document.getFileName())
                .fileData(decryptDocumentBytes(document))
                .fileUrl(document.getFileUrl()).verified(document.isVerified())
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    private byte[] decryptDocumentBytes(InstitutionDocument document) {
        byte[] data = document.getFileData();
        if (data == null || data.length == 0 || document.getFileUrl() != null) {
            return data; // Supabase-backed rows store empty bytes + URL - nothing to decrypt
        }
        try {
            return piiCryptoService.decryptBytes(data, document.getInstitutionId());
        } catch (RuntimeException e) {
            return data; // pre-backfill plaintext PDF - serve as-is until encrypted
        }
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void verifyDocument(UUID institutionId, UUID documentId) {
        // Managed row, not the decrypted copy from getDocument() - the flag must persist.
        InstitutionDocument document = institutionDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        if (!document.getInstitutionId().equals(institutionId)) {
            throw new ResourceNotFoundException("Document not found");
        }
        // One-way action: verifying twice would silently no-op the second click, which
        // would hide a stale-UI bug rather than surface it.
        if (document.isVerified()) {
            throw new ValidationException("Document is already verified");
        }
        document.setVerified(true);
        auditLogService.log(AuditEvents.DOCUMENT_VERIFIED_EVENT, currentUser.id(), institutionId, null);
    }

    /**
     * The whole status state machine. Every transition goes through here so the terminal
     * rule can't be forgotten on one branch.
     */
    private Institution transition(UUID id, InstitutionStatus to, String reason,
                                    InstitutionStatus... allowedFrom) {
        Institution institution = load(id);
        InstitutionStatus from = institution.getStatus();

        // REVOKED is permanent. No endpoint may ever move an institution out of it.
        if (from == InstitutionStatus.REVOKED) {
            throw new ForbiddenActionException(
                    "Institution is revoked - this is terminal and cannot be changed");
        }
        if (!Arrays.asList(allowedFrom).contains(from)) {
            throw new ValidationException("Cannot move institution from " + from + " to " + to);
        }

        institution.setStatus(to);
        if (reason != null) {
            institution.setStatusReason(piiCryptoService.encryptInstitutionField(reason.trim(), id));
        }
        institution.setDecidedAt(Instant.now());
        return institution;
    }

    private Institution load(UUID id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution not found"));
    }

    /** Validate before loading so a missing reason is a 400, not a 404-then-400. */
    private void requireReason(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(fieldName + " is required");
        }
    }

    private InstitutionStatus parseStatus(String status) {
        try {
            return InstitutionStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Unknown status: " + status);
        }
    }

    private void audit(String event, UUID institutionId, String message) {
        auditLogService.log(event, currentUser.id(), institutionId, null);
        // Every decision here is institution-facing - notify every account tied to it
        // (usually just one, but nothing stops an institution having more than one login).
        // notify() writes the in-app row AND sends the Gmail email, on first decision
        // and on every re-decision alike.
        for (User user : userRepository.findByInstitutionId(institutionId)) {
            notificationService.notify(user.getId(), event, message);
        }
    }
}
