-- On-chain anchors for the ledger: one row per Sepolia transaction that stamped a
-- chain head hash. The unique index is the DB-level never-anchor-the-same-head-twice
-- guarantee; the scheduler also checks it before sending. A row is only written after
-- eth_sendRawTransaction succeeds, so a failed send retries on the next cycle.
CREATE TABLE ledger_anchor (
    id          BIGSERIAL PRIMARY KEY,
    head_hash   VARCHAR(64) NOT NULL UNIQUE,
    entries     BIGINT NOT NULL,
    tx_hash     VARCHAR(66) NOT NULL,
    block_number BIGINT,
    anchored_at TIMESTAMPTZ NOT NULL
);
