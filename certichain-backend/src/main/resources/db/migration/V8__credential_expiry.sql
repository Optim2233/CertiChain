-- Optional expiry, institution's choice at issuance. Nullable and defaults to
-- unset (never expires) - fits degrees (which don't expire) and activity
-- records (e.g. a time-boxed club membership or leadership role) alike,
-- without forcing every credential to declare one.
ALTER TABLE credential ADD COLUMN expires_at timestamptz;
