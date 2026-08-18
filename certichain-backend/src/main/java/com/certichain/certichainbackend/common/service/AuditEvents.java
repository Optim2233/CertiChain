package com.certichain.certichainbackend.common.service;

// Shared audit-log event-name constants, so writers and readers of the same
// event never drift into two slightly different strings.
public final class AuditEvents {
    public static final String VERIFY_EVENT = "Certificate verified (view-only, no personal data shown)";

    private AuditEvents() {}
}
