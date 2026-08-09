# CertiChain — Project Context

This file is the authoritative context for Claude Code or any AI coding tool working on CertiChain.
Read this before making architectural decisions or generating code. If something
here conflicts with a stray comment, filename, or old doc in the repo, **this
file wins** unless the person working with you says otherwise.

## What this project is

CertiChain is a blockchain-inspired academic credential verification system,
scoped to Myanmar's higher education context. It's a university capstone
project (Java course), built by a team of six, over a 7-week timeline.

The core problem it solves: certificate fraud, and the fact that most existing
"digital verification" schemes check that a signature matches but never check
that the *issuer* is legitimate in the first place. CertiChain closes that gap
with three ideas working together:

1. **Cryptographic signing (PKI)** — every certificate/activity record is
   signed by its issuing institution, so tampering is detectable.
2. **Trust registry** — an Accreditation Authority approves/suspends/revokes
   institutions, so a valid signature from a non-accredited or de-accredited
   issuer doesn't mean a valid certificate. Point of trust is separated from
   point of signature.
3. **Selective disclosure** — graduates control exactly which fields of a
   credential get revealed to a given verifier, via per-field Merkle-tree
   signing, without invalidating the institution's original signature.

Secondary feature: **activity records** — a second, factual (non-evaluative)
credential type for things like club membership or leadership roles, reusing
the certificate signing/verification/revocation machinery.

## Stack

`CertiChain_Project_Proposal.docx` in this kit is the **current, corrected**
version (title: "Capstone Project Proposal") and its Section 6/7 now
correctly describe the real stack below — Spring Boot + Next.js + Neon. An
earlier draft of this proposal used J2EE/JSP/Servlet/Tomcat/MySQL/Eclipse
framing for course-submission purposes; that framing has been fully retired
and should not influence any code, structure, or terminology here. If you
ever encounter a stray reference to Tomcat, Servlets, JSP, DAO/JDBC classes,
or MySQL anywhere in this repo, treat it as leftover cruft from that earlier
draft, not a current requirement — flag it rather than build against it.

(There's a *separate*, unrelated JSP/Servlet coursework assignment the
student does in parallel for a different class — see "Not part of this
project" below. Keep it fully apart from CertiChain.)

## Authoritative tech stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot + Spring Security (JWT) + Spring Data JPA |
| Backend hosting | Render |
| Frontend | Next.js (single app, role-based routing — not 4 separate apps) |
| Frontend hosting | Vercel |
| Database | Neon (managed Postgres) |
| File storage | Binary data stored directly in Neon/Postgres — no separate file-storage service. Covers uploaded accreditation documents and batch-import spreadsheets. Chosen deliberately given the project's modest file-storage needs; don't introduce S3/GCS/etc. without discussing it first. |
| Crypto / PKI / Merkle | Java Cryptography Architecture (JCA), backend only |
| QR rendering | `qrcode` npm package, client-side |
| Build tool | Maven |
| IDE | IntelliJ IDEA Ultimate |

**Why Neon over Supabase:** Neon is the correct choice for larger/sustained
projects; Supabase is reserved for short-lived hackathon work. CertiChain is
the former.

## Confirmed architecture decisions

- **Single Next.js app, role-based routing.** Not four separate deployments
  for the four portals. A BFF layer is not justified at this scale.
- **All crypto/signing logic lives in Spring Boot only.** Never in the
  frontend. Private keys are never transmitted to or stored by a verifier.
- **Feature-based package structure** on the backend (not layer-based
  `controller/service/repo` packages at the top level — organize by feature
  first).
- **Single JWT with role claims.** One token type carries role info for all
  four roles (Accreditation Authority, Institution, Graduate); Verifier
  endpoints are open/no-login and don't need a token at all.
- **Synchronous batch issuance.** Batch certificate upload is processed
  synchronously with row-level validation and per-row error reporting — not
  an async job queue.
- **Graduate identity is institution-independent.** Graduates create their
  own accounts, unrelated to any institution. Credentials are issued to an
  email identifier. If no account exists yet for that email, the credential
  sits in a **pending/unclaimed** state until the graduate registers or logs
  in with a verified matching email, at which point it's automatically
  claimed. This is a state flag, not a separate architectural model — don't
  build a parallel "unclaimed credential" entity hierarchy.
- **Institution registration: provisional account, not invite-only.**
  Institutions self-register (submit org info + accreditation documents) and
  land in a gated/pending state immediately. The Accreditation Authority
  reviews the application afterward and approves, rejects, or requests more
  info. This mirrors standard marketplace vendor-onboarding convention
  (registration → verification → approval as sequential stages, self-signup
  as the default registration mode) rather than B2B "invite a teammate into
  an already-trusted org" patterns, which solve a different problem and don't
  fit here — there's no pre-existing list of legitimate Myanmar institutions
  to invite from; discovering and vetting legitimacy *is* the point of the
  registry.
  - Institution account states: `pending` → `approved` / `rejected`, and
    later `suspended` / `revoked` from the approved state. Rejected
    institutions may resubmit. The Accreditation Authority's review step has
    **four possible decisions**, not just approve/reject: **Approve**,
    **Request Info** (application stays pending, institution resubmits
    documents without starting over), **Suspend**, **Reject**.
  - **Suspend and Revoke are distinct actions, not one "deactivate"
    action.** Suspend is reversible — the institution can be reinstated,
    existing certificates stay valid, the institution just can't issue new
    ones until reinstated. Revoke is explicitly permanent — cannot be
    reversed by re-approval, existing certificates keep a valid signature
    but the institution shows as revoked to all verifiers going forward.
    Both require a reason, logged and shown to the institution — model
    these as two distinct transitions/actions in the backend, not two
    values of the same enum-triggered endpoint.
- **Public institution list: yes.** Graduates and Verifiers can browse a
  public, no-login directory of institutions. **Resolved (confirmed by
  Optim, 2026-08-09):** the directory lists `APPROVED` **and** `SUSPENDED`
  institutions, and hides `PENDING` / `REJECTED` / `REVOKED`. Suspended
  institutions are shown but visually distinguished as a warning (dimmed),
  not omitted — this matches the wireframe caption
  ("pending/rejected/revoked institutions are not listed here") and the
  dimmed `suspended` row in the same mockup.

## Roles (4 total)

1. **Accreditation Authority** — reviews institution applications; approves /
   suspends / revokes institutional accreditation; sees an audit log of
   registry-relevant events (institution approved/suspended, certificate
   revoked, etc).
2. **Institution / Registrar** — registers for accreditation; once approved,
   issues certificates and activity records (single or batch, via spreadsheet
   upload with row-level validation); can revoke credentials it issued
   (revocation requires a reason, which is logged and shown to the
   institution).
3. **Graduate** — independent account, not owned by any institution; views a
   wallet/chronological timeline of all held credentials across institutions;
   controls selective disclosure per share; creates/lists/edits/revokes named
   persistent shareable links (each with a QR code); can flag a credential as
   disputed without being able to hide or remove it unilaterally.
4. **Verifier** — no account required. Verifies by certificate ID, file
   upload, or opening a graduate's shared link. Sees one of: Verified /
   Revoked / Invalid-Not-Found, plus issuer name and current accreditation
   status. Multi-entry (timeline) shares show an independent verification
   result per entry.

## Core domain concepts (don't reinvent these)

- **Merkle-tree selective disclosure**: each credential field is hashed
  individually; hashes combine into a signed Merkle root. Revealing a subset
  of fields means providing those field values plus a Merkle proof path —
  the institution's original signature over the root stays valid regardless
  of which subset is disclosed.
- **Credential vs. link revocation are different things.** An institution
  revoking a *credential* is permanent and shown to all verifiers. A graduate
  revoking a *share link* just kills that specific access point — the
  underlying credential is untouched.
- **Pending/unclaimed credential state** exists purely to handle batch
  issuance timing when a graduate hasn't registered yet (see above).
- **Dispute flagging has two outcomes, both shown to the graduate:**
  **upheld** (institution corrects or revokes the flagged entry) or
  **dismissed** (institution disagrees, record stands as issued, no change).
  The flag itself doesn't change verifier-visible status while pending —
  only the outcome does.

## Known, deliberately out-of-scope items

These are named exclusions, not oversights — don't "fix" them unless asked:

- **De-accreditation retroactivity** — the system only reflects an
  institution's *current* accreditation status. It does not define special
  handling for certificates issued before a later de-accreditation.
- **Timeline-shape privacy leakage** — selective disclosure protects field
  *values*, but gaps in a shared timeline can themselves leak information.
  A summarized/aggregated timeline view that would mitigate this is
  acknowledged but not implemented.
- **Subjective/evaluative content** — no teacher remarks, ratings, or
  non-factual records. Only factual, event-based records are supported.
- **Production-grade key custody / HSM** — key management is functional and
  conceptually correct for an academic project, not production-hardened.

## Team & workflow context

- Team of six, 7-week timeline (original proposal timeline shown below for
  reference — actual sequencing may shift, confirm before assuming it's
  literal).
- The person you're working with (Optim) prefers decisions explained with
  tradeoffs, then left to them for the final call — don't unilaterally lock
  in an ambiguous design decision without flagging it.
- Reference proposal timeline (Week: focus) — useful for gauging feature
  priority order, not a literal schedule to enforce:
  1. Requirements, ER diagram, schema design, environment setup
  2. Core signing infrastructure, base entity/DAO layer
  3. Trust registry + AA workflow; single-certificate issuance
  4. Batch issuance, activity records, revocation flow
  5. Selective disclosure (Merkle), graduate wallet/timeline
  6. Named persistent shares + QR, verifier portal, dispute flagging
  7. Integration, multi-institution seed data (UIT + KMD), testing, polish

## Not part of this project

Optim has a **separate, parallel course assignment** using JSP/Servlet/
Eclipse/Tomcat/MySQL — unrelated coursework, approached in survival mode
(pass the course, nothing more). If a request clearly belongs to that
assignment rather than CertiChain, don't blend its patterns into this
codebase, and flag the mismatch if it's unclear which project a request is
for.

## Immediate next steps (as of this kit's writing)

1. **Database schema design** — the agreed next topic, not yet done. Needs to
   account for: institutions (with status lifecycle), graduates, credentials
   (certificates + activity records as related/shared types), the Merkle
   field-signing structure, shares (named, persistent, revocable), pending/
   unclaimed credential state, and audit log entries.
2. Project scaffolding (Spring Boot backend, Next.js frontend).
3. Core entity models.
4. Spring Security with JWT.
5. API endpoints, happy paths first.
6. Next.js frontend scaffolding.

## Files in this repo/context

- `CertiChain_Project_Proposal.docx` — capstone proposal, current version.
  Good source for requirements, scope, roles, rationale, *and* the tech
  stack — Section 6/7 now accurately describe Spring Boot + Next.js + Neon,
  no J2EE framing left in it.
- `wireframes-reference.md` — distilled from the original
  `CertiChain_Wireframes.html` (a bundler export too bloated with embedded
  binary font data to be useful as-is). Covers ~13-15 screens across all
  four portals, framed as a UI *starting point*, not a locked spec. Useful
  for screen flow and state handling (e.g. institution application →
  approved/rejected, suspended-institution blocked state, revocation
  confirmation with required reason, audit log table, graduate wallet with
  share creation, verifier result states including invalid/not-found).
