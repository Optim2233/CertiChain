# CertiChain — Project Context

This file is the authoritative context for Claude Code or any AI coding tool working on CertiChain.
Read this before making architectural decisions or generating code. If something
here conflicts with a stray comment, filename, or old doc in the repo, **this
file wins** unless the person working with you says otherwise.

## What this project is

CertiChain is a blockchain-anchored academic credential verification system —
per-institution RSA signing, a hash-chained append-only event ledger, and periodic
Ethereum Sepolia anchors as an independent witness — scoped to Myanmar's higher
education context. It's a university capstone
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

# Global rules

- Do Not Add Co-Authored Message.

## Git Commit Rules

Prefix commit messages with one of:
1. **feat** - for new features added
2. **fix** - for fixing or editing existing files
3. **refactor** - for refactoring the codebase such as folder structure
4. **docs** - for documentation changes (README.md and swagger docs)
5. **test** - for adding or editing test cases
6. **chore** - for other changes that don't modify src or test files (dependencies, build scripts, etc.)
7. **style** - for changing and fixing the layout css

List the features/fixes included in the commit message body as `-` bullet points, e.g.:

```
feat: add terms and CEO pages

- add /terms page
- correct footer link
```

## Coding Rules

- Write Human Style with clean code and nice format. 
- TypeScript/JavaScript strict — no `any` unless truly unavoidable
- No comments unless the user explicitly asks
- No emojis in code or output
- No new dependencies unless the user explicitly approves
- Follow existing patterns — check neighboring files before writing new code
- Concise output — short answers, no preamble, no "Here is..." prefixes
- Security first — never log or commit secrets, API keys, or tokens
- Verify before push — run lint/typecheck if available
- Search first — use grep/glob to understand existing code before writing
- Read before edit — always read the file before editing
- Edit existing files — never create new files unless required
- Match style — mimic the codebase's conventions, imports, and patterns

## Folder Structure

Adapt to the project's actual conventions. Common patterns by project type:

### Flat Structure (by type)

```
project/
├── src/
│   ├── components/        # All UI components
│   ├── hooks/             # All custom hooks
│   ├── services/          # All API/service calls
│   ├── store/             # All state management
│   ├── types/             # All type definitions
│   ├── utils/             # All utility functions
│   ├── lib/               # Shared libraries
│   ├── config/            # App configuration, env
│   ├── pages/             # Route-level components
│   ├── styles/            # Global styles
│   └── index.ts
├── public/
├── prisma/
├── scripts/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

**Backend (flat):**

```
server/
├── src/
│   ├── controllers/       # All route handlers
│   ├── services/          # All business logic
│   ├── routes/            # All route definitions
│   ├── middlewares/       # Auth, rate limit, errors
│   ├── models/            # DB models/schemas
│   ├── utils/             # Utilities
│   ├── lib/               # DB, Redis, LLM clients
│   ├── types/             # Shared types
│   ├── tools/             # External tool integrations
│   └── index.ts
├── prisma/schema/
└── docker-compose.yml
```

### React.js (Feature-based)

```
src/
├── features/                    # All feature modules live here
│   └── feature-name/            # Each feature is a self-contained domain
│       ├── components/          # UI components specific to this feature (navbar, footer, etc.)
│       ├── hooks/                # Custom hooks specific to this feature for tanstack
│       ├── store/                # Zustand state management for this feature
│       ├── api/                  # API calls and external integrations
│       ├── types/                # TypeScript types/interfaces for this feature
│       └── index.ts              # Barrel export - public API of the feature
│
├── shared/                      # Code shared across multiple features
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives (buttons, inputs, dialogs)
│   │   └── layout/               # Layout wrappers (sidebar, header, main layout)
│   ├── hooks/                    # Shared custom hooks (useMobile, useDebounce)
│   ├── lib/                      # Utility functions, helpers, API configurations
│   ├── types/                    # Global TypeScript types used across features
│   └── config/                   # App-wide config (services, providers, env)
│
├── pages/                       # Route-level components (thin wrappers only)
├── App.tsx                      # Root component, route definitions
├── main.tsx                     # Entry point, mounts React app
└── index.css                    # Global styles, Tailwind imports
```

### Next.js (App Router — Feature-based)

```
project/
├── app/                              # Next.js App Router
│   ├── (routes)/                     # Route groups (optional)
│   │   └── feature-name/
│   │       ├── page.tsx              # Page component (renders UI)
│   │       ├── layout.tsx            # Layout wrapper (shared UI for route)
│   │       ├── loading.tsx           # Loading UI (suspense fallback)
│   │       ├── error.tsx             # Error boundary (error UI)
│   │       └── not-found.tsx         # 404 page
│   ├── api/                          # API routes (ask before writing backend in Next.js)
│   │   └── feature-name/
│   │       └── route.ts              # GET, POST, PUT, DELETE handlers
│   ├── layout.tsx                    # Root layout (html, body, providers)
│   ├── page.tsx                      # Home page (/)
│   ├── globals.css                   # Global styles, Tailwind imports
│   └── not-found.tsx                 # Global 404 page
│
├── src/
│   ├── features/                     # Feature modules
│   │   └── feature-name/
│   │       ├── components/           # Feature UI components
│   │       ├── hooks/                # Feature custom hooks for tanstack
│   │       ├── services/             # Data fetching, API calls
│   │       ├── store/                # Client state (Zustand)
│   │       ├── types/                # Feature TypeScript types
│   │       ├── utils/                # Feature helper functions
│   │       └── index.ts              # Barrel export
│   │
│   ├── shared/                       # Cross-feature shared
│   │   ├── components/               # Shared UI (shadcn, etc.)
│   │   ├── hooks/                    # Shared hooks
│   │   ├── lib/                      # Utilities, helpers
│   │   ├── types/                    # Shared types
│   │   └── config/                   # App config
│   │
│   └── middleware.ts                 # Auth, redirects, request middleware
│
├── public/                           # Static assets (images, icons)
├── prisma/                           # Database schema (ask before writing backend in Next.js)
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── .env.example                      # Environment variables template
└── package.json                      # Dependencies, scripts
```

### Next.js Rules

- Server Components by default — add `'use client'` only when needed (interactivity, hooks, browser APIs)
- Server Actions for mutations — put in `actions/` within the feature
- Data fetching in Server Components — use `fetch` or server-side libs directly
- API Routes for external-facing endpoints — prefer Server Actions for internal mutations
- Route Groups `(name)` for layout organization — no URL impact
- Loading/error states — use `loading.tsx` and `error.tsx` per route segment
- Middleware for auth/redirects — runs on every request, keep fast
- Colocation — keep files related to a route in the same folder (page, layout, loading, error)

### Node.js + Express Backend (API Server — Feature-based)

```
server/
├── src/
│   ├── modules/                   # Feature modules
│   │   └── feature-name/
│   │       ├── feature.controller.ts
│   │       ├── feature.service.ts
│   │       ├── feature.route.ts
│   │       ├── feature.validation.ts
│   │       ├── feature.types.ts
│   │       └── feature.test.ts
│   ├── shared/                    # Cross-cutting concerns
│   │   ├── middlewares/           # Auth, rate limit, errors
│   │   ├── lib/                   # DB, Redis, LLM clients
│   │   ├── types/                 # Shared types
│   │   └── utils/                 # Utilities
│   ├── tools/                     # External tool integrations
│   ├── uploads/                   # File handling
│   └── index.ts
├── prisma/
│   └── schema/                    # Split by domain
└── docker-compose.yml
```

### Desktop App (Electron + React — Feature-based)

```
app/
├── src/
│   ├── features/                  # Feature modules
│   │   └── feature-name/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── store/
│   │       └── types/
│   ├── shared/                    # Shared across features
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── config/
│   ├── pages/                     # Route components (thin wrappers)
│   └── index.ts
├── electron/
│   ├── Agent/                     # Agent orchestration
│   ├── Ipc/                       # IPC handlers
│   ├── tools/                     # Tool implementations
│   ├── preload.ts
│   └── main.ts
└── vite.config.ts
```

### Feature Rules

- Each feature is self-contained — no importing from other features' internals
- Public API via index.ts — only expose what other features need
- Shared = truly shared — used by 2+ features, not just one
- Pages are thin — just layout + feature composition, no business logic
- Types live with their feature — unless used across multiple features

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Feature folder | kebab-case | `user-profile/` |
| Components | PascalCase | `UserCard.tsx` |
| Hooks | `use` prefix | `useAuth.ts` |
| Stores | `*store.ts` | `authstore.ts` |
| Services | `*service.ts` | `serviceauth.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase interfaces | `UserProfile` |
| Barrel export | `index.ts` | `export { useAuth } from "./hooks/useAuth"` |

### PHP (Backend/Frontend split)

```
project/
├── backend/                 # Isolated backend logic
│   ├── config/               # DB connections
│   ├── controllers/          # Request handling
│   ├── models/               # Database models
│   └── index.php             # API entry point (e.g. localhost/<foldername>/backend/)
└── frontend/                 # Isolated frontend UI
    ├── css/
    ├── js/                    # Calls the backend via Fetch/Axios
    └── index.html             # Pure HTML file (no PHP allowed here)
```

- `backend/` and `frontend/` are fully isolated — frontend never `require`s PHP directly, only calls `backend/` over HTTP (Fetch/Axios)
- `backend/controllers/` handle requests and return JSON; `backend/models/` own all DB queries
- `backend/config/` holds DB connection + app config (git-ignored or template)
- `frontend/index.html` and other frontend files are pure HTML/CSS/JS — no PHP allowed in `frontend/`
- Never commit `backend/config/` credentials — git-ignore them

### PHP (Feature-based)

```
my-php-app/
├── config/                  # Global settings
│   └── db.php               # Database connection
├── public/                  # Web server root
│   ├── assets/               # Global static files
│   │   ├── css/               # Global styles (reset, variables)
│   │   └── js/                # Global scripts (api client, utilities)
│   └── index.php             # App entry point / router
├── src/                     # Core application logic grouped by feature
│   └── <FeatureName>/        # One folder per feature — name and set of features are project-specific
│       ├── <Feature>Controller.php
│       ├── <Feature>Model.php
│       ├── <feature>-template.php
│       └── <feature>.css     # Feature-specific style (optional)
└── templates/                # Global layout pieces
    ├── header.php
    └── footer.php
```

- Features under `src/` are whatever the project actually needs (auth, products, cart, bookings, etc.) — this is not a fixed list, each feature is self-contained: controller + model + templates + feature-specific styles live together
- `public/` is the only web-server-exposed folder; `public/index.php` routes into `src/`
- `config/` holds DB connection and global settings, never exposed publicly
- `templates/` holds only truly global layout pieces (header/footer), not feature-specific markup
- Never commit `config/db.php` credentials — git-ignore them

## When Stuck

- Check the project README or docs
- Search for similar patterns in the codebase
- Ask the user for clarification rather than guessing
