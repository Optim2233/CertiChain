# Task File — Institution Portal

Read `00-shared-foundations.md` first. This file assumes you know the
shared `Institution`, `Credential`, `CredentialField`, `DisputeFlag`, and
`AuditLogEntry` entities, and the `SigningService` interface (owned by
Core — you call it, you don't implement crypto yourself).

## Scope

You own institution self-registration, the issuance flow (single +
batch, both certificates and activity records), credential revocation,
and responding to graduate-filed dispute flags. You do **not** decide
accreditation outcomes — that's the AA portal; you only read your own
`Institution.status` and react to it (e.g. block issuance while
suspended).

## What "done" looks like

An unaccredited institution can apply, see one of three outcomes once the
AA decides, and — once approved — issue single or batch credentials that
get correctly signed via Core's `SigningService`, revoke a credential with
a reason, and resolve a graduate's dispute flag as upheld or dismissed.

---

## Data model — what you own

Nothing new beyond shared foundations. You're the primary *writer* of
`Credential` and `CredentialField` (on issuance) and the primary *reader
and mutator* of `DisputeFlag.status`. Institution's own registration
fields (`name`, `ministry`, uploaded documents) are written by you at
`/apply` time but owned/reviewed downstream by AA.

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/institution/apply` | none (pre-account) | Body: `{ name, ministry, documents: [file...] }`. Creates `Institution` (status `PENDING`) + `InstitutionDocument` rows + a `User` (role `INSTITUTION`) to log in with going forward. |
| GET | `/api/institution/me` | INSTITUTION | Returns own institution + status + `status_reason` (so the frontend can render the approved/rejected/request-info/suspended states). |
| GET | `/api/institution/credentials` | INSTITUTION | List issued credentials for this institution, paginated. |
| POST | `/api/institution/credentials` | INSTITUTION | Issue a single certificate. Body: `{ graduate_email, fields: [{name, value}, ...] }`. **Blocked with 403 if institution status != APPROVED** — check this server-side, not just in the UI. Calls `SigningService.signCredential(...)`, then checks if a `User` with that email already exists: if yes, sets `graduate_user_id` and status `ISSUED`; if no, leaves `graduate_user_id` null and status `PENDING_CLAIM`. |
| POST | `/api/institution/credentials/batch` | INSTITUTION | Body: spreadsheet upload. Parses rows, validates each (missing email → row-level error, not a whole-request failure), signs and issues all valid rows synchronously, returns a per-row result list. |
| POST | `/api/institution/activity-records` | INSTITUTION | Same shape as single-certificate issuance but `type: ACTIVITY_RECORD`. Keep this a separate endpoint (matches the wireframe's separate "Issue Activity Record" action) rather than overloading the certificate endpoint with a type flag buried in the body. |
| POST | `/api/institution/credentials/{id}/revoke` | INSTITUTION | Body: `{ reason: string }` (required). Status → `REVOKED`. Must belong to this institution — 403 if not. |
| GET | `/api/institution/disputes` | INSTITUTION | List open dispute flags on this institution's credentials. |
| POST | `/api/institution/disputes/{id}/uphold` | INSTITUTION | Body: `{ resolution_note, action: "EDIT" \| "REVOKE" }`. Sets `DisputeFlag.status = UPHELD`, and either updates the disputed `CredentialField` values (re-signing required — call `SigningService` again) or revokes the credential, per `action`. |
| POST | `/api/institution/disputes/{id}/dismiss` | INSTITUTION | Body: `{ resolution_note }`. Sets `DisputeFlag.status = DISMISSED`. Credential untouched. |

**Call `AuditLogService.log(...)` on**: revoke (credential-level), and
consider whether issuance itself should log — the wireframe's example
audit rows focus on institution status changes and revocations, not every
single issuance, so a reasonable default is: log revocations, skip
logging routine issuance (confirm with the team if volume of audit noise
becomes a concern).

---

## Screens & functions

### 1. Apply for accreditation (pre-approval — the *only* screen an
unaccredited institution sees)
- Fields: name, ministry, document upload (multi-file, PDF)
- CTA: "Submit for Review" → `POST /apply`
- **Outcome states**, driven by `GET /me` polling or a redirect-after-login
  check on every page load:
  - `PENDING` (no note yet): "Submitted — waiting on review"
  - `PENDING` (with a note from Request Info): "Application still pending
    — resubmit documents, no need to reapply" + the AA's note text +
    a way to upload additional documents
  - `APPROVED`: redirect to the Dashboard (screen 2) — this state should
    no longer show the apply screen at all
  - `REJECTED`: "✕ Application rejected" + `status_reason` + a way to
    resubmit (probably just re-enables the apply form)

### 2. Blocked state (approved-but-suspended institution hits Issue)
- "Accreditation suspended — You can't issue new certificates until
  reinstated by the Accreditation Authority." + contact email
- **Function to build:** a guard that checks `institution.status ===
  'APPROVED'` before rendering any issuance UI, not just before the API
  call succeeds — don't let a suspended institution see a working-looking
  form that then 403s on submit

### 3. Dashboard (only reachable once `APPROVED`)
- Table: Graduate | Type | Status | Date, status tag dimmed when `REVOKED`
- "+ Issue" → forks to single-certificate form or batch upload

### 4. Issue single certificate
- Fields: graduate email, then dynamic "+ Add field" rows (open-ended set
  — don't hardcode a fixed schema like just degree/GPA/date, the wireframe
  explicitly shows this as extensible)
- CTA "Sign & Issue" → `POST /credentials`

### 5. Batch issuance
- Upload spreadsheet → `POST /credentials/batch`
- Row-level result table: Row | Graduate | Status, with **specific error
  text** for failed rows (e.g. "(missing email)"), not just a generic
  fail flag
- Summary line ("2 valid, 1 error") + "Issue Valid Rows" proceeding with
  only the valid subset

### 6. Issue activity record
- Fields: graduate email, activity/role, date — copy: "Factual, event-
  based only — no ratings or remarks."
- CTA → `POST /activity-records`

### 7. Revoke credential (from a Dashboard row)
- "Verifiers will see this credential as revoked. This cannot be undone."
  Required reason. Confirm → `POST /credentials/{id}/revoke`

### 8. Dispute inbox
- List of open `DisputeFlag`s with the graduate's stated reason
- Per flag: Uphold (edit fields or revoke) / Dismiss, each with a required
  resolution note

---

## Build order

1. `POST /apply` + the Apply screen + the three outcome states (build
   this against a hand-stubbed `Institution` status if the real AA
   endpoints aren't ready yet — the contract is defined in shared
   foundations, don't wait on AA's implementation to start your own UI)
2. `GET /me` + the suspended-blocked guard
3. Dashboard + single-certificate issuance, wired to `SigningService`
   (stub it locally per shared-foundations guidance if Core hasn't shipped
   a real one yet)
4. Batch issuance with row-level validation
5. Activity record issuance (should reuse most of #3's plumbing)
6. Revoke flow
7. Dispute inbox + resolve actions

## Verification

**Manual QA checklist:**
- [ ] An unaccredited institution can only ever see the Apply screen and
      its outcome states — no route lets them reach the Dashboard early
- [ ] Rejected → resubmit → goes back to `PENDING`, doesn't create a
      duplicate `Institution` row
- [ ] Suspended institution: issuance UI is blocked both visually (guard)
      and server-side (403 if bypassed via direct API call)
- [ ] Issuing to an email with no existing `User` produces a credential
      with status `PENDING_CLAIM`, not `ISSUED`
- [ ] Issuing to an email with an existing Graduate `User` produces
      `ISSUED` and correctly sets `graduate_user_id`
- [ ] Batch upload with a mix of valid/invalid rows issues only the valid
      ones and shows the specific reason for each invalid row
- [ ] Revoke requires a reason (blocked client-side and rejected 400
      server-side without one) and is irreversible — no un-revoke path
      exists anywhere
- [ ] Uphold-with-revoke on a dispute actually revokes the credential;
      Uphold-with-edit actually changes the field value **and re-signs**
      (verify the old signature no longer validates against the new
      value, and the new one does)
- [ ] Dismiss leaves the credential completely untouched

**Suggested automated tests:**
- Integration test: issuance attempt while `status = SUSPENDED` returns
  403
- Integration test: batch endpoint with 3 rows (2 valid, 1 missing email)
  returns exactly 2 issued credentials and 1 row-level error in the
  response, not a total failure
- Unit test: dispute uphold-with-edit path calls `SigningService` again
  and the resulting `merkle_root`/`signature` differ from the original

## Acceptance criteria

- No institution can issue anything before AA approval, or while
  suspended — enforced server-side, not just hidden in the UI
- Batch issuance is synchronous with per-row feedback, matching the
  architecture decision in the project context (no async job queue)
- Activity records are factual-only by construction — the form itself
  shouldn't offer a ratings/remarks field, not just a copy warning
