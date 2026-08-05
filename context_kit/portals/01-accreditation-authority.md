# Task File — Accreditation Authority Portal

Read `00-shared-foundations.md` first — this file assumes you already know
the shared entities (`Institution`, `InstitutionDocument`, `AuditLogEntry`)
and the `AuditLogService` interface.

## Scope

You own everything the Accreditation Authority (AA) role does: reviewing
institution applications, deciding their fate, and the audit log view.
You do **not** own institution self-registration (that's the Institution
portal's `POST /api/institution/apply` — you only read what it wrote and
act on it).

## What "done" looks like

An AA user can log in, see every institution and its status in one table,
open a pending one, review its documents, and issue one of four decisions
— each with correct, permanent-vs-reversible semantics — with the outcome
immediately visible to the institution and recorded in the audit log.

---

## Data model — what you own

Nothing new beyond `Institution` / `InstitutionDocument` / `AuditLogEntry`
from shared foundations. You're the primary *reader and mutator* of
`Institution.status`, and the primary *reader* of `AuditLogEntry` (every
portal writes to it, only you display it).

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/aa/institutions` | AA | List all institutions, all statuses, paginated. Support `?status=PENDING` filter. |
| GET | `/api/aa/institutions/{id}` | AA | Single institution detail, including its documents. |
| POST | `/api/aa/institutions/{id}/approve` | AA | Sets status → `APPROVED`, `decided_at` now. No reason required. |
| POST | `/api/aa/institutions/{id}/request-info` | AA | Body: `{ note: string }`. Status **stays `PENDING`** — this is not a new status, it's a note attached and surfaced to the institution. |
| POST | `/api/aa/institutions/{id}/reject` | AA | Body: `{ reason: string }` (required). Status → `REJECTED`. |
| POST | `/api/aa/institutions/{id}/suspend` | AA | Body: `{ reason: string }` (required). Only valid from `APPROVED`. Status → `SUSPENDED`. |
| POST | `/api/aa/institutions/{id}/reinstate` | AA | Only valid from `SUSPENDED`. Status → `APPROVED`. No reason required (this is a positive action). |
| POST | `/api/aa/institutions/{id}/revoke` | AA | Body: `{ reason: string }` (required). Valid from `APPROVED` or `SUSPENDED`. Status → `REVOKED`. **Terminal — no endpoint should ever move a `REVOKED` institution to any other status.** |
| GET | `/api/aa/audit-log` | AA | Paginated, newest first. Support `?institutionId=` filter. |

**Every mutating endpoint above must call `AuditLogService.log(...)`** with
a human-readable event string (e.g. `"Institution approved"`,
`"Institution suspended — reason logged"`) — see shared foundations for
the exact examples the wireframe uses. Do this inside the same transaction
as the status change, not as an afterthought — a status change without a
corresponding audit entry is a bug.

---

## Screens & functions

### 1. Registry (default landing screen)
- Table: Name | Ministry | Status | Submitted | Action
- Status tag component (shared design system) for each row
- Action column: "Review →" if `PENDING`, otherwise "View →"
- **Function to build:** `fetchInstitutions(statusFilter?)` → renders rows;
  clicking a row navigates to the review/detail screen for that id

### 2. Review wizard (2 steps, only reachable for `PENDING` institutions)
- **Step 1 — Documents**: list each `InstitutionDocument` with name and a
  verified/needs-check indicator. This step is informational only — no
  API call needed beyond the initial `GET /institutions/{id}` fetch.
  CTA: "Next: Decision →"
- **Step 2 — Decision**: four buttons — Approve / Request Info / Suspend /
  Reject. Suspend shouldn't actually be reachable here in practice (the
  institution is still `PENDING`, not `APPROVED` yet) — **if your UI shows
  Suspend as an option during initial review, that's a bug; Suspend only
  makes sense as an action on an already-`APPROVED` institution from the
  detail/view screen, not the first-review wizard.** Reject and Request
  Info require a text field before the button is enabled.

### 3. Suspend / Revoke actions (from an `APPROVED` institution's detail
view, not the review wizard)
- **Suspend modal**: copy along the lines of "They won't be able to issue
  new certificates until reinstated. Existing certificates stay valid."
  Required reason field. Confirm → calls `/suspend`.
- **Revoke modal** — a **separate** modal/component from Suspend, not a
  shared one with a dropdown: "Permanent — unlike suspend, this cannot be
  reversed by re-approval. Existing certificates keep their signature but
  the institution shows as revoked to all verifiers going forward."
  Required reason. Confirm → calls `/revoke`.
- From a `SUSPENDED` institution's detail view, offer a "Reinstate" button
  (no modal needed, low-risk reversible action) → calls `/reinstate`.

### 4. Audit log screen
- Table: When | Event | Actor (show "Anonymous verifier" when
  `actor_user_id` is null, don't show a blank or an error)
- **Function to build:** `fetchAuditLog(institutionId?)`, sortable by time
  descending by default

---

## Build order

1. `Institution` + `InstitutionDocument` read endpoints (list, detail) —
   get the Registry screen rendering against real data first, even before
   any decision logic exists.
2. Approve / Reject / Request-Info endpoints + Step 2 wizard UI.
3. Suspend / Reinstate / Revoke endpoints + their two distinct modals.
4. Audit log endpoint + screen, wiring in the `AuditLogService.log()`
   calls you should have already added in steps 2–3 (go back and confirm
   every mutation actually logs — easy to forget on one branch).

## Verification

**Manual QA checklist:**
- [ ] A `PENDING` institution shows "Review →"; every other status shows
      "View →", not "Review →"
- [ ] Approve sets status to `APPROVED` and it's immediately reflected in
      the Registry table without a manual refresh being required beyond
      normal navigation
- [ ] Reject without a reason is blocked client-side (button disabled) —
      and also rejected server-side (400) if called without one, don't
      rely on the frontend alone
- [ ] Request Info leaves status as `PENDING` — confirm in the DB/registry
      table, not just the modal closing
- [ ] Suspend is only offered on `APPROVED` institutions, never on
      `PENDING`, `REJECTED`, or `REVOKED`
- [ ] Revoke is only offered on `APPROVED` or `SUSPENDED` institutions
- [ ] After Revoke, no UI path anywhere lets you approve/reinstate that
      institution again — try to find one and confirm you can't
- [ ] Every one of Approve/Reject/RequestInfo/Suspend/Reinstate/Revoke
      produces exactly one new audit log row with a sensible event string
- [ ] Audit log shows "Anonymous verifier" (not blank, not an error) for
      any entry with a null actor

**Suggested automated tests:**
- Unit test on the status-transition logic: table-driven test asserting
  every valid transition succeeds and every invalid one (e.g. `REVOKED` →
  anything) throws/rejects
- Integration test: POST `/suspend` without a `reason` body field returns
  400, not a 500 or a silent success
- Integration test: after POST `/revoke`, a subsequent GET on that
  institution shows `status: REVOKED` and POST `/approve` on it returns an
  error (not a 200)

## Acceptance criteria (tie back to project requirements)

- Trust registry is enforceable: an institution's *current* status is
  always what verifiers see, independent of past certificate signatures
  (this portal is where that status gets set — get it right here and the
  Verifier portal's job becomes simple)
- Every irreversible or verifier-visible action has a reason that's both
  logged and shown to the affected institution — no silent status changes
