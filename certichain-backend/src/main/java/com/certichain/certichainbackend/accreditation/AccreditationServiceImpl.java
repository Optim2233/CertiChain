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
import com.certichain.certichainbackend.common.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final InstitutionDocumentRepository institutionDocumentRepository;
    private final CredentialRepository credentialRepository;
    private final CurrentUser currentUser;

    @Override
    // Not @Cacheable: Spring Data's PageImpl has no default constructor and does not
    // survive the Redis JSON round trip (InvalidDefinitionException: no Creators).
    public Page<Institution> listInstitutions(String status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("appliedAt").descending());
        if (status == null || status.isBlank()) {
            return institutionRepository.findAll(pageRequest);
        }
        return institutionRepository.findByStatus(parseStatus(status), pageRequest);
    }

    @Override
    @Cacheable(cacheNames = "accreditation", key = "'disputedInstitutionIds'")
    public List<UUID> institutionsWithOpenDisputes() {
        return credentialRepository.findInstitutionIdsWithOpenDisputes();
    }

    @Override
    @Cacheable(cacheNames = "accreditation", key = "'institution:' + #id")
    public Institution getInstitution(UUID id) {
        return load(id);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void approve(UUID id) {
        Institution institution = transition(id, InstitutionStatus.APPROVED, null,
                InstitutionStatus.PENDING);
        institution.setStatusReason(null);
        audit("Institution approved", id);
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
        institution.setStatusReason(note);
        audit("Information requested", id);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void reject(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REJECTED, reason, InstitutionStatus.PENDING);
        audit("Institution rejected", id);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void suspend(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.SUSPENDED, reason, InstitutionStatus.APPROVED);
        audit("Institution suspended", id);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void reinstate(UUID id) {
        // Positive action, no reason required - and it clears the suspension reason.
        Institution institution = transition(id, InstitutionStatus.APPROVED, null,
                InstitutionStatus.SUSPENDED);
        institution.setStatusReason(null);
        audit("Institution reinstated", id);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void revoke(UUID id, String reason) {
        requireReason(reason, "reason");
        transition(id, InstitutionStatus.REVOKED, reason,
                InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED);
        audit("Institution revoked", id);
    }

    @Override
    // Not @Cacheable: see listInstitutions - PageImpl does not survive Redis JSON.
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
    @Cacheable(cacheNames = "accreditation", key = "'documents:' + #institutionId")
    public List<InstitutionDocumentResponse> listDocuments(UUID institutionId) {
        return institutionDocumentRepository.findByInstitutionId(institutionId).stream()
                .map(d -> new InstitutionDocumentResponse(
                        d.getId(), d.getFileName(), d.isVerified(), d.getUploadedAt()))
                .toList();
    }

    @Override
    @Cacheable(cacheNames = "accreditation", key = "'document:' + #institutionId + ':' + #documentId")
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

    @Override
    @Transactional
    @CacheEvict(cacheNames = "accreditation", allEntries = true)
    public void verifyDocument(UUID institutionId, UUID documentId) {
        InstitutionDocument document = getDocument(institutionId, documentId);
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
        // Every decision here is institution-facing - notify every account tied to it
        // (usually just one, but nothing stops an institution having more than one login).
        for (User user : userRepository.findByInstitutionId(institutionId)) {
            notificationService.notify(user.getId(), event, event);
        }
    }
}
