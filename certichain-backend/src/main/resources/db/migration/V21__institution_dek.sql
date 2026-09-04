-- Per-institution Data Encryption Key (DEK), wrapped with the app-wide KEK
-- (EnvelopeEncryptionService). Generated at AA approval time - see
-- AccreditationServiceImpl.approve(). Nullable for the same reason public_key/
-- private_key_enc are: PENDING/REJECTED institutions have none, and institutions
-- approved before this feature shipped need a one-time backfill.
ALTER TABLE institution
    ADD COLUMN dek_wrapped BYTEA,
    ADD COLUMN dek_iv      BYTEA;
