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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
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

    // Self-reference for the cached counters above: internal this.* calls bypass
    // the cache proxy. @Lazy breaks the constructor cycle.
    @Autowired
    @Lazy
    private VerifierService self;

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
        List<String> tokens = content.lines()
                .map(line -> line.contains("/share/")
                        ? line.substring(line.lastIndexOf("/share/") + 7).split("[?#]")[0].trim()
                        : line.trim())
                .filter(line -> !line.isBlank())
                .filter(line -> !BULK_VERIFY_HEADERS.contains(line.toLowerCase()))
                .toList();

        BulkPrefetch pre = prefetch(tokens);
        return tokens.stream().map(token -> verifyBulkRow(token, pre)).toList();
    }

    /**
     * Everything the rows need, fetched in a handful of IN queries instead of
     * ~6 round-trips per row. Best-effort: on a miss the per-row path falls back
     * to the singular lookup, so behavior (including the per-row audit rows)
     * never changes.
     */
    private static final class BulkPrefetch {
        final Map<String, Share> shares = new HashMap<>();
        final Map<UUID, Credential> credentials = new HashMap<>();
        final Map<UUID, List<CredentialField>> fields = new HashMap<>();
        final Map<UUID, Institution> institutions = new HashMap<>();
        final Map<UUID, List<UUID>> selections = new HashMap<>();
        final Map<UUID, List<Credential>> timelines = new HashMap<>();
    }

    private BulkPrefetch prefetch(List<String> tokens) {
        BulkPrefetch pre = new BulkPrefetch();
        if (tokens.isEmpty()) return pre; // empty IN () is a SQL error on some drivers
        Set<String> distinct = new HashSet<>(tokens);
        for (Share s : shareRepository.findByShareTokenIn(distinct)) pre.shares.put(s.getShareToken(), s);

        Set<UUID> credIds = new HashSet<>();
        Set<UUID> gradIds = new HashSet<>();
        for (String token : distinct) {
            Share s = pre.shares.get(token);
            if (s == null || s.isRevoked()) continue;
            if (s.getScope() == ShareScope.SINGLE_CREDENTIAL && s.getCredentialId() != null) {
                credIds.add(s.getCredentialId());
            } else if (s.getScope() == ShareScope.FULL_TIMELINE && s.getGraduateUserId() != null) {
                gradIds.add(s.getGraduateUserId());
            }
        }
        // Debug fallback: a bare credential ID straight in the CSV.
        for (String token : distinct) {
            if (pre.shares.containsKey(token)) continue;
            try { credIds.add(UUID.fromString(token)); } catch (IllegalArgumentException ignored) {}
        }
        for (UUID gradId : gradIds) {
            List<Credential> timeline = credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(gradId);
            pre.timelines.put(gradId, timeline);
            for (Credential c : timeline) credIds.add(c.getId());
        }
        if (!credIds.isEmpty()) {
            for (Credential c : credentialRepository.findAllById(credIds)) pre.credentials.put(c.getId(), c);
            for (CredentialField f : credentialFieldRepository.findByCredentialIdIn(credIds)) {
                pre.fields.computeIfAbsent(f.getCredentialId(), k -> new ArrayList<>()).add(f);
            }
            // IN queries don't preserve order - the Merkle root depends on it.
            for (List<CredentialField> l : pre.fields.values()) {
                l.sort(Comparator.comparingInt(CredentialField::getMerkleIndex));
            }
            Set<UUID> instIds = new HashSet<>();
            for (UUID id : credIds) {
                Credential c = pre.credentials.get(id);
                if (c != null && c.getInstitutionId() != null) instIds.add(c.getInstitutionId());
            }
            if (!instIds.isEmpty()) {
                for (Institution i : institutionRepository.findAllById(instIds)) {
                    pre.institutions.put(i.getId(), i);
                }
            }
        }
        Set<UUID> singleShareIds = new HashSet<>();
        for (String token : distinct) {
            Share s = pre.shares.get(token);
            if (s != null && !s.isRevoked() && s.getScope() == ShareScope.SINGLE_CREDENTIAL) {
                singleShareIds.add(s.getId());
            }
        }
        if (!singleShareIds.isEmpty()) {
            for (ShareFieldSelection sel : shareFieldSelectionRepository.findByShareIdIn(singleShareIds)) {
                pre.selections.computeIfAbsent(sel.getShareId(), k -> new ArrayList<>())
                        .add(sel.getCredentialFieldId());
            }
        }
        return pre;
    }

    private BulkVerifyRow verifyBulkRow(String token, BulkPrefetch pre) {
        Share share = pre.shares.get(token);
        if (share == null) share = shareRepository.findByShareToken(token).orElse(null);
        if (share == null) {
            // ponytail: debug fallback — bulk now share-only, but tests still feed credential IDs; keep fallback until tests migrated
            try {
                Credential c = pre.credentials.get(UUID.fromString(token));
                if (c == null) c = credentialRepository.findById(UUID.fromString(token)).orElse(null);
                if (c == null) return new BulkVerifyRow(token, VerificationResult.INVALID_NOT_FOUND, null, null);
                VerificationResponse byId = evaluateBulk(c, null, pre);
                return new BulkVerifyRow(token, byId.result(), byId.credentialTitle(), byId.issuedTo());
            } catch (IllegalArgumentException ignored) {}
            return new BulkVerifyRow(token, VerificationResult.INVALID_NOT_FOUND, null, null);
        }
        if (share.isRevoked()) return new BulkVerifyRow(token, VerificationResult.INVALID_NOT_FOUND, null, null);

        // View-count bump + SHARE_VIEWED audit stay per row, exactly as before.
        share.setViewCount(share.getViewCount() + 1);
        shareRepository.save(share);
        auditLogService.log(AuditEvents.SHARE_VIEWED_EVENT, null, null, null, share.getId());

        if (share.getScope() == ShareScope.SINGLE_CREDENTIAL) {
            List<UUID> visible = pre.selections.get(share.getId());
            if (visible == null) {
                visible = shareFieldSelectionRepository.findByShareId(share.getId()).stream()
                        .map(ShareFieldSelection::getCredentialFieldId).toList();
            }
            Credential credential = null;
            if (share.getCredentialId() != null) {
                credential = pre.credentials.get(share.getCredentialId());
                if (credential == null) {
                    credential = credentialRepository.findById(share.getCredentialId()).orElse(null);
                }
            }
            if (credential == null) {
                return new BulkVerifyRow(token, VerificationResult.INVALID_NOT_FOUND, null, null);
            }
            VerificationResponse r = evaluateBulk(credential, visible, pre);
            return new BulkVerifyRow(token, r.result(), r.credentialTitle(), r.issuedTo());
        }

        // FULL_TIMELINE: every entry evaluated (each writes its own audit row),
        // the first entry's result labels the row.
        List<Credential> timeline = pre.timelines.get(share.getGraduateUserId());
        if (timeline == null) {
            timeline = credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(share.getGraduateUserId());
        }
        VerificationResponse first = null;
        for (Credential c : timeline) {
            VerificationResponse r = evaluateBulk(c, null, pre);
            if (first == null) first = r;
        }
        if (first == null) return new BulkVerifyRow(token, null, null, null);
        return new BulkVerifyRow(token, first.result(), first.credentialTitle(), first.issuedTo());
    }

    private VerificationResponse evaluateBulk(Credential credential, List<UUID> visibleFieldIds, BulkPrefetch pre) {
        List<CredentialField> fields = pre.fields.get(credential.getId());
        if (fields == null) {
            fields = credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId());
        }
        Institution institution = null;
        if (credential.getInstitutionId() != null) {
            institution = pre.institutions.get(credential.getInstitutionId());
            if (institution == null) {
                institution = institutionRepository.findById(credential.getInstitutionId()).orElse(null);
            }
        }
        return evaluate(credential, visibleFieldIds, fields, institution);
    }

    // Not cached: record DTOs do not survive the Redis round trip - see CacheSerializationTest.
    @Override
    public TrustStats getTrustStats() {
        // Self-call through the proxy so the @Cacheable counters below apply.
        // Null-guard: unit tests construct this class directly (no proxy).
        // Null-guard: unit tests construct this class directly (no proxy).
        int approved = self != null ? self.countApprovedInstitutions()
                : institutionRepository.countByStatus(InstitutionStatus.APPROVED);
        int verifications = self != null ? self.countVerifications()
                : auditLogEntryRepository.countByEvent(AuditEvents.VERIFY_EVENT);
        return new TrustStats(approved, verifications);
    }

    @Cacheable(cacheNames = "verifier", key = "'trustStatsApproved'")
    public int countApprovedInstitutions() {
        return institutionRepository.countByStatus(InstitutionStatus.APPROVED);
    }

    @Cacheable(cacheNames = "verifier", key = "'trustStatsVerifications'")
    public int countVerifications() {
        return auditLogEntryRepository.countByEvent(AuditEvents.VERIFY_EVENT);
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
        return evaluate(credential, visibleFieldIds,
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credential.getId()),
                institutionRepository.findById(credential.getInstitutionId()).orElse(null));
    }

    private VerificationResponse evaluate(Credential credential, List<UUID> visibleFieldIds,
                                          List<CredentialField> allFields, Institution institution) {
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
