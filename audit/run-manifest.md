# Audit run manifest

Everything the live workflow audit created. Names deliberately blend with the existing seed data
(per instruction), so nothing here looks out of place in the registry. All passwords are
`Certi@2026`, matching `SEED-CREDENTIALS.md`.

**Run id:** `0913-0226` (2026-09-13)
**Database:** Neon dev branch `ep-frosty-mouse-azpw9v1c` (shared, pre-seeded)

## Pre-existing seeded rows mutated

**None.** The only state transition performed on any institution was `approve` on
`7c8db078-…` (Thanlyin Technological College), which this run created. No seeded
institution, graduate, or credential was approved, rejected, suspended, revoked, or edited.
Seeded accounts were used read-only: `aa@certichain.local`, `registrar@uit.edu.mm`.

## Institutions created (9)

| Name | ID | State | Origin |
|---|---|---|---|
| Thanlyin Technological College | `7c8db078-4317-490f-b707-4c7f6d534945` | APPROVED | manual apply → AA approve → login |
| Thanlyin Technological College | `9315e1ab-07dc-47a3-9f0e-f89c957caff0` | PENDING | e2e submit test |
| Thanlyin Technological College | `8b243108-d7a5-4886-ab31-dc70bce57427` | PENDING | e2e submit test |
| Thanlyin Technological College | `d6ae2cd7-ff6a-48e5-91e4-afef4cba59d2` | PENDING | e2e submit test |
| Thanlyin Technological College | `981789dc-e4f8-4089-b14c-0d61f0f561cb` | PENDING | e2e submit test |
| Thanlyin Technological College | `8da924e5-729a-4a0f-ae0d-7c31c1b971b6` | PENDING | e2e submit test |
| Thanlyin Technological College | `db0ef1aa-df92-41c1-b0c7-56476a8fd208` | PENDING | e2e submit test |
| Thanlyin Technological College | `0ce9601f-2f80-4c10-b7b0-a7e2883918dd` | PENDING | e2e submit test |
| Encoding Probe College | `b3f381a6-e226-478c-986c-d15f67292dae` | PENDING | Burmese UTF-8 round-trip probe |

The approved one logs in as `registrar.0913-0226@ttc.edu.mm`. The e2e rows use
`registrar.<random>@ttc-e2e.edu.mm`; each suite run adds one more (the submit test posts a real
application by design — that is what proves the wizard works end to end).

Validation-gate probes (the 400-expecting cases in `audit/api-audit.sh`) created **nothing**.

## Graduates created

Roughly a dozen, all `firstname.lastname.<random>@gmail.com` in Myanmar-plausible name style
(`thiri.aung.*`, `su.myat.*`, `thet.su.*`, `hla.hla.*`, `nandar.win.*`, `aye.chan.*`,
`myat.thu.*`, `khin.moe.*`). Each was created to test one path: claim-on-signup, the
`/api/auth/signup` claim gap (finding #1), share + selective disclosure, or dispute flow.
Each suite run adds ~6 more. Every one is a GRADUATE-role user with 1–2 credentials from
`University of Information Technology, Yangon` or the Thanlyin row above.

## Credentials created

~15, issued from `registrar@uit.edu.mm` or `registrar.0913-0226@ttc.edu.mm` to the graduates
above. Titles are plausible programmes (`BE Civil Engineering`, `MSc Marine Biology`,
`BSc Physics`, `BA History …`). Several carry a random `ref` field so the duplicate-issuance
guard does not block re-runs. One dispute was raised and dismissed against a credential this
run created.

## Cleanup

Everything blends with seed data and is safe to leave. To remove, delete by the identifiers above:

```sql
-- institutions created by this audit (+ their users, by email pattern)
DELETE FROM institutions WHERE id IN ('7c8db078-4317-490f-b707-4c7f6d534945', ...);
DELETE FROM users WHERE email_hmac IN (SELECT ...); -- emails are encrypted; match via email_hmac
```

Note graduate and institution emails are stored encrypted with an `email_hmac` lookup column, so
delete by `email_hmac` computed from the address, not by a `LIKE` on `email`.

To stop new rows accumulating on each suite run, the submit test in
`certichain-frontend/e2e/institution-register.spec.ts` is the only test that posts a real
application; skip it (`test.skip`) when running the suite purely as a regression check.
