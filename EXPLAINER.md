# CertiChain — How the Whole Thing Works

Start here. This is the narrative walkthrough; the other docs are references you
drop into once you know what you're looking for.

| Doc | Use it for |
|---|---|
| `ARCHITECTURE.md` | module layout, diagrams, tech stack |
| `SCHEMA.md` | every table, column by column |
| `API-CONTRACTS.md` | exact request/response shapes |
| `PRESENTATION_PREP.md` | likely examiner questions + answers |
| `AUDIT-GUIDE.md` | deep audit trail behaviour |
| `PONYTAIL-DEBT.md` | deliberate shortcuts still outstanding |

---

## 1. The problem, in one paragraph

A paper degree certificate is trivially forgeable and slow to verify — an employer
either trusts a PDF or emails a registrar and waits days. CertiChain replaces that
with a credential that is *cryptographically checkable in seconds by a stranger*,
while letting the graduate choose which parts of it the stranger gets to see.

Everything in the system follows from those two requirements: **verifiable by
someone who trusts nobody**, and **the graduate controls disclosure**.

---

## 2. The four roles

The whole product is a chain of trust with four links. Each portal is one link.

```
Accreditation Authority  →  accredits  →  Institution
                                              ↓ issues
                                          Credential  →  held by  →  Graduate
                                                                        ↓ shares
                                                                     Verifier
```

1. **Accreditation Authority** (`/authority`) — a ministry-level regulator. Approves,
   suspends, revokes institutions. Nobody can issue credentials without their approval.
   This is the root of trust: a verifier trusts a credential because they trust the AA
   that accredited the issuer.
2. **Institution** (`/institution`) — a university or training body. Issues credentials
   (singly or by CSV batch), revokes them, and answers disputes.
3. **Graduate** (`/graduate`) — owns the credentials issued to them. Creates *shares*
   (a link or QR code), choosing exactly which fields to disclose. Can dispute a
   credential they believe is wrong.
4. **Verifier** (`/verify`, `/share/[token]`) — an employer. **Unauthenticated.**
   Scans a QR or opens a link and gets an answer. This is the only portal with no
   login, which is the point: verification must not require an account.

---

## 3. The core idea: Merkle trees and selective disclosure

This is the part worth understanding properly — it's what makes the project more
than a database with a pretty UI.

**The naive approach** is to hash the whole credential and sign that hash. That
works for tamper-detection, but it's all-or-nothing: to prove your GPA is genuine,
you'd have to reveal your name, degree, dates and every other field, because the
verifier needs the entire record to recompute the hash.

**What CertiChain does instead** (`MerkleServiceImpl`): each field becomes its own
leaf hash. Leaves are paired and hashed upward (SHA-256, Bitcoin-style — an odd node
at a level is duplicated) until one **root** remains. Only that root gets signed.

```
        ROOT  ← this is what gets signed
       /    \
     H(AB)  H(CD)
     /  \    /  \
    A    B  C    D     ← A=name, B=degree, C=GPA, D=date
```

To prove leaf `C` (GPA) belongs to the signed credential, you reveal `C` plus the
*sibling hashes* on its path — `D` and `H(AB)`. That's enough to recompute the root.
It is **not** enough to learn what `A` or `B` said, because a hash doesn't run
backwards. Disclose one field, prove it's genuine, leak nothing else.

That's selective disclosure, and it's the same primitive Bitcoin light clients use
to verify a transaction without downloading the chain.

**The honest caveat**, and you should say it before an examiner does: the Merkle
work is real, but the *signature* over the root currently uses one shared
application-wide HMAC secret, not a per-institution keypair — `SigningServiceImpl`
says so in its own class comment. So today a signature proves "issued by this
backend", not "issued by this specific institution". The `Institution.publicKey` /
`privateKeyEnc` columns exist and are unpopulated — that's the upgrade path, and
it's a Tier-2 follow-up rather than a hidden bug.

---

## 4. Following one credential end to end

The clearest way to hold the system in your head is to trace a single credential.

**① Institution issues.** The registrar submits a credential (or a CSV row). The
backend splits it into fields, hashes each into a Merkle leaf, computes the root,
signs the root, and stores the credential plus its fields.

**② Fields get encrypted at rest.** Each field value is encrypted under the
*issuing institution's* DEK before it touches the database
(`CredentialFieldCryptoService`). The stored column is Base64 ciphertext plus an IV
— never plaintext. (Section 5 covers why.)

**③ Duplicate protection.** The Merkle root doubles as a content fingerprint. A
partial unique index (`uq_credential_institution_merkle_active`) stops the same
institution issuing an identical active credential twice — which is why re-running
the same demo batch reports conflicts rather than creating duplicates.

**④ Graduate claims it.** Credentials are issued to an email address, so they can
exist before the graduate has registered. On signup the email's HMAC blind index
links the existing credentials to the new account.

**⑤ Graduate shares.** They pick credentials and — per credential — which fields to
disclose. That produces a `share` row with a random token and a
`share_field_selection` row per disclosed field. The link is `/share/<token>`;
the QR code encodes the same URL.

**⑥ Verifier verifies.** They open the link with no account. The backend returns
only the selected fields, recomputes the root from the disclosed leaves plus the
proof path, checks the signature, checks the credential isn't revoked or expired,
and checks the *issuing institution is still accredited*. That last check is what
makes the AA layer matter: if the AA suspends a university, its already-issued
credentials stop verifying clean.

**⑦ Dispute, if it's wrong.** The graduate raises a dispute flag. The institution
upholds it (correcting or revoking) or dismisses it with a reason. Both paths are
written to the audit log.

---

## 5. Encryption: two layers, and why

Two distinct schemes, and the difference is the thing most worth understanding.

**Envelope encryption (institution-scoped data).** A single app-wide **KEK** (Key
Encryption Key) never encrypts real data. Instead, each institution gets its own
random **DEK** (Data Encryption Key). The DEK encrypts that institution's credential
fields and PII; the KEK encrypts only the DEK, stored wrapped in
`institution.dek_wrapped`. See `EnvelopeEncryptionService`.

Why bother with the extra hop:

- **Blast radius** — one leaked DEK exposes one institution, not the platform.
- **Rotation is cheap** — rotating the KEK re-wraps N small keys, not millions of rows.
- **Crypto-shredding** — delete an institution's wrapped DEK and their data is
  permanently unreadable, instantly, without touching a single row.
- **KMS-ready** — the KEK only ever touches 32-byte keys, so moving it into a real
  key manager later is a handful of calls, not a data migration.

**KEK-direct (user data).** User profile fields, `credential.graduateEmail` and
notification messages are encrypted *straight under the KEK*, because a user belongs
to no institution — there's no tenant to scope a DEK to (`PiiCryptoService`).

**Know this trade-off, because it's the sharpest question in the design:** that
means graduate data has *less* key isolation than institution data — one key covers
every user. The correct fix is a per-*user* DEK mirroring the institution columns;
the blocker is that credentials are issued to graduates who may not have accounts
yet, so `graduateEmail` has no user DEK to use at write time. Documented limitation,
not an oversight.

**Encrypted-but-searchable.** You can't `WHERE email = ?` against ciphertext. So
emails also store an **HMAC blind index** (`emailHmac`) — a keyed hash under a
separate key. Exact-match lookup works; the hash reveals nothing without the key.

---

## 6. Authentication

Stateless JWT in an **HttpOnly cookie** — no server-side session store, one token
type for all four roles.

- Login returns the user payload *and* sets the cookie, so the frontend routes
  immediately without a follow-up `/me` call.
- `JwtAuthenticationFilter` runs per request, populating the security context. An
  invalid token doesn't 401 outright — it just leaves the request unauthenticated,
  and `SecurityConfig` decides per route. That's what keeps the public verify
  endpoints open even when a stale cookie is present.
- The frontend's `proxy.ts` only checks the cookie *exists* — it can't decode an
  HttpOnly cookie. It's a navigation guard, not the security boundary. **Real
  authorization is entirely backend-side.** Worth saying explicitly if asked
  "what stops me editing the JS to reach the authority portal?" — nothing, and
  nothing needs to; the API rejects you.
- Login failures return one uniform error whether the email or the password was
  wrong, so the response can't be used to enumerate accounts.

---

## 7. How the code is laid out

**Backend** (`certichain-backend`, Spring Boot 4 / Java 21) — packaged by *feature*,
not by layer. One package per role, so `institution/` holds its controller, service
and DTOs together:

```
accreditation/  auth/  briefing/  graduate/  institution/  notification/  verifier/
common/    entity, repository, and the shared crypto + merkle + signing services
config/    security, cache, and related wiring
support/   one-off backfills (legacy data migrations)
```

Shared machinery lives in `common/service/impl/` — that's where Merkle, signing and
both crypto services sit. If you only read four files, read those.

**Frontend** (`certichain-frontend`, Next.js 16 / React 19 / Tailwind 4) — App Router
with route groups per portal under `src/app/[locale]/`:

```
(auth)/  (authority)/  (institution)/  (graduate)/  (verifier)/  share/[token]/
```

`[locale]` is `next-intl` — the whole UI is bilingual English/Myanmar. The API is
**same-origin**: the frontend calls `/api/*` on its own origin and `next.config`
rewrites to the backend. That's deliberate, because it's what lets the HttpOnly
cookie and the `proxy.ts` gate work without cross-origin complications.

**Data**: PostgreSQL (Neon) with Flyway migrations (26 of them), Redis for caching,
Supabase Storage for uploaded documents (envelope-encrypted before upload).

---

## 8. What this is honestly *not*

Being precise here is worth more marks than overclaiming, and every item is already
acknowledged in the code's own comments.

It's **blockchain-inspired**, not a blockchain. Specifically missing:

1. **Per-institution signing keys** — one shared HMAC secret today (§3).
2. **A hash-chained ledger** — `audit_log_entry` is a flat, mutable table. No entry
   references the previous entry's hash, so someone with DB write access could edit
   history undetectably. It's a *useful audit log*, not a tamper-evident one.
3. **Distributed consensus** — one Postgres, one backend. Nothing independent has to
   agree before a fact is final. This is the part that actually earns the word
   "blockchain".

What it *does* legitimately have is the cryptographic verification primitive —
Merkle-proof selective disclosure — which is real, correctly implemented, and the
genuinely interesting part of the system.

---

## 9. Where to look next

- Understand verification → `common/service/impl/MerkleServiceImpl.java`, then `verifier/`
- Understand encryption → `EnvelopeEncryptionServiceImpl` → `CredentialFieldCryptoService` → `PiiCryptoService`
- Understand issuance → `institution/InstitutionServiceImpl.java` (the largest service; batch issuance lives here)
- Understand the data → `SCHEMA.md`
- Prepare to defend it → `PRESENTATION_PREP.md`
