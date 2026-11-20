# Presentation Prep — Likely Teacher Questions

Grounded in the actual codebase, not generic blockchain trivia. Organized as:
technical implementation questions (can they break your specific system) and
academic/rigor questions (do you understand the theory underneath what you built).

---

## 1. "Is this actually blockchain, or just 'blockchain-inspired'?"

**Answer:** It's blockchain-anchored now — the three formerly-missing pieces are closed:
1. **Real per-institution signing keys.** RSA-2048 per institution, minted at AA
   approval (`InstitutionSigningKeyService`); the private key is DEK-encrypted at
   rest. A credential's signature proves "issued by this specific institution," not
   "issued by this backend."
2. **A hash-chained, append-only ledger.** Every credential event
   (issued/amended/revoked/restored) appends a signed entry (`ledger_entry`) whose
   hash covers the previous entry's hash. Editing any historical row breaks every
   hash after it — detectable at `GET /api/verify/ledger`.
3. **Independent confirmation.** The current chain head is periodically anchored on
   Ethereum Sepolia as a zero-value transaction carrying the head hash
   (`LedgerAnchorService`), with the Etherscan link surfaced on the verify page.
   Even a fully compromised backend cannot undetectably rewrite history, because the
   witness lives on a chain it doesn't control.

**The honest caveat — name it before they do:** this is the *anchoring* model, not a
mining/consensus network. No independent nodes run *this* system; Ethereum is the
external witness. Anchoring runs on a 1-minute cycle, so the window between an event
and its on-chain proof is brief — the verify page says "recorded on the
ledger" during that window and shows the anchor link once it closes. That's the same
architecture BlockCerts uses, and stating it precisely reads as judgment, not as a
gap.

**Follow-up they might ask: "So why is the Merkle tree the right primitive anyway?"**
Because the verification model borrows blockchain's core idea — a Merkle tree per
credential lets a verifier check that specific disclosed fields are genuinely part of
a larger signed record without seeing the whole record (selective disclosure), and
recomputing the root detects tampering. That's the same cryptographic primitive
blockchains use for light-client verification (see: Bitcoin SPV proofs) — now with
the per-institution signatures and on-chain anchor behind it.

---

## 2. Merkle tree — academic rigor questions

**"Walk me through what happens when I verify a credential."**
Each field (name, degree, GPA, etc.) is hashed into a leaf. Leaves are paired and
hashed up to a single root (SHA-256, Bitcoin-style: an odd node at any level is
duplicated rather than left unpaired). That root, plus the institution ID, is what
gets signed. A verifier who's only shown *some* fields (selective disclosure) gets
those fields plus a Merkle proof path — the sibling hashes needed to recompute the
root from just the disclosed leaves. If the recomputed root matches the signed root,
every disclosed field is provably part of the original signed set, without revealing
the undisclosed fields at all.

**"Why not just hash the whole record and sign that?"**
Because then you couldn't selectively disclose. If GPA is hashed together with
everything else into one blob hash, you can't prove "this GPA belongs to a
legitimately-issued credential" without revealing every other field too. Merkle trees
let you prove membership of a subset without revealing the rest — that's the whole
value proposition over "just hash and sign."

**"What's the actual security property here — collision resistance? preimage
resistance?"**
Both matter. Preimage resistance stops someone from forging a fake field that hashes
to a leaf already in the tree. Collision resistance stops someone from finding two
different field values with the same hash (so they could swap a disclosed field
without changing the root). SHA-256 gives us both at 128-bit security level.

**"Could someone forge a Merkle proof without the institution's key?"**
No — the proof alone only proves internal consistency (these leaves hash up to this
root). It says nothing about whether the *root itself* is legitimate. That's what the
signature is for: the signature over the root is the actual trust anchor. An attacker
could build a self-consistent fake tree all day; they can't produce a valid signature
over its root without the institution's private key — which is exactly why the
per-institution keypair design matters: leaking one institution's key compromises
that institution only, not every other issuer.

---

## 3. Encryption — technical + academic

**"What encryption do you use and why AES-GCM specifically over, say, AES-CBC?"**
AES-256-GCM: authenticated encryption (AEAD). CBC only gives confidentiality — it
doesn't detect tampering on its own (you'd need to bolt on a separate MAC, and doing
that wrong is a classic vulnerability, see: padding oracle attacks). GCM gives you
confidentiality and integrity in one primitive: a 128-bit auth tag that fails decryption
outright if even one bit of ciphertext was altered.

**"How do you handle the IV/nonce — is it random or a counter?"**
Fresh `SecureRandom` 12-byte IV generated on every single encryption call, never
reused, never derived from anything predictable. This matters because GCM has a
catastrophic failure mode: if you ever reuse an IV with the same key, an attacker can
recover the XOR of two plaintexts and, worse, forge valid ciphertexts. Random 12-byte
IVs make an accidental collision astronomically unlikely (birthday bound ~2^48
encryptions before you'd worry).

**"What's your key management architecture?"**
Envelope encryption, two-tier: one root Key Encryption Key (KEK) held in an env var,
and one Data Encryption Key (DEK) minted per institution, wrapped by the KEK, and
stored alongside the institution row (as ciphertext — the wrapped DEK is useless
without the KEK). This is the standard pattern (same shape as AWS KMS envelope
encryption): you never re-encrypt all your data to rotate a key, you just re-wrap the
DEKs under a new KEK.

**"Isn't your KEK in an env var a single point of failure?"**
Yes, and that's the one honestly-documented gap in the system — a real production
deployment would source the KEK from a KMS/HSM (hardware-backed, access-audited, never
directly readable even by the app). We chose env var as a deliberate scoping decision
given the project timeline, not an oversight — it's flagged in the code itself as an
interim tradeoff. **Good answer to have ready**: "I know the difference between this
and production-grade key management, and I know what the upgrade path looks like."
That's a stronger answer than pretending it's already ideal.

**"Why per-institution DEKs instead of one global key for everything?"**
Blast radius. If one DEK is ever compromised, only that institution's data is exposed
— not every institution's. It also means we could in theory let an institution
"forget" its data by destroying its DEK (crypto-shredding), though we haven't built
that as a feature.

**"How do you know your GCM implementation is actually correct and not just
'looks right'?"**
We verified this directly, not just by reading the code: ran the full crypto test
suite (27 test classes, 0 failures) *and* independently confirmed by inspection that
(a) a tampered ciphertext or wrong key throws `AEADBadTagException` rather than
silently returning garbage or partial plaintext — i.e. it fails closed — and (b) IV
generation actually calls `SecureRandom` per-call rather than being cached or
predictable.

---

## 4. Data protection / privacy — likely non-CS-adjacent but common

**"What happens to a graduate's data if they want it deleted?"**
Be honest here if this isn't built — it's a reasonable gap to admit, not something to
fake. If asked, the honest answer is: crypto-shredding (destroying the DEK) is
architecturally possible given the per-institution-DEK design, but no explicit
"delete my data" flow currently exists.

**"Is email/PII really protected, or just 'in theory'?"**
Real answer: encrypted PII fields are useless as plaintext to anyone with only
database access (backup leak, SQL injection, insider with read-only DB access) — they
still need the KEK. The one exception you should be upfront about: fields must
sometimes be decrypted server-side for legitimate use (e.g. sending an email
notification) — that plaintext lives briefly in memory/in the outgoing email, which is
expected and unavoidable, not a flaw.

---

## 5. System design questions likely to come up

**"Why Postgres and not a NoSQL / graph DB given the relational complexity of
credentials/institutions/disputes?"**
The data model is fundamentally relational (institutions have many credentials,
credentials have many disputes, foreign keys everywhere) — Postgres's ACID guarantees
matter here (you don't want a partial write leaving a credential issued but its Merkle
proof half-written). Neon specifically gives serverless scaling and branch-based dev
workflows without giving up relational guarantees.

**"What happens under concurrent access — e.g. two AA reviewers approving the same
institution at once?"**
Optimistic locking via `@Version` on Institution, Credential, DisputeFlag, and Share —
a stale write gets rejected rather than silently overwriting a concurrent change.

**"How would this scale to millions of credentials?"**
Honest answer, don't oversell: current analytics queries load all of an institution's
credentials into memory for aggregation (explicitly commented as a `ponytail` tradeoff
— fine for <10k credentials, would need a real GROUP BY/streaming aggregation query
at higher scale). This is a good one to preempt yourself rather than get caught by.

---

## Delivery advice

- When a remaining gap comes up (KEK-in-env-var, anchoring being periodic rather than
  per-event, no multi-node consensus), **name it before they do** and immediately
  state the fix and why it wasn't in scope. That reads as engineering judgment, not
  as something you missed.
- If asked something you genuinely don't know, say "I'd need to check the exact
  implementation, but conceptually the answer should be X because Y" — reasoning from
  principle is what's actually being graded, not memorized facts.
- Be precise about what "blockchain" means here: per-institution signatures, a
  hash-chained append-only ledger, and periodic Ethereum anchors as an independent
  witness. If a teacher asks "is this a blockchain in the consensus sense," the
  correct answer is "no — it's a blockchain-*anchored* system, and here's exactly
  why that's the right design for credential verification" — precision reads as
  understanding, not as a concession.
