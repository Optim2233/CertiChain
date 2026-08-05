-- Baseline schema. Matches common/entity/ + common/enums/ exactly.
-- See context_kit/portals/00-shared-foundations.md for the source spec.

CREATE TABLE institution (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255) NOT NULL,
    ministry       VARCHAR(255) NOT NULL,
    status         VARCHAR(20) NOT NULL
                   CHECK (status IN ('PENDING','APPROVED','REJECTED','SUSPENDED','REVOKED')),
    status_reason  TEXT,
    applied_at     TIMESTAMPTZ NOT NULL,
    decided_at     TIMESTAMPTZ
);

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(30) NOT NULL
                   CHECK (role IN ('ACCREDITATION_AUTHORITY','INSTITUTION','GRADUATE')),
    institution_id UUID REFERENCES institution(id),
    created_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_user_institution_role
        CHECK ((role = 'INSTITUTION') = (institution_id IS NOT NULL))
);

CREATE TABLE institution_document (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institution(id),
    file_name      VARCHAR(255) NOT NULL,
    file_data      BYTEA NOT NULL,
    verified       BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE credential (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type             VARCHAR(20) NOT NULL
                     CHECK (type IN ('CERTIFICATE','ACTIVITY_RECORD')),
    institution_id   UUID NOT NULL REFERENCES institution(id),
    graduate_user_id UUID REFERENCES users(id),
    graduate_email   VARCHAR(255) NOT NULL,
    status           VARCHAR(20) NOT NULL
                     CHECK (status IN ('PENDING_CLAIM','ISSUED','REVOKED')),
    revoke_reason    TEXT,
    merkle_root      TEXT,
    signature        TEXT,
    issued_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE credential_field (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES credential(id),
    field_name    VARCHAR(255) NOT NULL,
    field_value   TEXT NOT NULL,
    merkle_index  INT NOT NULL
);

CREATE TABLE share (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduate_user_id UUID NOT NULL REFERENCES users(id),
    name             VARCHAR(255) NOT NULL,
    scope            VARCHAR(20) NOT NULL
                     CHECK (scope IN ('SINGLE_CREDENTIAL','FULL_TIMELINE')),
    credential_id    UUID REFERENCES credential(id),
    share_token      VARCHAR(255) NOT NULL UNIQUE,
    revoked          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_share_credential_scope
        CHECK ((scope = 'SINGLE_CREDENTIAL') = (credential_id IS NOT NULL))
);

CREATE TABLE share_field_selection (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id            UUID NOT NULL REFERENCES share(id),
    credential_field_id UUID NOT NULL REFERENCES credential_field(id)
);

CREATE TABLE dispute_flag (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id    UUID NOT NULL REFERENCES credential(id),
    graduate_user_id UUID NOT NULL REFERENCES users(id),
    reason           TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL
                     CHECK (status IN ('OPEN','UPHELD','DISMISSED')),
    resolution_note  TEXT,
    created_at       TIMESTAMPTZ NOT NULL,
    resolved_at      TIMESTAMPTZ
);

CREATE TABLE audit_log_entry (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event          VARCHAR(255) NOT NULL,
    actor_user_id  UUID REFERENCES users(id),
    institution_id UUID REFERENCES institution(id),
    credential_id  UUID REFERENCES credential(id),
    occurred_at    TIMESTAMPTZ NOT NULL
);
