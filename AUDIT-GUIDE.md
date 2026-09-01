# CertiChain — Live Feature Audit Guide

**For:** a coworker (human or Claude) doing a hands-on walkthrough of every feature against its
intended workflow.
**Goal:** confirm each page loads, each action works, and the backend enforces the rules it
should. Not a code review — this is "click it and see if it does the right thing."

---

## 0. Setup

### Start the stack

```bash
# terminal 1 — backend (port 8081)
cd certichain-backend && ./mvnw spring-boot:run

# terminal 2 — frontend (port 3000)
cd certichain-frontend && npm run dev
```

Open **http://localhost:3000**. The frontend proxies `/api/*` to the backend, so you only
ever talk to `localhost:3000` — one origin, the `jwt` cookie is first-party.

If 3000 is taken, Next picks another port (watch the `npm run dev` output). Everything still
works on any port.

**One exception — the phone QR-scan check (§5.3):** to scan a share QR with a real phone,
browse on the machine's **LAN IP** instead of `localhost`. `npm run dev` prints it
("On THIS machine and on your phone, open: http://192.168.x.x:3000") and writes it to
`.env.local` as `DEV_LAN_IP`. The dev server binds `0.0.0.0`, and the API still works from
the phone because it's proxied same-origin (`:3000` → `:8081` server-side, no CORS). The
QR encodes `${window.location.origin}/share/<token>`, so you **must create the share while
browsing on the LAN IP** — a share made on `localhost` produces a `localhost` QR that a
phone can't open. Everything else in this guide works fine on `localhost`.

### The only seeded account

| Role | Email | Password |
|---|---|---|
| Accreditation Authority | `aa@certichain.local` | `aa-dev-password` |

There is **no seed data** beyond this. Every institution and graduate you test with must be
created through the app (`/register`, `/register/graduate`). The database is Neon
`production` and may already contain leftover records from earlier testing — that's fine,
just create fresh accounts with unique emails (e.g. `audit-inst-01@test.local`).

### Accounts you'll create during the audit

Plan to create, in order:
1. **Institution A** — via `/register`, then approve it as AA. Your main issuer.
2. **Graduate G1** — via `/register/graduate`, using an email you'll issue a credential to.
3. *(optional)* **Institution B** — a second institution, to test cross-institution guards
   (Institution B must not be able to touch Institution A's credentials/batches).

### Auth model (so you know what "correct" looks like)

- Login/signup sets a 12-hour `jwt` httpOnly cookie. Logout clears it.
- `/authority`, `/institution`, `/graduate` are gated. No cookie → bounce to `/login`.
  Wrong role → the page renders *"You're signed in with an account that doesn't have access
  to this portal."* instead of the content.
- `/verify`, `/verify/bulk`, `/share/<token>`, `/login`, `/register*`, `/forgot-password`,
  `/reset-password` are **public**.
- Backend authorizes every request independently — role is re-read from the DB each call,
  so a stale token still reflects current state.
- **Dev bypass:** setting `BYPASS_AUTH=1` (frontend env) disables the route gates. Leave it
  **unset** for this audit — you want to test the real gating.

### Known quirk — error messages

Backend error bodies are `{"error": "...", "code": "..."}`. The frontend's error mapper reads
`.message`, which isn't there, so **many error banners show a generic fallback** ("Something
went wrong", "Request failed") instead of the real reason. When a guard fires, verify via
the **Network tab** (status code + JSON body) rather than trusting the on-screen text. Note
any place this makes the UX confusing.

### What to record per check

- ✅ / ❌ / ⚠️ and a one-line note.
- For ❌: the HTTP request (method, path, status), the response body, and what you expected.
- Screenshots of anything visually broken.

---

## 1. Auth & registration

### 1.1 Institution registration — `/register`

3-step wizard. Hook → `POST /api/institution/apply` (multipart).

| Step | Do | Expect |
|---|---|---|
| Land on `/register` while logged out | — | Page loads, "STEP 1 OF 3" |
| Step 1 | Leave Name blank, click Next | Inline "Institution name is required.", stays on step 1 |
| Step 1 | Fill Name, Ministry Ref, Admin Email (valid), Phone (≥6 digits), Password (≥8) → Next | Advances to step 2 |
| Step 2 | Click Next with no file | "Upload at least one document." |
| Step 2 | Attach 1+ PDF → Next | Advances to step 3, files listed with sizes |
| Step 3 | Review table shows your entries. Submit **without** ticking consent | Button disabled |
| Step 3 | Tick consent → Submit | "Application Submitted" success screen + "Back to Login" |
| — | Try to log in with that email/password now | **Login succeeds** — the institution user exists immediately |
| — | As that institution, go to `/institution` | Yellow banner: *"application is still under review… can't issue certificates"* |
| — | Try `/institution/issue` and submit a certificate | **403** — `"Institution is not approved to issue credentials (status: PENDING)"` (check Network tab) |

**Also test:** register a second institution with the **same email** → expect
`400 "Email already registered"`.

### 1.2 Graduate registration — `/register/graduate`

2-step. `POST /api/graduate/signup/check` then `POST /api/graduate/signup`.

| Do | Expect |
|---|---|
| Step 0: fill first/last name, an email **with no pending credentials**, phone → Continue | Advances; step 1 banner says *"No credentials yet under this email — that's OK"* |
| Step 1: password < 8 → Create Account | "Password must be at least 8 characters." |
| Step 1: mismatched confirm | "Passwords don't match." |
| Valid password + match → Create Account | Redirects to `/login` (does **not** auto-login) |
| Log in with the new account | Lands on `/graduate` |

**The "pending credentials found" path** — test this *after* §3.2 (issue a certificate to an
email that has no account yet, then register with that email):
- Step 0 Continue → step 1 banner says *"We found N credential(s) waiting for you."*
- After signup + login → `/graduate/timeline` shows those credentials as **ISSUED** (they
  were auto-claimed on signup).

### 1.3 Login — `/login`

| Do | Expect |
|---|---|
| Blank email/password → Verify | Inline validation, no request |
| Valid email, wrong password | Banner "Incorrect email or password." (`400`, body `"Invalid email or password"`) |
| Unknown email | Same message (no user enumeration) |
| Correct AA credentials | Redirect to `/authority` |
| Correct institution credentials | Redirect to `/institution` |
| Correct graduate credentials | Redirect to `/graduate` |
| While logged in, manually visit `/login` | Redirected to `/` |
| Hammer login 11+ times in a minute | 11th returns **429** (plain text) |

### 1.4 Forgot / reset password

`POST /api/auth/forgot-password` → `POST /api/auth/reset-password`.

| Do | Expect |
|---|---|
| `/forgot-password`, enter any email → Send | "Check your email… expires in 30 minutes" (same screen whether or not the email exists) |
| Check the **backend console log** | The reset link is logged (also emailed if Resend is configured) |
| Open the reset link (`/reset-password?token=…`) | Form loads |
| `/reset-password` with no `?token=` | "Invalid reset link — missing token." + "Request a new link" |
| New password < 8 chars | "At least 8 characters." |
| Valid new password → Reset | "Password reset! Redirecting to login…" then `/login` |
| Reuse the **same** reset link again | `400` — `"Reset link already used"` |
| Log in with the new password | Works |
| Request 4 reset links for the same account within 15 min | 4th → `400 "Too many reset requests"` |

### 1.5 Change password (in-portal)

Any portal → Settings → Security. `POST /api/auth/password`.

| Do | Expect |
|---|---|
| Wrong current password | `400 "Current password is incorrect"` |
| New ≠ confirm | "Passwords don't match." (client-side) |
| Correct current + valid new | Toast "Password updated" / "Password changed" |
| Log out, log in with new password | Works |

---

## 2. Accreditation Authority portal — `/authority`

Log in as `aa@certichain.local`.

### 2.1 Dashboard — `/authority`

- 4 KPI cards: Pending / Approved / Suspended / Revoked. Each links to `/authority/registry`.
- "Needs Attention": pending applications (→ review) and disputed institutions (→ investigate).
- With Institution A pending (from §1.1), it should appear here.
- Empty state (no pending, no disputes): *"Nothing needs attention right now."*

### 2.2 Registry — `/authority/registry`

- Filter chips: All / Pending / Approved / Suspended / Revoked. Each refetches.
- Sidebar "Registry" nav item shows a **badge = pending count**.
- Search box: **filters the loaded page only** (documented limitation — footer says "search
  matches this page only"). Not a bug; note if it's misleading.
- Pending rows → link to `/…/{id}/documents` ("Review"). Non-pending → `/…/{id}` ("View").

### 2.3 Review flow — documents then decision

**Step 1 — `/authority/registry/{id}/documents`:**

| Do | Expect |
|---|---|
| Open a pending institution's documents | Left: doc list, each "needs check". Right: PDF preview of first doc |
| Click a doc filename | Preview pane loads that PDF (non-PDF → "Preview isn't available…") |
| "Next: Decision" button | **Disabled** while any doc is unverified (hover title shows count) |
| Click "Verify" on a doc → confirm modal → Verify | Doc flips to "verified" badge |
| Verify **all** docs | "Next: Decision" becomes enabled |
| Click "Verify" again on an already-verified doc (if UI allows) | `400 "Document is already verified"` |
| Download a doc | File downloads (via blob, no navigable URL) |

**Step 2 — `/authority/registry/{id}/decision`:**

| Action | Endpoint | Expect |
|---|---|---|
| **Request More Information** (with note) | `POST /api/aa/institutions/{id}/request-info` | "Information request sent — application remains pending." Status stays **PENDING**. Note appears as `statusReason` on the detail page. |
| Request info with **blank** note | — | `400` (required) |
| **Reject** (with reason) | `POST …/reject` | Back to registry; institution status → **REJECTED** |
| **Approve** | `POST …/approve` | "Approved" modal → auto-return to registry after ~1.5s. Status → **APPROVED**, `statusReason` cleared |

**After approving Institution A:**
- It disappears from "pending", appears under "Approved".
- Log in as Institution A → yellow banner is **gone**, issuance now works (§3).
- `GET /api/verify/institutions` (or the public verify page stats) now counts it.

### 2.4 Post-approval lifecycle — `/authority/registry/{id}`

Test the **state machine**. Each transition requires a reason (except reinstate/approve).

| From | Action | To | Notes |
|---|---|---|---|
| APPROVED | Suspend (reason) | SUSPENDED | "Existing certificates stay valid" |
| SUSPENDED | Reinstate | APPROVED | no reason needed, `statusReason` cleared |
| APPROVED | Revoke Accreditation (reason) | REVOKED | terminal |
| SUSPENDED | Revoke | REVOKED | terminal |
| REVOKED | *(any action)* | — | **403** `"Institution is revoked - this is terminal"` |
| PENDING | Suspend/Revoke/Reinstate | — | `400 "Cannot move institution from PENDING to …"` |

**Cross-check the effect on issued credentials:**
- Suspend Institution A → as Institution A, try to issue → **403** (gate is `status != APPROVED`).
- Its already-issued credentials still verify as VERIFIED, but `VerificationResponse`
  carries `institutionStatus: SUSPENDED` (the public verify directory dims it).
- Reinstate → issuance works again.

### 2.5 Audit log — `/authority/audit-log`

- Table: When / Event / Actor (UUIDs resolved to emails).
- After doing §2.3 + §3, you should see rows: `Institution application submitted`,
  `Document verified`, `Institution approved`, `CERTIFICATE_ISSUED`, `CERTIFICATE_REVOKED`,
  `SHARE_CREATED`, `VERIFY_EVENT`, etc.
- `?institutionId=` filter and the event-type dropdown filter the **loaded page only**
  (documented).
- Suspend/reject/revoke rows render in red.

### 2.6 Non-AA access

Log in as an institution or graduate, manually navigate to `/authority` → page shows the
"doesn't have access to this portal" message. Hit `/api/aa/institutions` directly → **403**.

---

## 3. Institution portal — `/institution`

Log in as **approved** Institution A.

### 3.1 Dashboard — `/institution`

- KPI band: Credentials issued / claimed (+ % bar) / open disputes. "Disputed" + "Revoked"
  pills.
- Credentials table (paginated). Empty initially: "No credentials issued yet."
- `BriefingCard` at top ("All clear" when nothing changed).

### 3.2 Issue single certificate — `/institution/issue`

`POST /api/institution/credentials`.

| Do | Expect |
|---|---|
| Blank email / title / date → Sign & Issue | Per-field "…is required" |
| Invalid email | "Enter a valid email address." |
| **Issue to G1's email** (an existing graduate) — title "BSc Computer Science", grad date, one extra field (e.g. Honors / Cum Laude) | Green banner "Certificate signed and issued. Graduate has been notified." Form resets. |
| **Issue to a brand-new email** (no account yet) | Same success banner — but credential is `PENDING_CLAIM`, no notification sent |
| Add an "Expires On" date in the past, issue, then verify it | Verifier shows **EXPIRED** |

**Then check the graduate side (§5):** G1's `/graduate/timeline` shows the new credential
as ISSUED; G1 has a notification.

### 3.3 Issue activity record — `/institution/activity-records`

`POST /api/institution/activity-records`. Fields: Graduate Email, Date, Activity/Role Title,
optional Expires On. (Description textarea is intentionally disabled.)

| Do | Expect |
|---|---|
| Issue an activity record to G1 ("Student Council President", a date) | "Record issued and signed on-chain. Graduate notified." |
| Check G1 timeline | New row, type = Activity Record |

### 3.4 Batch issuance — `/institution/batch`

`POST /api/institution/credentials/batch` (multipart CSV).

| Do | Expect |
|---|---|
| Click "Download Template" | `batch-template.csv` downloads; header `graduate_email,type,degree,graduationDate,expires_at` |
| Upload **`batch-test.csv`** (repo root) | Preview: "8 rows detected — nothing issued yet" |
| Click "Confirm & Issue on Blockchain" | Results table: **5 Issued, 3 Errors** |

Expected per-row result for `batch-test.csv`:

| Row | Email | Result |
|---|---|---|
| 1 | alice.win | ✅ Issued |
| 2 | bo.kyaw | ✅ Issued |
| 3 | carol.aung (activity_record) | ✅ Issued |
| 4 | *(blank email)* | ❌ "missing graduate_email" |
| 5 | dana.hla (degree empty) | ✅ Issued (empty **value** is allowed; only field *name* is required) |
| 6 | erik.thu (`type=bogus_type`) | ❌ "Unknown type: bogus_type" |
| 7 | fiona.moe (`graduationDate=not-a-date`) | ✅ Issued (only `expires_at` is date-validated) |
| 8 | grace.zin | ✅ Issued |

Key properties to confirm:
- **One bad row does not block the good rows** (5 still issued).
- All 5 issued rows share **one `batchId`** (visible in §3.5).
- Whether rows land ISSUED vs PENDING_CLAIM depends on whether those `*.test.local` emails
  have accounts — either is fine.

**Also test:** upload the same CSV while Institution A is **SUSPENDED** → **every row errors**
with the 403 approval-gate message.

### 3.5 Batches list + revoke batch — `/institution/batches`

`GET /api/institution/credentials/batches`, `POST /…/batches/{batchId}/revoke`.

| Do | Expect |
|---|---|
| Open `/institution/batches` after §3.4 | One row: Issued timestamp, Credentials = 5, Revoked = `0 / 5` (green) |
| Click "Revoke batch" → modal → submit **blank reason** | "A reason is required before revoking." |
| Enter a reason → Revoke batch | Toast "5 revoked" (or "N revoked, M already revoked"). Row now `5 / 5` (red), button gone |
| **Idempotency:** if you could revoke again, it returns `{revoked: 0, alreadyRevoked: 5}` | — |
| Verify one of the batch's credentials (§4) | Shows **REVOKED** with your reason |
| Check a batch-member graduate's notifications | "Certificate revoked" notification present |

### 3.6 Single revoke — from `/institution` dashboard

Row `⋮` menu → "Revoke Certificate" → modal (required reason) → `POST /…/{id}/revoke`.

| Do | Expect |
|---|---|
| Revoke G1's BSc certificate (from §3.2) with a reason | Modal closes, row status → Revoked |
| G1's timeline | That credential shows REVOKED + the reason |
| G1's notifications | "Certificate revoked" |
| Verify that credential ID (§4) | **REVOKED**, body has `revokedAt` + `revokeReason` |
| Revoke the **same** credential again | ⚠️ **No guard** — it re-stamps and fires **another** notification. Note this (batch revoke skips already-revoked; single revoke doesn't). |

### 3.7 Credential detail + edit — `/institution/credentials/{id}`

`GET /…/{id}`, `GET /…/{id}/fields`, `PUT /…/{id}`.

| Do | Expect |
|---|---|
| Open a non-revoked credential | CertificateHero + Credential Details (fields) |
| Click Edit → change a field value → Save Changes | Re-signed; graduate notified; new values shown |
| Open a **revoked** credential, try to edit + save | `400 "Cannot edit a revoked credential"` |
| Clear a field to blank in edit → Save | Per-field "…is required" (client blocks it) |

### 3.8 Disputes (institution side) — `/institution/disputes`

Needs a dispute filed by G1 first (§5.4). `GET /api/institution/disputes` returns only
**OPEN** disputes on your own credentials.

| Do | Expect |
|---|---|
| Open `/institution/disputes` after G1 files one | Row with status "Open", stat card "Open: 1" |
| **Dismiss** → modal → blank note → confirm | "A note is required before resolving." |
| Dismiss with a note | Status → Dismissed. Credential **unchanged**. G1 notified + sees your note. |
| On another OPEN dispute, click **Uphold** | Navigates to `/institution/credentials/{id}?disputeId=…` |
| On that page: Edit fields → "Save & Resolve Dispute" | Credential re-signed with new values; dispute → **UPHELD**; back to disputes list |
| *(Alternative uphold = revoke)* is driven by `action: "REVOKE"` — the edit-page path uses `action: "edit"`. To test revoke-uphold, call `POST /…/disputes/{id}/uphold {resolution_note, action:"REVOKE"}` directly | Credential → REVOKED, dispute → UPHELD |
| Try to resolve an already-resolved dispute (call the endpoint again) | `400 "Dispute already resolved"` |

### 3.9 Analytics — `/institution/analytics`

`GET /api/institution/analytics`.
- 3 stat cards: total issued, total verifications, expiring-soon (within 30 days, ISSUED).
- Two SVG sparklines (issuances/day, verifications/day, last 30 days).
- After issuing + verifying a few credentials, the numbers and sparklines should be non-zero.
- Empty state: "No activity in the last 30 days."

### 3.10 Settings — `/institution/settings`

`GET/PUT /api/institution/me`.

| Do | Expect |
|---|---|
| Change Name, Phone, Website → Save Profile | Toast success; reload keeps changes |
| Set Brand color to a very light color (e.g. `#EEEEEE`) → Save | `400` — "too light for white text" (WCAG contrast < 4.5). Banner may be generic — check Network tab. |
| Set Brand color to a dark hex (e.g. `#123456`) → Save | Saves; `CredentialCard` preview updates |
| Bad hex (`#12` or `red`) | `400` (must match `^#[0-9a-fA-F]{6}$`) |
| Accent pattern dropdown: hatch / dots / none → Save | Preview updates |
| Upload a logo (jpeg/png/webp/gif ≤ 5MB) → Save | Uploads; preview shows it |
| Upload a .txt or a 10MB image | Rejected (client + server) |
| "Remove" logo, then Save | Logo cleared (this was a recently-fixed bug — confirm it resets to default state, not just on save) |
| Toggle a Notification Preference, reload | ⚠️ Resets — "Not saved yet — resets on refresh." (by design; note it) |
| Ministry Reference field | Disabled (not editable) |

### 3.11 Cross-institution guards (needs Institution B)

Create + approve Institution B. As **Institution B**, using IDs that belong to **Institution A**:

| Call | Expect |
|---|---|
| `POST /api/institution/credentials/{A's credential id}/revoke {reason}` | **403** `"Credential belongs to another institution"` |
| `GET /api/institution/credentials/{A's credential id}` | 403 / 404 |
| `POST /api/institution/credentials/batches/{A's batchId}/revoke {reason}` | **404** `"Batch not found"` (cross-institution is indistinguishable from "no such batch" here) |
| `GET /api/institution/disputes` | Only B's disputes, never A's |

---

## 4. Verifier (public) — `/verify`

No login. Rate-limited 30 req / 60s / IP.

### 4.1 Verify by ID / link — `/verify`

| Input | Expect |
|---|---|
| A valid **ISSUED** credential ID (copy from institution dashboard or graduate timeline URL) | Green "Certificate Verified" card: institution name, title, issued-to, dates, checklist |
| A **REVOKED** credential ID | Red "This Certificate Was Revoked" + revocation reason + revoked date |
| An **EXPIRED** credential ID | "This Certificate Has Expired" + expiry date |
| Random / malformed ID | "Certificate Not Found" (HTTP **200** with `result: INVALID_NOT_FOUND` — never a 404) |
| Paste a full `/share/<token>` link or credential URL in the "Link" box | Extracts the ID and verifies |
| Verify the same credential 3× | Each is a `VERIFY_EVENT` — the graduate's & institution's verification counts go up |

### 4.2 Verify by QR image — `/verify` → "Scan QR Code" tab

`POST /api/verify/file` (multipart). **This tab is a file *upload*, not a live camera
scanner** — there is no in-app camera scan anywhere. The backend expects a **JSON file**
with a `credentialId` key (there's no real export/QR-decode format yet).

| Do | Expect |
|---|---|
| Upload a JSON file `{"credentialId":"<a valid uuid>"}` | Same result card as verify-by-ID |
| Upload a random image / non-JSON | `INVALID_NOT_FOUND` |

*(The tab is labelled "Scan QR Code" but there's no scanning — it parses an uploaded JSON
file. Flag the mislabel. The only real "point your phone at a QR" flow is the share QR in
§5.3.)*

### 4.3 Bulk verify — `/verify/bulk`

`POST /api/verify/bulk` (multipart). **One credential UUID per line.** Optional
`certificate_id` header line is skipped. No quoting / multi-column support.

| Do | Expect |
|---|---|
| Make a `.csv` with ~5 UUIDs (mix of ISSUED, REVOKED, one garbage line) | Results table: each row `input / credential title / result badge` |
| Badges | VERIFIED / REVOKED / EXPIRED / Not Found |
| Summary line | "N verified · M flagged" |
| Garbage UUID line | That row → "Not Found" |

### 4.4 Tamper detection

If you can edit a `credential_field.field_value` directly in the DB (Neon console) for an
ISSUED credential, then verify it → should flip to **INVALID_NOT_FOUND** (Merkle root
recompute fails). Optional but it's the core integrity guarantee.

### 4.5 Public institution directory

`GET /api/verify/institutions` — shows **APPROVED + SUSPENDED** institutions only (suspended
ones dimmed), PENDING/REJECTED/REVOKED hidden. Not wired to a dedicated page; check via the
endpoint or the trust-stats pill on `/verify`.

---

## 5. Graduate portal — `/graduate`

Log in as G1.

### 5.1 Overview — `/graduate`

- Greeting, "Share Profile" button → `/graduate/shares`.
- 4 stat cards: Total Credentials / Fully Claimed / Active Shares / Total Verifications.
- Top-3 recent credential cards, Recent Activity timeline, Active Shares mini-list.
- After §3.2–3.3, credentials from Institution A appear here.

### 5.2 My Credentials / Timeline — `/graduate/credentials`, `/graduate/timeline`

| Page | Check |
|---|---|
| `/graduate/credentials` | Grid of cards. Filter chips: All / Certificates / Activity Records — each filters correctly |
| `/graduate/credentials/{id}` | CertificateHero, fields, collapsible "issuer accreditation & signature", Verification History ("Verified N times — no verifier identity is ever recorded") |
| `/graduate/timeline` | Merged feed: credentials issued + shares created + disputes filed, chronological. Filter chips work |

### 5.3 Shares — `/graduate/shares`

`POST /api/graduate/shares`, `GET /…/shares`, `POST /…/shares/{id}/revoke`,
`GET /…/shares/{id}/activity`.

**Create a full-timeline share:**

| Do | Expect |
|---|---|
| "Create New Share" → blank name → Create | "Give this share a name." |
| Name it, scope "Full timeline" → Create | ShareDetailPanel opens: QR code, Code (token), Link (`<origin>/share/<token>`), "Share Activity" (empty) |
| Copy the link, open it in an **incognito window** (§7) | Public share page renders the timeline |
| Back in the portal, reopen the share → "Share Activity" | Now shows a view timestamp (no viewer identity) |
| Share row "Views" count | Incremented |

**Phone QR scan** (do this one on the **LAN IP**, not `localhost` — see §0):

| Do | Expect |
|---|---|
| While browsing on `http://<lan-ip>:3000`, create a share; open ShareDetailPanel | QR + link both start `http://<lan-ip>:3000/share/…` (not `localhost`) |
| Scan the QR with a phone camera (phone on the same Wi-Fi) | Phone browser opens `/share/<token>`, renders the shared timeline |
| Phone: also open `http://<lan-ip>:3000/verify` and verify a credential ID by hand | Works — API is proxied same-origin, no CORS error |
| Reopen the share in the portal → "Share Activity" | The phone's view is logged as a timestamp |

**Create a single-credential share with selective disclosure:**

| Do | Expect |
|---|---|
| "Create New Share" → scope "Single credential" → pick a credential | Field checkboxes appear ("Leave all unchecked to share every field") |
| Check only 1–2 fields → Create | Share created |
| Open the share link (incognito) | Only the selected fields are disclosed; others hidden |

**Revoke a share:**

| Do | Expect |
|---|---|
| Click "Revoke" on an active share | Status → Revoked |
| Open that share's link again | "This Share Link Was Revoked" (link_off icon) — **distinct** from a revoked credential |
| Verify one of that graduate's credentials **by direct ID** | Still VERIFIED — revoking the *link* doesn't touch the *credential* |

**Guard checks (call the API directly as a different graduate G2):**
- `POST /api/graduate/shares/{G1's share id}/revoke` → **403** `"Share belongs to another graduate"`
- `POST /api/graduate/shares {scope:"SINGLE_CREDENTIAL"}` with no `credentialId` → `400`
- `POST /api/graduate/shares {scope:"FULL_TIMELINE", credentialId:"…"}` → `400 "credentialId must be omitted"`
- `selectedFieldIds` containing a field ID from a **different** credential → `400 "Field does not belong to this credential"`

### 5.4 Disputes (graduate side) — `/graduate/disputes` and credential detail

`POST /api/graduate/credentials/{id}/flag`.

| Do | Expect |
|---|---|
| `/graduate/disputes` → "Raise a Dispute" → pick credential, pick reason (Incorrect details / Not my credential / Other), optional detail → submit | "Flag submitted" success screen |
| Also test from `/graduate/credentials/{id}` → "Flag this credential for review" | Same flow, reason `<reason>: <detail>` |
| Blank reason | "Select a credential and a reason." |
| Immediately after filing — verify that credential (§4) | **Still VERIFIED** — filing a dispute does **not** change what verifiers see. Only the institution's uphold+revoke does. |
| `/graduate/disputes` list | Shows your dispute as "Under Review" (OPEN) |
| File 2+ disputes on the same credential | Allowed — no cap |
| After institution dismisses it (§3.8) | Status → Dismissed, resolution note visible |
| After institution upholds it | Status → Upheld; if action was REVOKE, timeline shows REVOKED |
| Guard: `POST /api/graduate/credentials/{G2's credential id}/flag` as G1 | **403** `"Credential belongs to another graduate"` |

### 5.5 Settings — `/graduate/settings`

- Email + Role fields disabled.
- 3 notification-preference toggles — **session-only** ("Not saved yet — resets on refresh").
- Security → change password (same as §1.5).

---

## 6. Notifications (all portals)

Topbar bell on every portal page. `GET /api/notifications`, `/unread-count`,
`PATCH /{id}/read`, `PATCH /read-all`.

| Do | Expect |
|---|---|
| As G1 after receiving an issued/revoked credential | Bell shows unread count; dropdown lists "Certificate issued" / "Certificate revoked" etc. |
| Click a notification | Marked read, count decrements |
| "Mark all read" | Count → 0 |
| Fresh account, no activity | "No notifications yet." |
| An **institution** after AA approves/suspends it | Notification "Institution approved" / "Institution suspended" |

---

## 7. Public-page access sanity

Open an **incognito window** (no cookie):

| URL | Expect |
|---|---|
| `/` | Landing page, loads |
| `/verify`, `/verify/bulk` | Load, fully usable |
| `/share/<valid token>` | Renders the shared timeline |
| `/share/garbage` | "Link Not Found" |
| `/login`, `/register`, `/register/graduate`, `/forgot-password` | Load |
| `/institution` | **Redirect to `/login?redirect=/institution`** |
| `/authority` | Redirect to `/login?redirect=/authority` |
| `/graduate` | Redirect to `/login?redirect=/graduate` |

Then log in as a **graduate** and manually visit `/institution` and `/authority` → each
shows the "doesn't have access to this portal" message (not the real content).

---

## 8. Things known to be incomplete (don't file these as bugs — just confirm they behave as noted)

- **Per-institution signing keys** — `V2` migration adds `public_key` / `private_key_enc`
  columns but nothing populates them. Signing is one app-wide HMAC. A verified signature
  means "signed by this backend", not "by this specific institution". `publicKey` in API
  responses is `null`.
- **Notification preference toggles** (all 3 portals' Settings) — UI only, reset on refresh.
- **Registry / audit-log search** — filters the currently-loaded page, not the whole dataset
  (labelled as such).
- **"Scan QR Code" tab on `/verify`** — no camera scanner exists; it's a file upload that
  expects JSON `{credentialId}`, not a QR image or export file. The only genuine
  scan-with-phone path is the share QR (§5.3).
- **Graduate signup name/phone** — collected by the form, sent, but the backend only reads
  email + password.
- **CSV parsing** — naive `split(",")`; values containing commas break. Quoted values not
  supported.
- **Error banners** — often show a generic fallback instead of the server's real message
  (frontend reads `.message`, backend sends `.error`). Verify guard behavior via Network tab.
- **Single-credential re-revoke** — no guard; re-revoking fires a duplicate notification
  (batch revoke correctly skips already-revoked).

---

## 9. Reference — full route list

| URL | Role | Purpose |
|---|---|---|
| `/` | public | Landing |
| `/login` | public | Login |
| `/register` | public | Institution registration (3-step) |
| `/register/graduate` | public | Graduate registration (2-step) |
| `/forgot-password` | public | Request reset link |
| `/reset-password?token=` | public | Set new password |
| `/verify` | public | Verify by ID / link / QR image |
| `/verify/bulk` | public | Bulk verify (CSV of IDs) |
| `/share/[token]` | public | Shared credential timeline |
| `/authority` | AA | Dashboard |
| `/authority/registry` | AA | Institution registry + filters |
| `/authority/registry/[id]` | AA | Institution detail + lifecycle actions |
| `/authority/registry/[id]/documents` | AA | Review step 1 — verify documents |
| `/authority/registry/[id]/decision` | AA | Review step 2 — approve / reject / request info |
| `/authority/audit-log` | AA | Audit log |
| `/authority/settings` | AA | Profile + password |
| `/institution` | INSTITUTION | Dashboard + credentials table + single revoke |
| `/institution/issue` | INSTITUTION | Issue single certificate |
| `/institution/activity-records` | INSTITUTION | Issue activity record |
| `/institution/batch` | INSTITUTION | Batch issuance (CSV upload) |
| `/institution/batches` | INSTITUTION | Batch list + revoke whole batch |
| `/institution/disputes` | INSTITUTION | Dispute queue (dismiss / uphold) |
| `/institution/analytics` | INSTITUTION | Issuance / verification analytics |
| `/institution/settings` | INSTITUTION | Profile, branding, password |
| `/institution/credentials/[id]` | INSTITUTION | Credential detail + edit (+ dispute resolution) |
| `/graduate` | GRADUATE | Overview |
| `/graduate/credentials` | GRADUATE | Credential grid |
| `/graduate/credentials/[id]` | GRADUATE | Credential detail + flag |
| `/graduate/timeline` | GRADUATE | Merged activity timeline |
| `/graduate/shares` | GRADUATE | Create / view / revoke shares |
| `/graduate/disputes` | GRADUATE | Dispute list + raise dispute |
| `/graduate/settings` | GRADUATE | Profile + password |

## 10. Reference — suggested audit order

1. §1.1 register Institution A → §2.3 approve it
2. §1.2 register Graduate G1 (use an email you'll issue to)
3. §3.2–3.3 issue single certificate + activity record to G1
4. §3.4–3.5 batch issue (`batch-test.csv`) + revoke the batch
5. §5.1–5.3 G1: view credentials, create + open + revoke shares
6. §5.4 G1 files a dispute → §3.8 institution dismisses one, upholds another
7. §3.6 institution revokes G1's remaining certificate
8. §4 verify everything (ISSUED, REVOKED, EXPIRED, bulk)
9. §2.4 suspend/reinstate/revoke Institution A, re-check the issuance gate
10. §1.4 password reset, §1.5 change password
11. §3.11 + §5.3 cross-account guard checks (needs Institution B / Graduate G2)
12. §7 public-access sanity in incognito
13. §5.3 phone QR scan — switch the browser to `http://<lan-ip>:3000` first, create a fresh
    share there, scan with a phone on the same Wi-Fi
