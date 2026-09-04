-- Reconstructed from production's live schema (see V12's note). Prevents two
-- non-revoked credentials from the same institution sharing a merkle_root -
-- a partial index so revoked/null-root rows never block a genuine reissue.
CREATE UNIQUE INDEX uq_credential_institution_merkle_active
    ON credential(institution_id, merkle_root)
    WHERE status <> 'REVOKED' AND merkle_root IS NOT NULL;
