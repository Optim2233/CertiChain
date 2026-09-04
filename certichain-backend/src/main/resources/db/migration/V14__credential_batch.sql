ALTER TABLE credential ADD COLUMN batch_id UUID;
CREATE INDEX idx_credential_institution_batch ON credential (institution_id, batch_id);
