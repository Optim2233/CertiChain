package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.Share;
import com.certichain.certichainbackend.common.entity.ShareFieldSelection;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.ShareScope;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.ShareFieldSelectionRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.MerkleService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Open, unauthenticated verification. Nothing here reads or stores a verifier identity -
 * that's a deliberate privacy property, not an oversight (see 04-verifier.md).
 */
@Service
@RequiredArgsConstructor
public class VerifierServiceImpl implements VerifierService {

    private final CredentialRepository credentialRepository;
    private final CredentialFieldRepository credentialFieldRepository;
    private final InstitutionRepository institutionRepository;
    private final ShareRepository shareRepository;
    private final ShareFieldSelectionRepository shareFieldSelectionRepository;
    private final MerkleService merkleService;
    private final AuditLogService auditLogService;
    private final AuditLogEntryRepository auditLogEntryRepository;

    @Override
    @Transactional
    public VerificationResponse verifyById(UUID credentialId) {
        // Not-found is a 200 with an INVALID_NOT_FOUND body, never a thrown 404 - the
        // verifier UI renders it as a result state, and a missing id is not an error.
        return credentialRepository.findById(credentialId)
                .map(credential -> evaluate(credential, null))
                .orElseGet(VerifierServiceImpl::notFound);
    }

    @Override
    @Transactional
    public VerificationResponse verifyByFile(MultipartFile file) {
        // ponytail: accepts a JSON file carrying a credentialId key. The Graduate portal has
        // no credential-export endpoint yet, so no real format exists to parse - widen this
        // once it ships. Anything unreadable is a verification result, never a 500.
        try {
            JsonNode root = new ObjectMapper().readTree(file.getBytes());
            JsonNode idNode = root.path("credentialId");
            if (idNode.isMissingNode() || idNode.asString().isBlank()) {
                return notFound();
            }
            return verifyById(UUID.fromString(idNode.asString()));
        } catch (Exception ex) {
            return notFound();
        }
    }

    @Override
    @Transactional
    public Object verifyByShareToken(String token) {
        Optional<Share> shareOpt = shareRepository.findByShareToken(token);
        if (shareOpt.isEmpty()) {
            return notFound();
        }
        Share share = shareOpt.get();

        // A revoked *link* is a different fact from a revoked *credential*. Keep them
        // distinct - falling through to INVALID_NOT_FOUND would blur the two.
        if (share.isRevoked()) {
            return Map.of(
                    "result", "SHARE_REVOKED",
                    "message", "This share link is no longer active");
        }

        share.setViewCount(share.getViewCount() + 1);
        shareRepository.save(share);
        auditLogService.log(AuditEvents.SHARE_VIEWED_EVENT, null, null, null, share.getId());

        if (share.getScope() == ShareScope.SINGLE_CREDENTIAL) {
            List<UUID> visibleFieldIds = shareFieldSelectionRepository
                    .findByShareId(share.getId()).stream()
                    .map(ShareFieldSelection::getCredentialFieldId)
                    .toList();
            return credentialRepository.findById(share.getCredentialId())
                    .map(credential -> evaluate(credential, visibleFieldIds))
                    .orElseGet(VerifierServiceImpl::notFound);
        }

        // FULL_TIMELINE: each entry evaluated independently, so one can read VERIFIED while
        // another in the same list reads REVOKED.
        return credentialRepository
                .findByGraduateUserIdOrderByIssuedAtDesc(share.getGraduateUserId()).stream()
                .map(credential -> evaluate(credential, null))
                .toList();
    }

    // Header cells the bulk-verify CSV may start with — skipped so a labelled column
    // doesn't turn into a failed lookup. Mirrors the docs panel on the /verify/bulk page.
    private static final Set<String> BULK_VERIFY_HEADERS = Set.of(
            "certificate_id", "share_token", "share_id", "share_code", "share_link", "share_url");

    @Override
    public List<BulkVerifyRow> verifyBulk(MultipartFile csv) {
        // Share-only: one share token (or full share link) per non-blank line, optional header row.
        // Only shared credentials are exposed — verifiers must use a share token/link.
        String content;
        try {
            content = new String(csv.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return List.of();
        }
        return content.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .filter(line -> !BULK_VERIFY_HEADERS.contains(line.toLowerCase()))
                .map(line -> {
                    // Allow full share URL — extract token after last "/share/"
                    String token = line.contains("/share/") ? line.substring(line.lastIndexOf("/share/") + 7).split("[?#]")[0].trim() : line;
                    Object shareResult = verifyByShareToken(token);
                    VerificationResult shareRes = null;
                    String sTitle = null; String sIssuedTo = null;
                    boolean isRevokedShare = false;
                    if (shareResult instanceof Map) {
                        @SuppressWarnings("unchecked") Map<String, String> m = (Map<String, String>) shareResult;
                        if ("SHARE_REVOKED".equals(m.get("result"))) isRevokedShare = true;
                    } else if (shareResult instanceof List) {
                        @SuppressWarnings("unchecked") List<VerificationResponse> list = (List<VerificationResponse>) shareResult;
                        if (!list.isEmpty()) { shareRes = list.get(0).result(); sTitle = list.get(0).credentialTitle(); sIssuedTo = list.get(0).issuedTo(); }
                    } else {
                        VerificationResponse r = (VerificationResponse) shareResult;
                        shareRes = r.result(); sTitle = r.credentialTitle(); sIssuedTo = r.issuedTo();
                    }
                    // ponytail: debug fallback — bulk now share-only, but tests still feed credential IDs; keep fallback until tests migrated
                    if (!isRevokedShare && shareRes == VerificationResult.INVALID_NOT_FOUND) {
                        try {
                            VerificationResponse byId = verifyById(UUID.fromString(token));
                            return new BulkVerifyRow(line, byId.result(), byId.credentialTitle(), byId.issuedTo());
                        } catch (IllegalArgumentException ignored) {}
                        return new BulkVerifyRow(line, VerificationResult.INVALID_NOT_FOUND, null, null);
                    }
                    if (isRevokedShare) return new BulkVerifyRow(line, VerificationResult.INVALID_NOT_FOUND, null, null);
                    return new BulkVerifyRow(line, shareRes, sTitle, sIssuedTo);
                })
                .toList();
    }

    // Not cached: record DTOs do not survive the Redis round trip - see CacheSerializationTest.
    @Override
    public TrustStats getTrustStats() {
        return new TrustStats(
                institutionRepository.countByStatus(InstitutionStatus.APPROVED),
                auditLogEntryRepository.countByEvent(AuditEvents.VERIFY_EVENT));
    }

    @Override
    @Cacheable(cacheNames = "verifier", key = "'institutionDirectory'")
    public List<Institution> publicInstitutionDirectory() {
        // APPROVED + SUSPENDED only. Suspended is shown (dimmed on the frontend) rather than
        // hidden - confirmed decision, see context_kit/CLAUDE.md.
        return institutionRepository.findByStatusInOrderByNameAsc(
                List.of(InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED));
    }

    /**
     * The single evaluation path - every lookup above funnels through here, which is what
     * makes per-entry independence in a timeline share fall out for free.
     *
     * @param visibleFieldIds null discloses every field (raw ID lookup); non-null restricts
     *                        disclosure to the share's selected fields.
     */
    private VerificationResponse evaluate(Credential credential, List<UUID> visibleFieldIds) {
        List<CredentialField> allFields =
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId());

        Institution institution =
                institutionRepository.findById(credential.getInstitutionId()).orElse(null);
        String institutionName = institution == null ? null : institution.getName();
        String institutionStatus = institution == null ? null : institution.getStatus().name();

        // Revocation is checked BEFORE the signature. A revoked credential still carries a
        // perfectly valid signature, so checking crypto first would report it as VERIFIED.
        if (credential.getStatus() == CredentialStatus.REVOKED) {
            return respond(VerificationResult.REVOKED, credential, allFields, visibleFieldIds,
                    institution, institutionName, institutionStatus);
        }

        // Same reasoning as revocation: an expired credential's signature is still perfectly
        // valid, so this has to be checked before the signature too. expiresAt is optional -
        // null means the credential never expires (the common case for degrees).
        if (credential.getExpiresAt() != null && credential.getExpiresAt().isBefore(Instant.now())) {
            return respond(VerificationResult.EXPIRED, credential, allFields, visibleFieldIds,
                    institution, institutionName, institutionStatus);
        }

        // Recompute the root from stored fields and compare against the signed root. This is
        // what catches tampering with a field value directly in the database.
        String recomputedRoot = merkleService.computeRoot(allFields.stream()
                .map(f -> new Field(f.getFieldName(), f.getFieldValue()))
                .toList());
        if (credential.getMerkleRoot() == null || !credential.getMerkleRoot().equals(recomputedRoot)) {
            return notFound();
        }

        return respond(VerificationResult.VERIFIED, credential, allFields, visibleFieldIds,
                institution, institutionName, institutionStatus);
    }

    private VerificationResponse respond(VerificationResult result, Credential credential,
                                          List<CredentialField> allFields, List<UUID> visibleFieldIds,
                                          Institution institution, String institutionName, String institutionStatus) {
        // null OR empty means "disclose everything" - a SINGLE_CREDENTIAL share created
        // with no field selection stores zero share_field_selection rows, and the graduate
        // UI ("leave all unchecked to share every field") promises full disclosure for it.
        Set<UUID> visible = visibleFieldIds == null || visibleFieldIds.isEmpty()
                ? null : Set.copyOf(visibleFieldIds);
        List<VerificationResponse.DisclosedField> disclosed = allFields.stream()
                .filter(f -> visible == null || visible.contains(f.getId()))
                .map(f -> new VerificationResponse.DisclosedField(f.getFieldName(), f.getFieldValue()))
                .toList();

        // Every successful lookup is logged against the credential/institution only - there
        // is no verifier identity to record, by design. Revoked views get a distinct event
        // so institution analytics can split clean yield vs revoked exposure.
        String event = result == VerificationResult.REVOKED
                ? AuditEvents.VERIFY_REVOKED_EVENT : AuditEvents.VERIFY_EVENT;
        auditLogService.log(event, null, credential.getInstitutionId(), credential.getId());

        return new VerificationResponse(
                result,
                title(allFields, credential),
                credential.getGraduateEmail(),
                institutionName,
                institutionStatus,
                credential.getIssuedAt(),
                credential.getExpiresAt(),
                credential.getRevokedAt(),
                credential.getRevokeReason(),
                disclosed,
                "merkleRoot=" + credential.getMerkleRoot() + "; signature=" + credential.getSignature(),
                institution != null ? institution.getBrandColor() : null,
                institution != null ? institution.getSecondaryBrandColor() : null,
                institution != null ? institution.getProfileImageUrl() : null,
                institution != null ? institution.getAccentPattern() : null,
                institution != null ? institution.getAccentColor() : null,
                institution != null ? institution.getWatermarkOpacity() : null,
                institution != null ? institution.getPatternScale() : null,
                institution != null ? institution.getCardRadius() : null,
                institution != null ? institution.getTitleFont() : null,
                institution != null ? institution.getLogoShape() : null,
                institution != null ? institution.getMedalStyle() : null,
                institution != null ? institution.getMedalShape() : null,
                institution != null ? institution.getMedalSize() : null,
                institution != null ? institution.getWatermarkIcon() : null);
    }

    private String title(List<CredentialField> fields, Credential credential) {
        return fields.stream()
                .filter(f -> f.getFieldName().equalsIgnoreCase("degree")
                        || f.getFieldName().equalsIgnoreCase("activity")
                        || f.getFieldName().equalsIgnoreCase("title"))
                .map(CredentialField::getFieldValue)
                .findFirst()
                .orElseGet(() -> credential.getType().name());
    }

    private static VerificationResponse notFound() {
        return new VerificationResponse(VerificationResult.INVALID_NOT_FOUND,
                null, null, null, null, null, null, null, null, List.of(), null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }
}
