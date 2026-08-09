package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Resolves the authenticated caller. {@link JwtAuthenticationFilter} sets the principal to
 * the user id string, so everything else is looked up from the DB.
 *
 * ponytail: one PK lookup per call to read institutionId instead of reading the JWT claim.
 * Deliberate - the token lives 12h, so a claim can be stale while the DB is always current.
 * Put institutionId in the principal if this ever shows up in a profile.
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
