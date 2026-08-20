-- FK indexes: every join/filter below (credentials by institution, disputes by
-- credential, audit log by institution, etc.) was a seq scan without these.
CREATE INDEX idx_users_institution_id ON users(institution_id);
CREATE INDEX idx_institution_document_institution_id ON institution_document(institution_id);
CREATE INDEX idx_credential_institution_id ON credential(institution_id);
CREATE INDEX idx_credential_graduate_user_id ON credential(graduate_user_id);
CREATE INDEX idx_credential_graduate_email ON credential(graduate_email);
CREATE INDEX idx_credential_field_credential_id ON credential_field(credential_id);
CREATE INDEX idx_share_graduate_user_id ON share(graduate_user_id);
CREATE INDEX idx_share_credential_id ON share(credential_id);
CREATE INDEX idx_share_field_selection_share_id ON share_field_selection(share_id);
CREATE INDEX idx_share_field_selection_credential_field_id ON share_field_selection(credential_field_id);
CREATE INDEX idx_dispute_flag_credential_id ON dispute_flag(credential_id);
CREATE INDEX idx_dispute_flag_graduate_user_id ON dispute_flag(graduate_user_id);
CREATE INDEX idx_audit_log_entry_institution_id ON audit_log_entry(institution_id);
CREATE INDEX idx_audit_log_entry_credential_id ON audit_log_entry(credential_id);
CREATE INDEX idx_audit_log_entry_actor_user_id ON audit_log_entry(actor_user_id);

-- Optimistic locking: catches concurrent writers (e.g. two AA actions racing
-- on the same institution, or a dispute resolved twice) instead of silently
-- letting the second write clobber the first. version defaults to 0 for
-- existing rows; @Version manages it from here.
ALTER TABLE institution ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE credential ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE dispute_flag ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE share ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- updated_at: nullable until a row is next written; not backfilled since we
-- have no accurate history for existing rows (same reasoning as V4's
-- revoked_at backfill).
ALTER TABLE institution ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE credential ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE dispute_flag ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE share ADD COLUMN updated_at TIMESTAMPTZ;

-- Prevents the issuance path from silently double-inserting a field with the
-- same name onto the same credential (no app-level dedup guard existed).
ALTER TABLE credential_field
    ADD CONSTRAINT uq_credential_field_credential_id_field_name
    UNIQUE (credential_id, field_name);
