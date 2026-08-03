# CertiChain Wireframes — Reference

Distilled from `CertiChain_Wireframes.html` (the original file is a bundler
export with heavy embedded font/binary data — this is the useful content
extracted into plain text). Treat these as a **starting point for screen
flow and state handling**, not a locked spec. ~13-15 screens across four
portals.

## Turn 1 — Accreditation Authority

**Screen: Apply for accreditation (institution-facing, pre-accreditation)**
- Fields: institution name / ministry, upload accreditation documents (PDF)
- Submitted applications enter the Accreditation Authority's review queue
- CTA: "Submit for Review"

**Outcome states (fork after AA review):**
- **Approved**: "✓ Accreditation approved" — "You can now issue certificates
  & activity records"
- **Rejected**: "✕ Application rejected" — shows a specific reason (e.g.
  "gov_registration.pdf could not be verified"), institution may resubmit

**Blocked state — suspended institution tries to issue:**
- "Accreditation suspended" — "You can't issue new certificates until
  reinstated by the Accreditation Authority." + contact info
- Reachable if a previously-approved institution is later suspended and
  tries to access issuance screens

**Revocation confirmation (AA revoking an institution):**
- Warning text: existing certificates keep their signature, but the
  institution shows as revoked to all verifiers going forward
- Reason field is **required**, shown to the institution, and logged
- Two-button confirm: Cancel / "Revoke Permanently"

**Audit log screen:**
- Table columns: When | Event | Actor
- Example rows: "Institution approved", "Institution suspended — reason
  logged", "Certificate revoked — reason logged", "Certificate verified
  (view-only, no personal data shown) — anonymous verifier"
- Reachable from any registry row, not just mid-review

## Turn 2 — Institution Portal

**Dashboard — issued credentials:**
- Sidebar nav: Dashboard / Issue New / Activity Records / Settings
- Main area lists issued credentials

**Batch issuance:**
- Row-level validation with per-row error state (e.g. "2 valid, 1 error —
  fix or skip")
- CTA: "Issue Valid Rows" — valid rows proceed even if some rows have errors

**Issue activity record (second credential type):**
- Fields: graduate email, activity/role (e.g. "Club President"), date
- Explicit note: "Factual, event-based only — no ratings or remarks."

## Turn 3 — Graduate Portal

**Wallet — timeline of credentials:**
- Sidebar nav: Timeline / Shares / Settings
- Each credential row shows title + issuing institution + status tag
  (`issued` / `revoked`)
- Revoked credentials shown with reduced opacity but still visible, not
  hidden
- CTA: "+ Create Share" per credential

**Selective disclosure — choose fields:**
- Reached from "+ Create Share" on a specific credential
- Graduate selects which individual fields to include in that share

## Turn 4 — Verifier Portal

**Landing — verify entry points:**
- Single-action landing, no account required
- Three entry methods: enter certificate ID / upload file / open shared link

**Single-credential result — Verified:**
- "✓ Verified" tag, credential title, "Issued to: [name]"
- Detail box: issuer name, issuer accreditation status (e.g. "approved"),
  issue date
- Note: "Only fields the graduate chose to share are shown"
- Collapsible: "▾ show issuer accreditation & signature details"

**Multi-entry (timeline) result:**
- Shows multiple credential entries for one shared timeline link
- Each entry gets its **own independent verification result** (e.g. one
  entry "✓ Verified", displayed per-row)

**Invalid / not found state:**
- "✕ Invalid / Not Found" — "No matching certificate, or content doesn't
  match its signature"

## Notes for implementation

- Status tags used consistently across portals: `issued`, `revoked`,
  `approved`, `suspended`, `rejected`, `Verified`, `Invalid/Not Found` — a
  shared status/tag component makes sense on the frontend.
- Revocation flows (both institution-level and credential-level) share the
  same UX pattern: required reason, logged, shown to the affected party,
  irreversible confirmation step.
- The audit log's "anonymous verifier" entry confirms verifier actions are
  logged without capturing personal data — worth carrying into the schema
  as an audit_log table that doesn't require a verifier identity.
