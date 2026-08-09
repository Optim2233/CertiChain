# Task File — Verifier Portal

Read `00-shared-foundations.md` first. This file assumes you know the
shared `Credential`, `Share`, `Institution`, and `AuditLogEntry` entities,
and the `SigningService.verify(...)` interface.

This is the **best first portal to build if you're newer to the stack** —
it's entirely read-only, requires no authentication or JWT handling at
all, and has the smallest, most self-contained logic of the four. Good
place to get comfortable with the Spring Boot ↔ Next.js round trip before
touching anything stateful.

## Scope

You own the open, no-login verification flow (by certificate ID, file
upload, or shared link) and the public institution directory. You **do
not** own any write operations — every endpoint here is a `GET` (or a
`POST` that only reads and computes, never mutates).

## What "done" looks like

Anyone, without an account, can check a certificate ID, upload a
credential file, or open a graduate's shared link, and get a correct
Verified / Revoked / Invalid-Not-Found result — including a multi-entry
timeline share where each entry gets its own independent result — plus
browse a public directory of accredited institutions.

---

## Data model — what you own

Nothing. This portal reads shared entities exclusively and writes only to
`AuditLogEntry` (verification events, with `actor_user_id` left null —
"anonymous verifier" per the wireframe. **Never require or record a
verifier identity anywhere in this portal** — that's a deliberate privacy
property, not an oversight to fix).

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/verify/certificate/{id}` | none | Look up by raw credential ID. Returns Verified/Revoked/Invalid-Not-Found (see result shape below). |
| POST | `/api/verify/file` | none | Body: uploaded credential file (whatever export format the Graduate portal produces for a downloaded credential — confirm this format with Core/Graduate team before building). Extracts the credential reference and delegates to the same logic as the ID lookup. |
| GET | `/api/verify/share/{token}` | none | Look up by a `Share.share_token`. For `SINGLE_CREDENTIAL` scope, returns one result. For `FULL_TIMELINE` scope, returns a list — **each entry independently evaluated**, so one entry can show Verified while another in the same list shows Revoked. If the share itself is `revoked`, the whole endpoint should return a distinct "this share is no longer active" state — not silently fall through to Invalid/Not-Found (the graduate revoked *the link*, which is a different fact than the *credential* being revoked — don't blur them in the response). |
| GET | `/api/verify/institutions` | none | Public directory. Returns institutions with status `APPROVED` or `SUSPENDED` (dimmed on the frontend) — **excludes `PENDING`, `REJECTED`, `REVOKED`**. See the flagged ambiguity below before hardcoding this filter. |

**Verification result shape** (used by both the single-ID and single-entry-
within-timeline cases):
```json
{
  "result": "VERIFIED" | "REVOKED" | "INVALID_NOT_FOUND",
  "credentialTitle": "string, only present if VERIFIED or REVOKED",
  "issuedTo": "string, only present if VERIFIED or REVOKED",
  "institutionName": "string, only present if VERIFIED or REVOKED",
  "institutionStatus": "APPROVED | SUSPENDED | REVOKED, only present if VERIFIED or REVOKED",
  "issuedAt": "date, only present if VERIFIED or REVOKED",
  "revokedAt": "date, only present if REVOKED",
  "disclosedFields": [{ "name": "string", "value": "string" }],
  "signatureDetails": "object, collapsed by default in UI — issuer public key ref, merkle root, etc."
}
```

Every successful lookup (`VERIFIED` or `REVOKED` result, not
`INVALID_NOT_FOUND`) should call `AuditLogService.log("Certificate
verified (view-only, no personal data shown)", null, institutionId,
credentialId)` — matches the wireframe's example audit row exactly, log
the credential/institution reference but never any verifier-identifying
data since there isn't any to log.

---

## Screens & functions

### 1. Landing
- No account required. Three entry methods: ID input, file upload, "paste
  a shared link" (or auto-detect if the app is opened via a `/verify/{token}`
  route directly)
- Link out: "Browse accredited institutions →"

### 2. Public institution directory
- Table: Name | Ministry | Status
- **Resolved (confirmed by Optim):** list `APPROVED` + `SUSPENDED`,
  exclude `PENDING` / `REJECTED` / `REVOKED`. `SUSPENDED` rows are shown
  dimmed / visually distinguished as a warning, not hidden. This matches
  the wireframe caption ("pending/rejected/revoked institutions are not
  listed here" — only 3 of 5 statuses excluded) and the dimmed
  `SUSPENDED` row in the same mockup. Easy to implement wrong as "only
  show APPROVED" — don't.

### 3. Single-credential result — Verified
- Green "✓ Verified" tag, credential title, "Issued to: [name]"
- Detail box: issuer name + accreditation status + issue date
- Note: "Only fields the graduate chose to share are shown"
- Collapsible "▾ show issuer accreditation & signature details" —
  collapsed by default

### 4. Single-credential result — Revoked (a distinct screen/state, not
just a red version of Verified)
- "✕ Revoked" tag, dimmed title, "Issued to: [name] · [institution]"
- Explanatory copy — reuse close to verbatim: "This credential was
  revoked by the issuing institution on [date]. Signature was valid;
  status overrides it." This line is doing real work: it's telling a
  non-technical verifier that a valid signature doesn't mean a trusted
  credential, which is the whole point of the trust registry — don't
  cut it for brevity.

### 5. Multi-entry (timeline share) result
- List of entries, each with its own independent result tag inline
  (e.g. one row "✓ Verified", another "✕ Revoked" in the same list)
- If the share itself was revoked by the graduate, show that as a
  single, distinct top-level message instead of rendering the list at
  all — don't let a dead link silently render as a list of
  Invalid/Not-Found entries, which would misrepresent *why* nothing's
  showing

### 6. Invalid / Not Found
- "✕ Invalid / Not Found — No matching certificate, or content doesn't
  match its signature"

---

## Build order

1. `GET /verify/certificate/{id}` + result screens (Verified / Revoked /
   Invalid-Not-Found) — this is the core logic, get it right against a
   handful of manually-seeded test credentials before anything else
2. `GET /verify/institutions` directory (fully independent of #1, can be
   built in parallel)
3. `GET /verify/share/{token}` single-credential case, reusing #1's result
   rendering
4. `GET /verify/share/{token}` multi-entry timeline case, including the
   "share itself revoked" distinct state
5. `POST /verify/file` — do this last, once you've confirmed the actual
   file format with whoever owns credential export on the Graduate side

## Verification

**Manual QA checklist:**
- [ ] Looking up a valid, non-revoked credential ID shows Verified with
      correct issuer info
- [ ] Looking up a revoked credential ID shows the distinct Revoked
      screen, not a red Verified screen
- [ ] Looking up a nonexistent ID shows Invalid/Not-Found, not a 500 or a
      blank screen
- [ ] A `FULL_TIMELINE` share with one revoked and one active credential
      shows both, each with its own correct independent tag, in one
      response
- [ ] A revoked share (graduate hit "revoke" on the link) shows a distinct
      "this link is no longer active" message, not Invalid/Not-Found and
      not a silent empty list
- [ ] The public institution directory shows APPROVED and SUSPENDED
      (dimmed) institutions, and does **not** show PENDING, REJECTED, or
      REVOKED ones — check all five statuses against the live filter, not
      just the two happy-path ones
- [ ] A share's disclosed fields match exactly what the graduate selected
      at share-creation time — cross-check against `03-graduate.md`'s test
      case for this
- [ ] No screen or API response in this entire portal ever asks for or
      stores a verifier's identity, email, or IP in a way that ends up in
      the audit log

**Suggested automated tests:**
- Integration test: revoked credential ID → response `result: "REVOKED"`,
  not `"INVALID_NOT_FOUND"` and not `"VERIFIED"`
- Integration test: nonexistent ID → `result: "INVALID_NOT_FOUND"`, HTTP
  200 (this is a valid, expected outcome, not a server error — don't
  return 404 and force the frontend to special-case it)
- Integration test: institution directory response never includes a
  `PENDING`, `REJECTED`, or `REVOKED` institution regardless of how many
  exist in the DB
- Integration test: multi-entry share with mixed statuses returns a list
  where each entry's `result` is independently correct

## Acceptance criteria

- Verification correctly distinguishes "signature is cryptographically
  valid" from "issuer/credential is currently trusted" — a revoked
  credential with a perfectly valid signature must show Revoked, never
  Verified. This is the single most important correctness property in
  the entire project; if you get this wrong the whole trust-registry
  concept doesn't actually work.
- No authentication, no verifier identity capture, anywhere in this
  portal
