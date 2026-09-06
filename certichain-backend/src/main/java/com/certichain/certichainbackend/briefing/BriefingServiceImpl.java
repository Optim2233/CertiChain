package com.certichain.certichainbackend.briefing;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.briefing.Briefing.BriefingItem;
import com.certichain.certichainbackend.briefing.Briefing.BriefingState;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.Share;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Not @Cacheable: the DTOs are records and do not survive the Redis round trip
 * (CacheSerializationTest), and the freshness window is per-request anyway.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BriefingServiceImpl implements BriefingService {

    // "Have I nagged you recently?" gap below which an empty briefing renders nothing.
    private static final Duration QUIET_MIN_GAP = Duration.ofHours(24);
    // Open-ended window is clamped: a months-old verification is not actionable.
    private static final Duration MAX_LOOKBACK = Duration.ofDays(90);
    private static final int DISCRETE_CAP = 5;

    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final CredentialRepository credentialRepository;
    private final ShareRepository shareRepository;
    private final DisputeFlagRepository disputeFlagRepository;
    private final AuditLogEntryRepository auditLogEntryRepository;
    private final PiiCryptoService piiCryptoService;

    @Override
    public Briefing getBriefing() {
        User user = currentUser.user();
        Instant lastBriefedAt = user.getLastBriefedAt();
        Instant now = Instant.now();
        Instant windowStart = maxInstant(lastBriefedAt, now.minus(MAX_LOOKBACK));

        List<Notification> discrete = notificationRepository
                .findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
                        user.getId(), windowStart, PageRequest.of(0, DISCRETE_CAP))
                .getContent();
        long discreteTotal = notificationRepository
                .countByRecipientUserIdAndCreatedAtAfter(user.getId(), windowStart);

        List<BriefingItem> items = new ArrayList<>();
        for (Notification n : discrete) {
            items.add(new BriefingItem("notification", n.getType(),
                    piiCryptoService.decryptUserField(n.getMessage()), 1, n.getCreatedAt()));
        }
        int moreCount = (int) Math.max(0, discreteTotal - discrete.size());

        if (user.getRole() == Role.INSTITUTION && user.getInstitutionId() != null) {
            addInstitutionAggregates(items, user.getInstitutionId(), windowStart, now);
        } else {
            addGraduateAggregates(items, user.getId(), windowStart, now);
        }

        BriefingState state;
        if (!items.isEmpty()) {
            state = BriefingState.UPDATES;
        } else if (Duration.between(lastBriefedAt, now).compareTo(QUIET_MIN_GAP) >= 0) {
            state = BriefingState.ALL_QUIET;
        } else {
            state = BriefingState.NONE;
        }
        return new Briefing(state, windowStart, items, moreCount);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "currentUser", allEntries = true)
    public void acknowledge() {
        User user = currentUser.user();
        user.setLastBriefedAt(Instant.now());
        userRepository.save(user);
    }

    private void addGraduateAggregates(List<BriefingItem> items, UUID userId, Instant windowStart, Instant at) {
        // A graduate's credentials are only reachable through a share link, so every
        // VERIFY_EVENT on their credentials is already counted by the SHARE_VIEWED_EVENT
        // that produced it. Reporting both was the same number twice - keep only the
        // share-view line, which is the graduate-facing fact ("someone looked at what
        // you shared"). Institutions still get their own verifications item.
        List<UUID> shareIds = shareRepository.findByGraduateUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Share::getId)
                .toList();
        if (!shareIds.isEmpty()) {
            int views = auditLogEntryRepository.countByEventAndShareIdInAndOccurredAtAfter(
                    AuditEvents.SHARE_VIEWED_EVENT, shareIds, windowStart);
            if (views > 0) {
                items.add(new BriefingItem("shareViews",
                        "Your shared credentials were viewed " + views + plural(views, " time", " times"),
                        "Employers or other parties opened a link you shared.", views, at));
            }
        }
    }

    private void addInstitutionAggregates(List<BriefingItem> items, UUID institutionId, Instant windowStart, Instant at) {
        List<UUID> credentialIds = credentialRepository.findByInstitutionId(institutionId).stream()
                .map(Credential::getId)
                .toList();
        if (credentialIds.isEmpty()) {
            return;
        }
        int verifications = auditLogEntryRepository.countByEventAndCredentialIdInAndOccurredAtAfter(
                AuditEvents.VERIFY_EVENT, credentialIds, windowStart);
        if (verifications > 0) {
            items.add(new BriefingItem("verifications",
                    "Your credentials were verified " + verifications + plural(verifications, " time", " times"),
                    "Third parties checking credentials you issued.", verifications, at));
        }
        int disputes = disputeFlagRepository.countByCredentialIdInAndCreatedAtAfter(credentialIds, windowStart);
        if (disputes > 0) {
            items.add(new BriefingItem("disputes",
                    disputes + plural(disputes, " dispute was", " disputes were") + " filed against your credentials",
                    "Review them in the Disputes section.", disputes, at));
        }
    }

    private static String plural(int n, String one, String many) {
        return n == 1 ? one : many;
    }

    private static Instant maxInstant(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }
}
