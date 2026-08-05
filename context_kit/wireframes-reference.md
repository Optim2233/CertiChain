# CertiChain Wireframes — Reference

Distilled from the current `CertiChain_Wireframes.html` (a bundler export
with heavy embedded font/binary data — this is the useful screen content
extracted into plain text). Treat these as a **starting point for screen
flow and state handling**, not a locked spec. Five turns covering all four
portals plus the public verifier directory.

## Turn 1 — Accreditation Authority portal (institution review flow)

**Registry (dense table, default view):**
- Sidebar nav: Registry / Audit Log / Settings
- Table columns: Name | Ministry | Status | Submitted | Action
- Status tag values seen: `pending`, `suspended`, `revoked`, `approved`
- Each row has a "Review →" (pending) or "View →" (all others) action

**Review wizard — two-step, per pending institution:**
- **Step 1 of 2 — Documents**: lists uploaded docs with per-doc status,
  e.g. "accreditation_cert.pdf ✓ verified", "gov_registration.pdf — needs
  check". CTA: "Next: Decision →"
- **Step 2 of 2 — Decision**: four decision buttons — **Approve / Request
  Info / Suspend / Reject** — plus a required "note / reason" field for
  all but Approve.

**Decision outcome modals (fork from Step 2):**
- **Suspend modal**: "They won't be able to issue new certificates until
  reinstated. Existing certificates stay valid." Required reason field
  (shown to institution + logged). Confirm button: "Suspend."
- **Revoke modal** (distinct from suspend, reached separately — permanent
  decisions get their own modal, not a variant of the suspend one):
  "Permanent — unlike suspend, this cannot be reversed by re-approval.
  Existing certificates keep their signature but the institution shows as
  revoked to all verifiers going forward." Required reason. Confirm button:
  "Revoke Permanently."
- **Request Info outcome**: "Application stays pending. Institution sees
  the request and can resubmit documents without starting over."

**Audit log screen** (reachable from any registry row, not just mid-review):
- Table columns: When | Event | Actor
- Example rows: "Institution approved" / "Institution suspended — reason
  logged" / "Certificate revoked — reason logged" / "Certificate verified
  (view-only, no personal data shown)" — actor listed as "anonymous
  verifier" for that last one, confirming verifier actions are logged
  without capturing verifier identity.

## Turn 2 — Institution Portal

**Dashboard — issued credentials** (only reachable once accredited):
- Sidebar nav: Dashboard / Issue New / Activity Records / Settings
- Table columns: Graduate | Type | Status | Date
- Row status tags: `issued`, `revoked` (dimmed when revoked)
- "+ Issue" CTA forks into single-certificate or batch upload

**Issue single certificate — form:**
- Fields: graduate email, degree/program, graduation date, "+ Add field"
  for additional fields (GPA, honors, etc. — open-ended, not a fixed set)
- CTA: "Sign & Issue"

**Batch issuance — upload & row validation:**
- Upload a spreadsheet (e.g. `graduating_class_2026.xlsx`)
- Row-level table: Row | Graduate | Status, with **specific per-row error
  text** where applicable (e.g. "(missing email)" as the value shown in
  place of the graduate name for an errored row) — not just a pass/fail tag
- Summary line: "2 valid, 1 error — fix or skip"
- CTA: "Issue Valid Rows" — valid rows proceed even with some rows errored

**Apply for accreditation** (pre-accreditation — this is the *entire*
institution-facing experience before approval; the dashboard above doesn't
exist yet at this stage):
- Fields: institution name/ministry, upload accreditation documents (PDF)
- Note: "Submitted applications enter the Accreditation Authority's review
  queue"
- CTA: "Submit for Review"
- **Outcome states** (fork after AA review — now four possible outcomes,
  matching Turn 1's four decision buttons):
  - **Approved**: "✓ Accreditation approved — You can now issue
    certificates & activity records"
  - **Rejected**: "✕ Application rejected" + specific reason (e.g.
    "gov_registration.pdf could not be verified. You may resubmit.")
  - **More info requested**: "Application still pending — resubmit
    documents, no need to reapply"

**Blocked state — suspended institution tries to issue:**
- "Accreditation suspended" — "You can't issue new certificates until
  reinstated by the Accreditation Authority." + contact email

**Issue activity record** (second credential type, separate action from
single-certificate issuance):
- Fields: graduate email, activity/role (e.g. "Club President"), date
- Explicit note: "Factual, event-based only — no ratings or remarks.
  Signed the same way as a certificate."

**Revoke credential — confirm** (reached from a row's "revoke" link on the
dashboard):
- "Verifiers will see this credential as revoked. This cannot be undone."
- Required reason field
- Two-button confirm: Cancel / Revoke

## Turn 3 — Graduate Portal

**Wallet/Timeline — two layout variants explored, same underlying data:**
- Sidebar-nav variant: Timeline / Shares / Settings, credential rows with
  status tags (`issued` / `revoked`, dimmed when revoked), "+ Create Share"
  per credential
- Timeline-feed variant: vertical scroll, chronological dot-and-line feed
  per credential (institution + date shown inline), "+ Share" as a header
  action rather than per-row

**Selective disclosure — choose fields (two interaction patterns shown):**
- **Checkbox-list pattern**: explicit list of fields with checked/unchecked
  state, hidden fields shown dimmed (e.g. "GPA (hidden)", "Student ID
  (hidden)"). CTA: "Generate Link."
- **Inline-toggle pattern**: tap a timeline entry to expand it in place,
  per-field toggle switches, running counter "2 of 5 fields will be
  shared."
- Both patterns confirm: disclosure is a per-field, per-share choice made
  at share-creation time, not a global graduate-level default.

**Named share management ("My shares"):**
- Each share shows a name (graduate-chosen, e.g. "For LinkedIn," "For
  Employer X"), a summary of what's included (e.g. "2 fields" or "full
  timeline" — confirming a share can cover a single credential *or* the
  whole timeline), and edit/revoke actions
- QR code rendered alongside the share list

**Sign up — claiming pending credentials** (first-login flow, happens once
before the wallet exists for a new graduate):
- Field: email (must match issued records)
- **Explicit pre-confirmation step**: "N credentials found for this email
  — will be claimed automatically" is shown *before* the graduate confirms
  — i.e., the claim preview happens during signup, not silently after.
- CTA: "Verify Email & Continue"

**Dispute flag on a timeline entry:**
- Reached via a flag icon on an entry (separate action from sharing it)
- Prompt: "Flag '[entry]' for review?" + required "what's inaccurate"
  text field
- CTA: Cancel / "Submit Flag"
- **Two possible outcomes, both surfaced back to the graduate:**
  - **Upheld**: "Flag upheld — entry corrected" — institution updated or
    revoked the flagged entry
  - **Dismissed**: "Flag dismissed — no change" — "Institution responded:
    record stands as issued"

## Turn 4 — Verifier Portal (and public directory)

**Landing — verify entry points:**
- No account required
- Three entry methods: enter certificate ID / upload file / open shared
  link
- Link out: "Browse accredited institutions →" (leads to the public
  directory below)

**Public institution registry (read-only, no login):**
- Table columns: Name | Ministry | Status
- Wireframe shows `approved` institutions listed normally, and a
  `suspended` institution listed but dimmed
- Caption states: "No login required — pending/rejected/revoked
  institutions are not listed here"
- ⚠️ **Note the apparent inconsistency**: the caption says only
  pending/rejected/revoked are excluded (implying suspended *is* shown),
  and the mockup itself does show a dimmed suspended row — so these agree
  with each other, but this detail is easy to mis-implement as "only show
  approved." Confirm intended behavior before building: suspended
  institutions likely should remain visible (dimmed/flagged) so a verifier
  checking on them can see the current status, rather than disappearing
  from the list entirely.

**Single-credential result — Verified:**
- "✓ Verified" tag, credential title, "Issued to: [name]"
- Detail box: issuer name, issuer accreditation status tag, issue date
- Note: "Only fields the graduate chose to share are shown"
- Collapsible: "▾ show issuer accreditation & signature details" (detail
  area hidden by default, expand on tap)

**Multi-entry (timeline) result:**
- Shows multiple credential entries for one shared timeline link
- Each entry gets its **own independent verification result** shown
  per-row (e.g. "✓ verified" next to one entry, a red "revoked" tag next
  to another in the same list)

**Single-credential result — Revoked** (distinct screen from Verified, not
just a color swap):
- "✕ Revoked" tag, credential title (dimmed), "Issued to: [name] ·
  [institution]"
- Explicit explanatory copy: "This credential was revoked by the issuing
  institution on [date]. Signature was valid; status overrides it." — good
  language to reuse verbatim or near-verbatim in the real UI, since it
  correctly communicates the point-of-trust-vs-point-of-signature principle
  to a non-technical verifier.

**Invalid / not found state:**
- "✕ Invalid / Not Found" — "No matching certificate, or content doesn't
  match its signature"

## Notes for implementation

- **Status tags used consistently across portals**: `pending`, `approved`,
  `suspended`, `rejected`, `revoked` (institutions); `issued`, `revoked`
  (credentials); `valid`, `error` (batch rows); `Verified`, `Revoked`,
  `Invalid/Not Found` (verifier results). A shared status/tag component on
  the frontend, and a small set of well-named enums on the backend, will
  cover nearly all of this — resist the urge to invent additional statuses
  per-portal.
- **Suspend and revoke are separate confirm-modals with separate copy and
  separate irreversibility semantics** — don't collapse them into one
  "change institution status" endpoint/modal with a dropdown. Same applies
  to credential-level revoke, which is its own action distinct from both.
- **Every state-changing action that's irreversible or verifier-visible
  requires a reason, and that reason is both logged and shown to the
  affected party** — institution suspend/revoke, credential revoke. This is
  a consistent pattern worth enforcing at a shared level (e.g. a common
  `reason` field + audit-log write baked into a shared service method)
  rather than reimplemented per action.
- **The audit log's "anonymous verifier" entry** confirms verifier actions
  are logged without capturing a verifier identity — the audit_log table
  shouldn't require a verifier_id foreign key.
- **Dispute flags have real outcomes**, not just a boolean "flagged" state
  — model at minimum: flag submitted → (upheld: institution edits/revokes
  the entry) or (dismissed: flag closed, entry unchanged), with the outcome
  surfaced back to the graduate who filed it.
- **The graduate signup flow previews pending-credential claims before
  the account is finalized** ("N credentials found... will be claimed
  automatically" shown pre-confirmation) — worth an endpoint that can
  check pending-credential count by email *before* account creation
  completes, not just claim them silently afterward.
