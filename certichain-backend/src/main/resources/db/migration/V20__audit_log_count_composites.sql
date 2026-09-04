-- Reconstructed from production's live schema (see V12's note). Composite
-- indexes for "count of event X on this credential/share over time" queries
-- (trust stats, verification counters).
CREATE INDEX idx_audit_log_entry_event_credential_time
    ON audit_log_entry(event, credential_id, occurred_at);
CREATE INDEX idx_audit_log_entry_event_share_time
    ON audit_log_entry(event, share_id, occurred_at);
