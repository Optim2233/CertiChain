package com.certichain.certichainbackend.config;

import com.certichain.certichainbackend.common.service.impl.EmailServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Surfaces email delivery state on /actuator/health.
 *
 * Sends are @Async and their failures are swallowed so an SMTP outage never breaks the
 * API request that triggered them - which also meant a completely dead mail pipeline was
 * invisible from outside (a password reset would report success and never arrive).
 * This makes that state observable without changing send behaviour.
 *
 * Reports DOWN only once something has actually failed; "not configured" is a normal
 * local setup, not a fault.
 */
@Component("email")
@RequiredArgsConstructor
public class EmailHealthIndicator implements HealthIndicator {

    private final EmailServiceImpl emailService;

    @Override
    public Health health() {
        EmailServiceImpl.EmailDeliveryStats s = emailService.deliveryStats();

        Health.Builder b = s.failed() > 0 ? Health.down() : Health.up();
        b.withDetail("configured", s.configured())
                .withDetail("delivered", s.sent())
                .withDetail("failed", s.failed());
        if (s.lastFailure() != null) b.withDetail("lastFailure", s.lastFailure());
        if (!s.configured()) b.withDetail("note", "GMAIL_ADDRESS unset - emails are skipped, not failed");
        return b.build();
    }
}
