-- Lets a share-view audit entry point back at the Share it belongs to.
-- Nullable: existing rows (credential verifies, etc.) don't have a share.
ALTER TABLE audit_log_entry ADD COLUMN share_id UUID REFERENCES share(id);
CREATE INDEX idx_audit_log_entry_share_id ON audit_log_entry(share_id);
