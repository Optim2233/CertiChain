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
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Arrays;
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
    private final UserRepository userRepository;
    private final InstitutionDocumentRepository institutionDocumentRepository;
    private final CredentialRepository credentialRepository;
    private final CurrentUser currentUser;
    private final EnvelopeEncryptionService envelopeEncryptionService;

    @Override
    public Page<Institution> listInstitutions(String status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("appliedAt").descending());
        if (status == null || status.isBlank()) {
            return institutionRepository.findAll(pageRequest);
        }
        return institutionRepository.findByStatus(parseStatus(status), pageRequest);
    }

    @Override
    public List<UUID> institutionsWithOpenDisputes() {
        return credentialRepository.findInstitutionIdsWithOpenDisputes();
    }

    @Override
    public Institution getInstitution(UUID id) {
        return load(id);
    }

    @Override
    @Transactional
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

        audit("Institution approved", id);
    }

    @Override
    @Transactional
    public void requestInfo(UUID id, String note) {
        requireReason(note, "note");
        // Deliberately NOT a status change: the application stays PENDING and the note is
        // surfaced to the institution so it can resubmit without starting over. decidedAt
        // stays null because no decision has been made yet.
        Institution institution = load(id);
        if (institution.getStatus() != InstitutionStatus.PENDING) {
            throw new ValidationException("Information can only be requested on a PENDING application");
        }
        institution.setStatusReason(note);
        audit("Information requested", id);
    }

    @Override
    @Transactional
    public void reject(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REJECTED, reason, InstitutionStatus.PENDING);
        audit("Institution rejected", id);
    }

    @Override
    @Transactional
    public void suspend(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.SUSPENDED, reason, InstitutionStatus.APPROVED);
        audit("Institution suspended", id);
    }

    @Override
    @Transactional
    public void reinstate(UUID id) {
        // Positive action, no reason required - and it clears the suspension reason.
        Institution institution = transition(id, InstitutionStatus.APPROVED, null,
                InstitutionStatus.SUSPENDED);
        institution.setStatusReason(null);
        audit("Institution reinstated", id);
    }

    @Override
    @Transactional
    public void revoke(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REVOKED, reason,
                InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED);
        audit("Institution revoked", id);
    }

    @Override
    public Page<AuditLogEntryResponse> auditLog(UUID institutionId, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        Page<AuditLogEntry> entries = institutionId == null
                ? auditLogEntryRepository.findAll(pageRequest)
                : auditLogEntryRepository.findByInstitutionId(institutionId, pageRequest);

        // A raw UUID in "actor" means nothing to whoever reads the log - batch-resolve
        // to email in one query rather than N+1 per row.
        var actorIds = entries.getContent().stream()
                .map(AuditLogEntry::getActorUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, String> emailsById = userRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));

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
    public List<InstitutionDocumentResponse> listDocuments(UUID institutionId) {
        return institutionDocumentRepository.findByInstitutionId(institutionId).stream()
                .map(d -> new InstitutionDocumentResponse(
                        d.getId(), d.getFileName(), d.isVerified(), d.getUploadedAt()))
                .toList();
    }

    @Override
    public InstitutionDocument getDocument(UUID institutionId, UUID documentId) {
        InstitutionDocument document = institutionDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        // Without this check, any document id would be downloadable regardless of which
        // institution's review page it was requested from.
        if (!document.getInstitutionId().equals(institutionId)) {
            throw new ResourceNotFoundException("Document not found");
        }
        return document;
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
            institution.setStatusReason(reason);
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

    private void audit(String event, UUID institutionId) {
        auditLogService.log(event, currentUser.id(), institutionId, null);
    }
}
