-- Hash-chained append-only ledger: every credential event (ISSUED/AMENDED/REVOKED/
-- RESTORED) appends an entry whose hash covers the previous entry's hash, the payload
-- and the timestamp, signed by the issuing institution's key. Piecemeal tampering with
-- any historical row is detectable by recomputing the chain (LedgerService.validateChain).
-- No UPDATE or DELETE is ever issued against this table - a correction is a new entry.
CREATE TABLE ledger_entry (
    id             BIGSERIAL PRIMARY KEY,
    previous_hash  VARCHAR(64) NOT NULL,
    hash           VARCHAR(64) NOT NULL UNIQUE,
    event_type     VARCHAR(20) NOT NULL,
    credential_id  UUID NOT NULL,
    institution_id UUID NOT NULL REFERENCES institution(id),
    payload        TEXT NOT NULL,
    signature      TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_ledger_credential_id ON ledger_entry(credential_id);
CREATE INDEX idx_ledger_institution_id ON ledger_entry(institution_id);
