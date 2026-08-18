# CertiChain — Shared Foundations

Read this before opening any of the four portal task files
(`01-accreditation-authority.md`, `02-institution.md`, `03-graduate.md`,
`04-verifier.md`). It defines the entities, enums, and service interfaces
that more than one portal touches, so all four people can build in
parallel without inventing four incompatible versions of the same table.

If your portal task file and this file ever disagree, **this file wins** —
flag the conflict to Core/Platform rather than silently picking one.

**Ownership split:**
- **Core/Platform team** owns: user auth (JWT issuance/validation), the
  signing/Merkle crypto service, and the entities below as the source of
  truth for shape (though other portals may add their own migration for
  portal-specific tables).
- **Each portal team** owns: the endpoints and business logic specific to
  their domain, and calls into Core's shared services rather than
  reimplementing crypto or auth.

---

## Core entities (shape — exact JPA/SQL types TBD by Core, but fields and
relationships below should not change without a cross-team heads-up)

### `User` (base identity — Institution admins, Graduates, AA staff all
authenticate via this table; role determines what they can do)
```
id                UUID (PK)
email             string, unique
password_hash     string
role              enum: ACCREDITATION_AUTHORITY | INSTITUTION | GRADUATE
institution_id    UUID (FK -> Institution, nullable — only set for
                  role=INSTITUTION)
created_at        timestamp
```

### `Institution`
```
id                UUID (PK)
name              string
ministry           string
status            enum: PENDING | APPROVED | REJECTED | SUSPENDED | REVOKED
status_reason     string, nullable (required whenever status is set to
                  REJECTED, SUSPENDED, or REVOKED — shown to the institution)
applied_at        timestamp
decided_at        timestamp, nullable
```
Status transitions (see `01-accreditation-authority.md` for full logic):
`PENDING -> APPROVED | REJECTED | PENDING (request-info, stays pending)`
`APPROVED -> SUSPENDED -> APPROVED (reinstated)`
`APPROVED | SUSPENDED -> REVOKED` (terminal, no way back)

### `InstitutionDocument`
```
id                UUID (PK)
institution_id    UUID (FK -> Institution)
file_name         string
file_data         bytea/blob (stored directly in Postgres per stack decision)
verified          boolean, default false
uploaded_at       timestamp
```

### `Credential` (covers BOTH certificates and activity records — one
table, a `type` column, not two parallel tables)
```
id                UUID (PK)
type              enum: CERTIFICATE | ACTIVITY_RECORD
institution_id    UUID (FK -> Institution)
graduate_user_id  UUID (FK -> User), nullable — null while pending/unclaimed
graduate_email    string — always set, used for matching/claiming
status            enum: PENDING_CLAIM | ISSUED | REVOKED
revoke_reason     string, nullable (required when status = REVOKED)
merkle_root       string — the signed root hash over all fields
signature         string — institution's signature over merkle_root
issued_at         timestamp
```

### `CredentialField` (the individual signed fields under a credential's
Merkle root — this is what makes selective disclosure possible)
```
id                UUID (PK)
credential_id     UUID (FK -> Credential)
field_name        string (e.g. "degree", "gpa", "graduation_date")
field_value       string
merkle_index      int — position in the tree, needed to reconstruct proofs
```

### `Share` (a graduate's named, persistent, revocable disclosure link)
```
id                UUID (PK)
graduate_user_id  UUID (FK -> User)
name              string (graduate-chosen, e.g. "For LinkedIn")
scope             enum: SINGLE_CREDENTIAL | FULL_TIMELINE
credential_id     UUID (FK -> Credential), nullable (set when scope =
                  SINGLE_CREDENTIAL)
share_token       string, unique — the opaque token in the public URL
revoked           boolean, default false
created_at        timestamp
```

### `ShareFieldSelection` (which fields are visible for a given share, only
relevant when scope = SINGLE_CREDENTIAL — for FULL_TIMELINE shares, treat
as "all non-sensitive fields visible" unless product decides otherwise)
```
id                UUID (PK)
share_id          UUID (FK -> Share)
credential_field_id UUID (FK -> CredentialField)
```

### `DisputeFlag`
```
id                UUID (PK)
credential_id     UUID (FK -> Credential)
graduate_user_id  UUID (FK -> User)
reason            string
status            enum: OPEN | UPHELD | DISMISSED
resolution_note   string, nullable
created_at        timestamp
resolved_at       timestamp, nullable
```
Resolved by the **issuing Institution**, not the Accreditation Authority —
confirm this stays correct as you build; see wireframe: "Institution
responded: record stands as issued."

### `AuditLogEntry` (write-only from every portal, read-only from AA
portal — see `01-accreditation-authority.md`)
```
id                UUID (PK)
event             string (e.g. "Institution approved", "Certificate revoked")
actor_user_id     UUID (FK -> User), nullable — null for verifier actions
                  ("anonymous verifier" per wireframe — never require a
                  verifier identity here)
institution_id    UUID (FK -> Institution), nullable
credential_id     UUID (FK -> Credential), nullable
occurred_at       timestamp
```

---

## Shared service interfaces (owned by Core/Platform — portal teams call
these, don't reimplement crypto/auth)

```
SigningService {
  // Called by Institution portal on issuance (single or per batch row)
  SignedCredential signCredential(List<Field> fields, UUID institutionId)
    -> returns merkle_root, per-field merkle_index values, signature

  // Called by Verifier portal
  VerificationResult verify(UUID credentialId, Map<fieldName, value> disclosedFields, List<proofPath> proofs)
    -> returns VALID | INVALID | NOT_FOUND (institution accreditation
       status is checked separately, see 04-verifier.md)
}

MerkleService {
  // Called by Graduate portal when creating a share
  DisclosureProof generateProof(UUID credentialId, List<UUID> selectedFieldIds)
    -> returns the proof bundle needed to verify just those fields without
       revealing the rest
}

AuditLogService {
  // Called by every portal on any state-changing action
  void log(String event, UUID actorUserId /* nullable */, UUID institutionId /* nullable */, UUID credentialId /* nullable */)
}
```

If Core hasn't shipped real implementations yet when your portal needs
them, **stub them locally with fake data matching these signatures** so
your endpoints and frontend can be built and tested against a predictable
contract, then swap in the real service once available — don't block on
Core finishing first, and don't invent a different-shaped interface
because it was faster in the moment.

---

## API conventions (all portals should follow these)

- Base path per role: `/api/aa/...`, `/api/institution/...`,
  `/api/graduate/...`, `/api/verify/...` (verifier is the only fully open,
  unauthenticated group)
- Auth: `Authorization: Bearer <jwt>` header, except `/api/verify/**` and
  the two registration endpoints (`/api/institution/apply`,
  `/api/graduate/signup`) which must work pre-token
- Standard error shape:
  ```json
  { "error": "string, human-readable", "code": "MACHINE_READABLE_CODE" }
  ```
- Standard success envelope: return the resource/data directly (no
  wrapper object) — keep it simple, this isn't a public API needing
  versioning ceremony
- Every list endpoint should support basic pagination (`page`, `size`
  query params) even if the actual dataset will be small for the demo —
  cheap to add now, annoying to retrofit later

## Status tag vocabulary (use these exact strings/enum names everywhere —
frontend and backend — so the shared status-tag component in the design
system maps 1:1 without per-portal translation)

`PENDING` `APPROVED` `REJECTED` `SUSPENDED` `REVOKED` (institutions)
`PENDING_CLAIM` `ISSUED` `REVOKED` (credentials)
`OPEN` `UPHELD` `DISMISSED` (dispute flags)
`VERIFIED` `REVOKED` `INVALID_NOT_FOUND` (verification results — note this
is a distinct, verifier-facing result enum, not the same as credential
status, even though "REVOKED" appears in both)
