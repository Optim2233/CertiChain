package com.certichain.certichainbackend.common.service;

// Shared audit-log event-name constants, so writers and readers of the same
// event never drift into two slightly different strings.
public final class AuditEvents {
    public static final String CERTIFICATE_ISSUED_EVENT = "Certificate issued";
    public static final String VERIFY_EVENT = "Certificate verified (view-only, no personal data shown)";
    public static final String SHARE_VIEWED_EVENT = "Share link viewed (view-only, no viewer identity recorded)";
    public static final String SHARE_CREATED_EVENT = "Share created";
    public static final String SHARE_REVOKED_EVENT = "Share revoked";
    public static final String DOCUMENT_VERIFIED_EVENT = "Document verified";

    private AuditEvents() {}
}
