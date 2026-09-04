-- Reconstructed from production's live schema (see V12's note). Groups
-- credentials issued together in one batch-upload request; no separate
-- credential_batch table exists, just a nullable UUID tag on credential.
ALTER TABLE credential ADD COLUMN batch_id UUID;
CREATE INDEX idx_credential_institution_batch ON credential(institution_id, batch_id);
