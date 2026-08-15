# Task File — Graduate Portal

Read `00-shared-foundations.md` first. This file assumes you know the
shared `Credential`, `CredentialField`, `Share`, `ShareFieldSelection`, and
`DisputeFlag` entities, and the `MerkleService` interface.

**Note:** per current team plan, the selective-disclosure piece of this
portal (share creation, field-picker logic, proof generation wiring) is
being built by the same person who owns the Merkle/signing service on
Core — so if you're a different person picking this file up, confirm with
them which parts of this file are already spoken for before starting.

## Scope

You own graduate signup/claiming, the wallet/timeline view, selective
disclosure share creation, named share management + QR, and dispute
flagging from the graduate's side (the flag *submission*, not its
resolution — that's Institution's job, see `02-institution.md`).

## What "done" looks like

A graduate can sign up with an email that has pending credentials and see
them get claimed automatically, view a chronological timeline of every
credential across institutions, create a named share that discloses only
chosen fields (or the full timeline), manage/revoke those shares, and flag
a credential as disputed.

---

## Data model — what you own

Nothing new beyond shared foundations. You're the primary *writer* of
`Share` and `ShareFieldSelection` (on share creation) and `DisputeFlag`
(on submission — status starts `OPEN`, you never set it to
`UPHELD`/`DISMISSED` yourself).

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/graduate/signup/check` | none (pre-account) | Body: `{ email }`. Returns `{ pendingCredentialCount: N }` — used for the "N credentials found, will be claimed automatically" pre-confirmation step. Does **not** create the account. |
| POST | `/api/graduate/signup` | none (pre-account) | Body: `{ email, password }`. Creates `User` (role `GRADUATE`), then finds every `Credential` with matching `graduate_email` and status `PENDING_CLAIM`, sets `graduate_user_id` and status → `ISSUED` on each. |
| GET | `/api/graduate/timeline` | GRADUATE | List all credentials for this graduate, chronological, both certificates and activity records. |
| GET | `/api/graduate/credentials/{id}/fields` | GRADUATE | List a credential's individual `CredentialField`s — used to render the field-picker when creating a share. |
| POST | `/api/graduate/shares` | GRADUATE | Body: `{ name, scope: SINGLE_CREDENTIAL \| FULL_TIMELINE, credentialId?, selectedFieldIds?[] }`. For `SINGLE_CREDENTIAL`, calls `MerkleService.generateProof(credentialId, selectedFieldIds)` and stores the resulting proof reference + `ShareFieldSelection` rows. Returns the share including its `share_token` for QR generation. |
| GET | `/api/graduate/shares` | GRADUATE | List this graduate's shares with name, scope summary, revoked flag. |
| POST | `/api/graduate/shares/{id}/revoke` | GRADUATE | Sets `Share.revoked = true`. This kills the link — does **not** touch the underlying credential. |
| POST | `/api/graduate/credentials/{id}/flag` | GRADUATE | Body: `{ reason }`. Creates `DisputeFlag` with status `OPEN`. |
| GET | `/api/graduate/credentials/{id}/flags` | GRADUATE | So the graduate can see the outcome once Institution resolves it (`UPHELD`/`DISMISSED` + `resolution_note`). |

No `AuditLogService` calls expected from this portal per the wireframe's
example rows (which focus on institution/credential status changes) —
confirm with the team if share creation/revocation should also be logged;
reasonable to skip for now given it doesn't affect verifier-visible trust
state.

---

## Screens & functions

### 1. Sign up (claim preview)
- Field: email
- On blur/submit of email: call `POST /signup/check` → show "N
  credentials found for this email — will be claimed automatically"
  **before** the graduate sets a password / confirms — this preview step
  is explicit in the wireframe, don't skip straight to account creation
- CTA: "Verify Email & Continue" → `POST /signup`

### 2. Wallet / Timeline (two layout variants shown in wireframe — pick
one, both are valid, don't build both)
- Either a sidebar-nav list (Timeline / Shares / Settings, credential
  rows with status tags) or a vertical chronological feed (dot-and-line,
  institution + date inline) — **decide with whoever owns the design
  system** rather than picking in isolation, since this screen sets the
  visual tone other screens will follow
- Revoked credentials shown dimmed, not hidden
- Per-credential "+ Create Share" / "+ Share" action

### 3. Selective disclosure — field picker (the security-sensitive part)
- Fetch `GET /credentials/{id}/fields`, render as a checkbox list or
  inline per-field toggle (wireframe shows both patterns — pick one)
- Running indicator: "N of M fields will be shared"
- **Critical correctness point:** the frontend only decides *which
  fields to request disclosure of* — it must never construct or fake a
  Merkle proof itself. The actual proof comes back from `POST
  /shares` after calling `MerkleService.generateProof(...)` server-side.
  If you find yourself computing hashes in the frontend, stop — that's a
  sign the design has drifted from the intended trust model.
- CTA: "Generate Link" → `POST /shares` → show the resulting share +
  QR code

### 4. My Shares
- List: name, scope summary ("2 fields" or "full timeline"), QR code,
  edit/revoke actions
- Revoke → confirm → `POST /shares/{id}/revoke`, share immediately shows
  as revoked (and the public link should now resolve to "Invalid / Not
  Found" or similar on the Verifier side — coordinate this behavior with
  whoever owns `04-verifier.md`)

### 5. Dispute flag
- Reached via a flag icon on a timeline entry (separate action from
  sharing it)
- Prompt: "Flag '[entry]' for review?" + required reason text
- CTA: "Submit Flag" → `POST /credentials/{id}/flag`
- Once resolved, the timeline entry should surface the outcome: "Flag
  upheld — entry corrected" or "Flag dismissed — no change" +
  institution's `resolution_note`

---

## Build order

1. Signup + claim-preview flow (self-contained, no dependency on other
   screens — good first thing to build and demo)
2. Timeline view against real (or stubbed, per shared foundations) data
3. Field picker UI + `POST /shares` wiring, coordinating with Core on the
   real `MerkleService.generateProof` contract before hardcoding
   assumptions about the proof's shape
4. My Shares list + revoke
5. Dispute flag submission + outcome display

## Verification

**Manual QA checklist:**
- [ ] Signing up with an email that has 2 pending credentials shows "2
      credentials found" before the account is created, not after
- [ ] After signup, those credentials show `ISSUED` (not `PENDING_CLAIM`)
      and appear on the Timeline immediately
- [ ] A credential with 5 fields, sharing only 2, produces a share whose
      public verification (test against `04-verifier.md`'s endpoint) shows
      exactly those 2 fields and nothing else
- [ ] Revoking a share makes its public link stop resolving to a valid
      result — verify this against the actual Verifier endpoint, not just
      that the `revoked` flag flipped in the DB
- [ ] A `FULL_TIMELINE` share correctly includes every non-revoked
      credential, and a newly issued credential after the share was
      created — does it retroactively appear? Decide and document the
      intended behavior, then verify it matches
- [ ] Filing a dispute flag creates exactly one `DisputeFlag` with status
      `OPEN`; filing a second one on the same credential — is that
      allowed, or should the UI block it while one is already open?
      Decide and verify
- [ ] Once Institution resolves a flag (test via `02-institution.md`'s
      endpoints), the outcome and resolution note appear on this portal's
      timeline entry

**Suggested automated tests:**
- Integration test: `POST /shares` with a `SINGLE_CREDENTIAL` scope and 2
  of 5 fields selected, then fetch the share's public verification result
  and assert only those 2 field names appear in the response
- Integration test: `POST /signup` with an email matching 3
  `PENDING_CLAIM` credentials results in all 3 having `graduate_user_id`
  set and status `ISSUED` after the call
- Unit test: revoking a share sets `revoked = true` and a subsequent
  lookup by `share_token` reflects that (however the Verifier side chooses
  to represent "revoked share" — confirm the contract with
  `04-verifier.md`)

## Acceptance criteria

- Selective disclosure is genuinely field-level and genuinely enforced
  server-side — the graduate's frontend choice of fields is a *request*,
  and the actual disclosed data + proof comes from Core's Merkle service,
  never fabricated client-side
- Link revocation and credential revocation stay conceptually and
  technically separate — revoking a share must never touch
  `Credential.status`
