# Task: Enforce de-accreditation on already-issued certificates

## The gap

`Trust_Registry_Accreditation_Authority.docx` (Section 4.2, Known Limitation) flags this
directly: *"the system reflects an institution's current accreditation status only; it
does not define how already-issued certificates should be treated if an institution is
de-accredited after issuance."*

It's worse than "undefined" in the code today — the verifier UI already **claims** this
check happens, but nothing enforces it:

- `certichain-frontend/src/app/(verifier)/verify/page.tsx:248` — the "How this was
  verified" panel on a successful result lists *"Issuing institution's accreditation is
  active"* as one of three checks performed.
- Same file, line 309 — the "certificate not found" page's help accordion lists *"The
  issuing institution is no longer accredited on CertiChain"* as a real possible reason
  for a failed check.

Neither is true yet. `VerifierServiceImpl.evaluate()` (backend) never looks at
`institution.getStatus()` when deciding `VERIFIED` vs not — it only checks credential
revocation and the Merkle root/signature. A certificate from a `SUSPENDED` or `REVOKED`
institution verifies exactly the same as one from an `APPROVED` institution today.

## What "done" looks like

A verifier checking a certificate whose issuing institution is currently `SUSPENDED` or
`REVOKED` gets a distinct result — not `VERIFIED`, and worded differently from a
`REVOKED` *credential* (which means the institution itself revoked that one certificate;
this is "the whole institution lost its accreditation," a different fact).

**Scope decision needed first (bring to Thura before writing code):** does this apply to
credentials issued *before* the institution was de-accredited (retroactive), or only
future verification attempts regardless of when the credential was issued? The doc's
"known limitation" wording suggests the second (any verification attempt, past or
present, checks *current* institution status) — that's also the simpler rule and the one
the frontend copy already implies ("is active" / "is no longer accredited" — present
tense, not "was active when issued"). Confirm this reading before implementing; it
avoids having to touch historical data at all.

## Backend

**File:** `certichain-backend/src/main/java/com/certichain/certichainbackend/common/enums/VerificationResult.java`

Add a new value:
```java
public enum VerificationResult {
    VERIFIED,
    REVOKED,
    ISSUER_NOT_ACCREDITED,  // new
    INVALID_NOT_FOUND
}
```

**File:** `certichain-backend/.../verifier/VerifierServiceImpl.java`, method `evaluate()`

Currently (lines ~167-194):
```java
private VerificationResponse evaluate(Credential credential, List<UUID> visibleFieldIds) {
    ...
    Institution institution = institutionRepository.findById(credential.getInstitutionId()).orElse(null);
    String institutionName = institution == null ? null : institution.getName();
    String institutionStatus = institution == null ? null : institution.getStatus().name();

    if (credential.getStatus() == CredentialStatus.REVOKED) {
        return respond(VerificationResult.REVOKED, ...);
    }

    // merkle root check
    ...
    return respond(VerificationResult.VERIFIED, ...);
}
```

Add an institution-status gate. Order matters — check in this sequence, same reasoning
as the existing comment about checking revocation before signature:
1. Credential revoked → `REVOKED` (unchanged, most specific fact)
2. Institution not `APPROVED` (i.e. `SUSPENDED` or `REVOKED`) → `ISSUER_NOT_ACCREDITED`
   (new)
3. Merkle root mismatch → `INVALID_NOT_FOUND` (unchanged)
4. Otherwise → `VERIFIED` (unchanged)

`institutionStatus` is already fetched and threaded into `respond()` — no new query
needed, just a new `if` using the `institution` variable already in scope.

Handle `institution == null` (shouldn't happen in practice, but the existing code
already guards for it) — treat as not-accredited rather than skip the check.

## Frontend

**File:** `certichain-frontend/src/features/verifier/types/types.ts`

Add `'ISSUER_NOT_ACCREDITED'` to the `VerificationResult` union (line 1).

**File:** `certichain-frontend/src/app/(verifier)/verify/page.tsx`

- `submit()`'s branch (`if (result) { ... }`) currently only distinguishes `VERIFIED` vs
  everything-else via `InvalidResult`. Add a third branch/state for
  `ISSUER_NOT_ACCREDITED`, or extend `InvalidResult` with a case alongside its existing
  `isRevoked` check (`const isRevoked = result.result === "REVOKED"` — same pattern,
  add `const issuerNotAccredited = result.result === "ISSUER_NOT_ACCREDITED"`).
- Copy: something like "This certificate's issuing institution is no longer accredited"
  — reuse `result.institutionName` and `result.institutionStatus` (both already on the
  response) so the message can say e.g. "University of X is currently suspended."
- The "How this was verified" panel's accreditation-active claim (line 248) becomes
  actually true once this ships — no change needed there, just stop being a lie.

**File:** `certichain-frontend/src/app/(verifier)/verify/bulk/page.tsx` and
`certichain-frontend/src/shared/components/status-badge.tsx`

Check whether bulk verify results and any shared status badge also render
`VerificationResult` values — if so, add a label/style for `ISSUER_NOT_ACCREDITED`
following the exact pattern already used for `REVOKED` in each (e.g.
`status-badge.tsx`'s `STATUS_MAP`).

## Out of scope (don't build this)

- Re-signing, deleting, or mutating already-issued credentials — this task only changes
  what verification *reports*, not the stored data.
- Notifying graduates whose institution was de-accredited — not asked for.
- Un-accrediting retroactively by issue date (see the scope decision above — default to
  "current status only," which is also the smaller change).

## Verification checklist

- Verify a certificate from an `APPROVED` institution → still `VERIFIED`, unchanged.
- Revoke a single credential (institution-side) but institution stays `APPROVED` →
  still `REVOKED`, unchanged (this is the existing per-credential path, not the new one).
- Suspend an institution (AA action, already-built flow), then verify one of its
  previously-issued, non-revoked credentials → new `ISSUER_NOT_ACCREDITED` result, not
  `VERIFIED`.
- Revoke an institution entirely → same check, same new result.
- Reinstate a suspended institution → verifying its credentials goes back to `VERIFIED`
  (falls out for free since the check reads live status, no extra work needed).
