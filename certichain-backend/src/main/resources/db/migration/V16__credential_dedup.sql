-- Blocks issuing the same field set to the same institution twice. The merkle_root
-- is a deterministic hash of the credential's (name|value) fields, so an identical
-- root means an identical credential. Partial index: a REVOKED credential does not
-- block a corrected re-issue of the same fields.

-- Clear out pre-existing duplicates first, otherwise the index can't be built.
-- Keep one row per (institution_id, merkle_root) group - the newest by issued_at,
-- id as a deterministic tiebreak when timestamps collide; revoke the rest.
WITH ranked AS (
    SELECT id, row_number() OVER (
               PARTITION BY institution_id, merkle_root
               ORDER BY issued_at DESC, id DESC
           ) AS rn
    FROM credential
    WHERE status <> 'REVOKED' AND merkle_root IS NOT NULL
)
UPDATE credential c
SET status = 'REVOKED',
    revoke_reason = 'Superseded by a newer identical credential (automatic dedup)',
    revoked_at = now()
FROM ranked
WHERE ranked.id = c.id AND ranked.rn > 1;

CREATE UNIQUE INDEX uq_credential_institution_merkle_active
    ON credential (institution_id, merkle_root)
    WHERE status <> 'REVOKED' AND merkle_root IS NOT NULL;
