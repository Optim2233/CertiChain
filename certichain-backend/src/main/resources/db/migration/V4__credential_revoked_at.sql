-- Verifiers currently see no revocation date; the field existed in the API contract but
-- was always null because this column never did. Backfilled null for pre-existing rows -
-- they were revoked before this column existed, so no accurate date can be recovered.
ALTER TABLE credential ADD COLUMN revoked_at timestamptz;
