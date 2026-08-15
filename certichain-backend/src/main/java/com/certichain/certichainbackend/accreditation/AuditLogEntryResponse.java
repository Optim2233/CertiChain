package com.certichain.certichainbackend.accreditation;

import java.time.Instant;
import java.util.UUID;

/**
 * AuditLogEntry with actorUserId resolved to an email - the entry itself only
 * stores a UUID, and a bare UUID means nothing to whoever is reading the log.
 */
public record AuditLogEntryResponse(
        UUID id,
        String event,
        String actorEmail,
        UUID institutionId,
        UUID credentialId,
        Instant occurredAt
) {}
