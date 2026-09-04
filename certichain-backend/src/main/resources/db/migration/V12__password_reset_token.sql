-- Reconstructed from production's flyway_schema_history + live schema: these
-- columns/indexes were already applied to the shared Neon database directly,
-- without this file ever being committed. Content here matches production exactly.
CREATE TABLE password_reset_token (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    token_hash   VARCHAR(64) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_token_user_id ON password_reset_token(user_id);
CREATE INDEX idx_password_reset_token_expires_at ON password_reset_token(expires_at);
