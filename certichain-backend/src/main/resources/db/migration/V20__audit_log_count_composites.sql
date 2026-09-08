-- Composite indexes for the hot per-dashboard count paths (briefing aggregates,
-- institution analytics): event + entity + recency, matching the
-- countByEventAnd*IdInAndOccurredAtAfter repository queries.
CREATE INDEX idx_audit_log_entry_event_credential_time
    ON audit_log_entry(event, credential_id, occurred_at);
CREATE INDEX idx_audit_log_entry_event_share_time
    ON audit_log_entry(event, share_id, occurred_at);
