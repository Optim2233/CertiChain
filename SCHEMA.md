# Database Schema

Consolidated reference for the CertiChain schema. **Not the source of truth** —
the source of truth is the ordered Flyway migrations in
`certichain-backend/src/main/resources/db/migration/` (`V1`…`V22`), mirrored by
the JPA entities in `certichain-backend/src/main/java/.../common/entity/`.
This file just saves you from replaying all 22 migrations in your head; if it
ever disagrees with the migrations, the migrations win — regenerate this file.

## institution

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | VARCHAR(255) NOT NULL | |
| ministry | VARCHAR(255) NOT NULL | |
| status | VARCHAR(20) NOT NULL | CHECK IN (PENDING, APPROVED, REJECTED, SUSPENDED, REVOKED) |
| status_reason | TEXT | |
| applied_at | TIMESTAMPTZ NOT NULL | |
| decided_at | TIMESTAMPTZ | |
| public_key | TEXT | null until AA approval (V2) |
| private_key_enc | TEXT | encrypted; `@JsonIgnore` on the entity — never serialized (V2) |
| key_algorithm | VARCHAR(20) | (V2) |
| key_generated_at | TIMESTAMPTZ | (V2) |
| updated_at | TIMESTAMPTZ | set via `@PreUpdate`, not backfilled (V6) |
| version | BIGINT NOT NULL DEFAULT 0 | optimistic locking (V6) |
| dek_wrapped | BYTEA | per-institution DEK wrapped with app KEK, minted at AA approve (V21, nullable for pre-encryption rows) |
| dek_iv | BYTEA | IV for `dek_wrapped` (V21) |

## users

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) NOT NULL UNIQUE | |
| password_hash | VARCHAR(255) NOT NULL | |
| role | VARCHAR(30) NOT NULL | CHECK IN (ACCREDITATION_AUTHORITY, INSTITUTION, GRADUATE) |
| institution_id | UUID → institution(id) | NOT NULL iff role = INSTITUTION (`chk_user_institution_role`) |
| created_at | TIMESTAMPTZ NOT NULL | |

Indexes: `idx_users_institution_id` (V6)

## institution_document

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| institution_id | UUID NOT NULL → institution(id) | |
| file_name | VARCHAR(255) NOT NULL | |
| file_data | BYTEA NOT NULL | stored inline in Postgres — flagged as a future move-to-object-storage candidate, not yet done |
| verified | BOOLEAN NOT NULL DEFAULT FALSE | |
| uploaded_at | TIMESTAMPTZ NOT NULL | |

Indexes: `idx_institution_document_institution_id` (V6)

## credential

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| type | VARCHAR(20) NOT NULL | CHECK IN (CERTIFICATE, ACTIVITY_RECORD) |
| institution_id | UUID NOT NULL → institution(id) | |
| graduate_user_id | UUID → users(id) | null until graduate claims it |
| graduate_email | VARCHAR(255) NOT NULL | |
| status | VARCHAR(20) NOT NULL | CHECK IN (PENDING_CLAIM, ISSUED, REVOKED) |
| revoke_reason | TEXT | |
| revoked_at | TIMESTAMPTZ | added V4; null for pre-V4 revocations (unrecoverable) |
| merkle_root | TEXT | |
| signature | TEXT | |
| issued_at | TIMESTAMPTZ NOT NULL | |
| updated_at | TIMESTAMPTZ | (V6) |
| version | BIGINT NOT NULL DEFAULT 0 | (V6) |

Indexes: `idx_credential_institution_id`, `idx_credential_graduate_user_id`, `idx_credential_graduate_email` (V6)

## credential_field

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| credential_id | UUID NOT NULL → credential(id) | |
| field_name | VARCHAR(255) NOT NULL | |
| field_value | TEXT NOT NULL | Base64 AES-256-GCM ciphertext since V22 (plaintext for pre-encryption rows until backfilled) |
| field_value_iv | BYTEA | per-row GCM IV (V22, null = legacy plaintext) |
| merkle_index | INT NOT NULL | |

Constraints: `uq_credential_field_credential_id_field_name` UNIQUE (credential_id, field_name) (V6)
Indexes: `idx_credential_field_credential_id` (V6)

## share

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| graduate_user_id | UUID NOT NULL → users(id) | |
| name | VARCHAR(255) NOT NULL | |
| scope | VARCHAR(20) NOT NULL | CHECK IN (SINGLE_CREDENTIAL, FULL_TIMELINE) |
| credential_id | UUID → credential(id) | NOT NULL iff scope = SINGLE_CREDENTIAL (`chk_share_credential_scope`) |
| share_token | VARCHAR(255) NOT NULL UNIQUE | |
| revoked | BOOLEAN NOT NULL DEFAULT FALSE | |
| view_count | INTEGER NOT NULL DEFAULT 0 | (V5) |
| created_at | TIMESTAMPTZ NOT NULL | |
| updated_at | TIMESTAMPTZ | (V6) |
| version | BIGINT NOT NULL DEFAULT 0 | (V6) |

Indexes: `idx_share_graduate_user_id`, `idx_share_credential_id` (V6)

## share_field_selection

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| share_id | UUID NOT NULL → share(id) | |
| credential_field_id | UUID NOT NULL → credential_field(id) | |

Indexes: `idx_share_field_selection_share_id`, `idx_share_field_selection_credential_field_id` (V6)

## dispute_flag

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| credential_id | UUID NOT NULL → credential(id) | |
| graduate_user_id | UUID NOT NULL → users(id) | |
| reason | TEXT NOT NULL | |
| status | VARCHAR(20) NOT NULL | CHECK IN (OPEN, UPHELD, DISMISSED) |
| resolution_note | TEXT | |
| created_at | TIMESTAMPTZ NOT NULL | |
| resolved_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | (V6) |
| version | BIGINT NOT NULL DEFAULT 0 | (V6) |

Indexes: `idx_dispute_flag_credential_id`, `idx_dispute_flag_graduate_user_id` (V6)

## audit_log_entry

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event | VARCHAR(255) NOT NULL | |
| actor_user_id | UUID → users(id) | resolved to actor email server-side before reaching the UI |
| institution_id | UUID → institution(id) | |
| credential_id | UUID → credential(id) | |
| occurred_at | TIMESTAMPTZ NOT NULL | |

Indexes: `idx_audit_log_entry_institution_id`, `idx_audit_log_entry_credential_id`, `idx_audit_log_entry_actor_user_id` (V6)

## Entity relationship overview

```
institution 1──* users (role=INSTITUTION)
institution 1──* institution_document
institution 1──* credential
users(graduate) 1──* credential (claimed)
credential 1──* credential_field
users(graduate) 1──* share
share *──1 credential (nullable; null when scope=FULL_TIMELINE)
share 1──* share_field_selection *──1 credential_field
credential 1──* dispute_flag
users(graduate) 1──* dispute_flag
audit_log_entry *──1 users / institution / credential (all nullable, informational)
```

## Known gaps / deliberate deferrals

- `institution_document.file_data` stored inline as `BYTEA` rather than in
  object storage — fine at current scale, real architecture call if file
  volume grows.
- No `ON DELETE` behavior specified on any FK (defaults to `NO ACTION`) —
  acceptable since nothing in the app hard-deletes rows; everything is
  soft-status (`REVOKED`, `DISMISSED`, `revoked` flag, etc.).
- `Institution.privateKeyEnc` is `@JsonIgnore`'d — never serialize it if you
  add new endpoints that return `Institution` directly.
