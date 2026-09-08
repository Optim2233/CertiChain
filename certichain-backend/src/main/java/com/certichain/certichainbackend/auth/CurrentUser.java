package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Resolves the authenticated caller. {@link JwtAuthenticationFilter} sets the principal to
 * the user id string, so everything else is looked up from the DB - cached 60s (see below),
 * never from JWT claims: the token lives 12h, so a claim can be stale while the DB is current.
 */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepository;

    public UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ForbiddenActionException("Not authenticated");
        }
        try {
            return UUID.fromString(auth.getPrincipal().toString());
        } catch (IllegalArgumentException ex) {
            throw new ForbiddenActionException("Not authenticated");
        }
    }

    // Cached 60s (see CacheConfig): drops one PK lookup per authenticated call.
    // Tradeoffs, all accepted: role revocation propagates within a minute, and the
    // cached row carries the password hash inside the Redis trust boundary (same as
    // the DB). Evicted wholesale on profile/password/briefing writes.
    @Cacheable(cacheNames = "currentUser", key = "#root.target.id()")
    public User user() {
        return userRepository.findById(id())
                .orElseThrow(() -> new ForbiddenActionException("Account no longer exists"));
    }

    /** The caller's institution. Only INSTITUTION-role users have one. */
    public UUID institutionId() {
        UUID institutionId = user().getInstitutionId();
        if (institutionId == null) {
            throw new ForbiddenActionException("Not an institution user");
        }
        return institutionId;
    }
}
