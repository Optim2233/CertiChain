-- PII envelope encryption (see PiiCryptoService): TEXT/VARCHAR columns below change
-- semantics to ciphertext, format base64(iv) || '.' || base64(ciphertext) - no sibling IV
-- columns needed. HMAC columns hold hex HMAC-SHA256 of the normalized email so
-- exact-match lookups (login, claim) keep working on encrypted emails.

ALTER TABLE users ADD COLUMN email_hmac VARCHAR(64);
CREATE UNIQUE INDEX uq_users_email_hmac ON users (email_hmac);
-- ciphertext (IV + GCM tag, base64) no longer fits VARCHAR(50)
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(255);

ALTER TABLE credential ADD COLUMN graduate_email_hmac VARCHAR(64);
CREATE INDEX idx_credential_graduate_email_hmac ON credential (graduate_email_hmac);

ALTER TABLE institution ALTER COLUMN phone TYPE VARCHAR(255);
-- institution PII columns (phone, street, ward, postal_code, company/dica/myco/tin/mic,
-- establishment_doc_title/ref, status_reason, founders, administrator) keep their names;
-- values become envelope ciphertext via the backfill + write paths.
-- dispute_flag.reason/resolution_note, notification.message, users names/phones,
-- credential.graduate_email/revoke_reason: same treatment, no DDL needed (TEXT/VARCHAR fit).
-- institution_document.file_data: IV-prefixed raw bytes (12-byte IV + ciphertext), no DDL.
