-- Per-institution signing keys. Replaces the app-wide HMAC placeholder documented
-- in SigningServiceImpl. Nullable: keys are generated at AA approval time, so
-- PENDING/REJECTED institutions legitimately have none.

ALTER TABLE institution
    ADD COLUMN public_key       TEXT,
    ADD COLUMN private_key_enc  TEXT,
    ADD COLUMN key_algorithm    VARCHAR(20),
    ADD COLUMN key_generated_at TIMESTAMPTZ;
