-- field_value stays a TEXT column (now holding Base64-encoded ciphertext instead of
-- plaintext for any row written after this ships), so existing rows aren't touched by
-- this migration - only new/re-signed rows get encrypted. field_value_iv is null for
-- every row that predates encryption; a backfill script encrypts those separately.
ALTER TABLE credential_field
    ADD COLUMN field_value_iv BYTEA;
