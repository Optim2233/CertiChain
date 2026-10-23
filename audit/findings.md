# CertiChain live workflow audit — findings

**Run:** 2026-09-13, run id `0913-0226`
**Stack:** backend `:8081` (Spring Boot, Neon dev branch `ep-frosty-mouse-azpw9v1c`), frontend `:3000` (Next 16 dev), Redis `:6379`
**Method:** every journey driven live at API level, then in a real browser (Chromium via Playwright)
**Result:** 37/37 Playwright tests green (twice consecutively); 208 backend + 37 frontend unit tests green

> **STATUS: all four findings fixed and verified live.** See "Fixes applied" at the end.
> Regression tests were inverted to assert the corrected behaviour, so they now fail if
> any of these regress.

Journeys audited: public verifier; institution apply → AA review → approve → login; institution issuance;
graduate signup/claim → share → public verify → dispute; institution dispute resolution; auth boundaries.
Both `en` and `my` locales were checked on the registration wizard and verifier.

---

## Findings

### 1. HIGH — Graduate registration never claims pending credentials — **FIXED**

A graduate whose credentials were issued before they signed up ends up with an **empty wallet**.

- The graduate registration page calls **`/api/auth/signup`**
  ([api.ts:15](../certichain-frontend/src/features/auth/api/api.ts#L15), used by
  [register/graduate/page.tsx:44](../certichain-frontend/src/app/[locale]/(auth)/register/graduate/page.tsx#L44)).
- The claim-on-signup logic exists **only** in `GraduateServiceImpl.signup`
  ([GraduateServiceImpl.java:98-107](../certichain-backend/src/main/java/com/certichain/certichainbackend/graduate/GraduateServiceImpl.java#L98-L107)),
  which backs `/api/graduate/signup` — a different endpoint.
- `AuthService.signup` ([AuthService.java:53](../certichain-backend/src/main/java/com/certichain/certichainbackend/auth/AuthService.java#L53))
  creates the user and never sets `graduateUserId` or flips `PENDING_CLAIM` → `ISSUED`.

Measured live, same payload, two endpoints:

| Endpoint | `pendingCredentialCount` after signup | `/api/graduate/timeline` |
|---|---|---|
| `/api/auth/signup` (**what the UI calls**) | **1 — still unclaimed** | **0 items** |
| `/api/graduate/signup` | 0 — claimed | 1 item |

Repro: issue a credential to an unregistered address, confirm `POST /api/graduate/signup/check`
returns `{"pendingCredentialCount":1}`, sign up via `/api/auth/signup` with `role: GRADUATE`, then
re-check — still 1, and the timeline is empty.

Aggravating detail: `signup/check` **does** report the pending count, so the UI promises credentials
on the step before signup and then delivers none.

Locked in by `e2e/graduate.spec.ts` → *"signup via /api/auth/signup does NOT claim pending credentials"*.

**Fix direction:** either point the graduate page at `/api/graduate/signup` (it takes
firstName/lastName/phone, which the form already collects, but sets no cookie — the page already
redirects to `/login`, so that is compatible), or move the claim loop into `AuthService.signup`
for `role == GRADUATE`. The second is the smaller diff and fixes every caller at once.

---

### 2. MEDIUM — Email delivery is broken and fails silently — **FIXED**

```
jakarta.mail.MessagingException: Got bad greeting from SMTP host: smtp.gmail.com, port: 587, response: [EOF]
```

Dispatch is `@Async`, so **the API returns 200 while nothing is sent**. `POST /api/auth/forgot-password`
reports success to the user with no email ever arriving. Password reset is therefore unusable, and
nobody upstream can tell.

Compounding it: **`FRONTEND_URL` in `certichain-backend/.env` is a stale LAN IP**
(`http://10.59.232.55:3000`). That value is baked into reset and share links, so even once SMTP is
fixed the links point at an unreachable host. This audit ran with `FRONTEND_URL=http://localhost:3000`
overriding it.

**Fix direction:** repair SMTP credentials (or switch to the already-configured `RESEND_API_KEY`),
set `FRONTEND_URL` per environment, and surface send failures — at minimum a WARN with the recipient,
ideally a retry/dead-letter path so a failed reset is observable.

---

### 3. MEDIUM — Expired sessions strand the user on a broken page — **FIXED**

With a **stale or invalid `jwt` cookie**, the user sits on a dashboard where every request fails and
nothing redirects them to login.

- `src/proxy.ts` gates pages on the cookie's **presence only**, so the page is served (verified: `200`).
- The API rejects the token with **`403` and an empty body** (verified).
- The session-expiry interceptor redirects on **`401` only**
  ([axioconfig.ts:23](../certichain-frontend/src/shared/config/axioconfig.ts#L23),
  [axioconfig.ts:45](../certichain-frontend/src/shared/config/axioconfig.ts#L45)).

Root cause: `SecurityConfig` registers no `authenticationEntryPoint`, so Spring Security's default
yields 403 rather than 401 for *unauthenticated* requests. Unauthenticated and unauthorized are
consequently indistinguishable — `/api/institution/me`, `/api/aa/institutions`, and
`/api/graduate/profile` all return 403 anonymously.

Repro in `e2e/auth.spec.ts` → *"a stale jwt cookie leaves the user stranded on a protected page"*.

**Fix direction:** add an `authenticationEntryPoint` returning 401 for missing/invalid credentials,
keeping 403 for authenticated-but-forbidden. The frontend interceptor then works as designed. (Check
`handleFetch401` callers before shipping — some deliberately tolerate 403 on multipart paths.)

---

### 4. LOW — Pasting a mixed-character NRC serial silently drops digits — **FIXED**

In `NrcField`, the serial input carries `maxLength={6}` **and** a digit filter
([NrcField.tsx:44](../certichain-frontend/src/features/institution/components/NrcField.tsx#L44)).
The browser truncates to 6 raw characters *before* the filter strips letters, so pasting
`12ab3456` yields `1234` instead of `123456`. Typing digits is unaffected; only paste of mixed
content loses data, and it does so without feedback.

Mine, from the preceding registration-form work. **Fix:** drop `maxLength` and let the handler own
the cap (`v.replace(/\D/g,'').slice(0,6)`), which already does the right thing.

Current behavior is pinned in `e2e/institution-register.spec.ts` so a fix will flag the assertion.

---

## Verified working

These were live-tested and behave correctly — several are worth knowing are solid:

- **Selective disclosure holds.** A share scoped to `title` disclosed only `title`; the undisclosed
  `gpa` (`3.88`) and `thesis` values appear nowhere in the public payload. This is the most
  privacy-critical guarantee in the product.
- **Share revocation** works and is idempotent; verification flips to `SHARE_REVOKED` immediately.
- **The Myanmar validation gate** (added in the preceding task) rejects all 8 malformed-input classes
  live: `+95` phone with leading zero, too-short phone, 4-digit and non-numeric postal codes,
  unknown state/region, malformed founder NRC, out-of-range NRC region, malformed administrator NRC.
- **The rewritten registration wizard works end-to-end in a browser.** Region → district → township
  cascades and resets children; NRC township codes filter by region (region 12 offers `BaHaNa`/`AhLaNa`,
  not Magway's `MaBaNa`); the passport toggle swaps inputs and validates; phone canonicalizes on blur.
  A full submit stored the phone as **`+959781234567`** — the canonical form — confirming the format
  change landed.
- **Institution apply → AA review → approve → login** completes, including the Supabase
  encrypt → store → decrypt round-trip: the AA downloads a readable `%PDF-1.4` document.
- **Duplicate-issuance guard** rejects an identical credential with a clear message.
- **Dispute lifecycle**: graduate flags (`OPEN`), issuer sees and dismisses it.
- **Burmese (`/my/*`) renders with real translations** — no raw i18n keys on the wizard or verifier,
  and Burmese text round-trips correctly through apply (`တက္ကသိုလ်` returned intact).
- **Zero browser console errors** across every page exercised.
- Cross-role access refused (institution cookie → `/api/aa/*` = 403); logout clears the cookie;
  unauthenticated page requests redirect to `/login?redirect=…`.
- **Rate limiting works** on login, public verification, and password reset — each returns a clear
  4xx with a message rather than a 5xx.
- **Reset links now carry the correct origin** (`http://localhost:3000/reset-password?token=…` in the
  backend log) once `FRONTEND_URL` is set properly, confirming the finding #2 diagnosis.

## Deliberately not bugs (checked and dismissed)

- `/api/verify/stats` says 24 institutions while `/api/verify/institutions` returns 26 — stats counts
  `APPROVED` only ([VerifierServiceImpl.java:332](../certichain-backend/src/main/java/com/certichain/certichainbackend/verifier/VerifierServiceImpl.java#L332));
  the registry deliberately includes SUSPENDED so the public can see status. Consistent by design.
- An unknown credential or share token returns `200` with `result: INVALID_NOT_FOUND`, not 404 —
  correct: verification succeeded, the verdict is "not found".
- `/en/verify` 307-redirects to `/verify` — `localePrefix: 'as-needed'`
  ([routing.ts](../certichain-frontend/src/i18n/routing.ts)) leaves the default locale unprefixed.
- `GET /api/aa/institutions/{id}/documents` returns `[]` for Supabase-stored files; that endpoint
  lists only legacy inline-BYTEA rows. The file is reachable via `.../documents/url/{kind}` (verified).
- Burmese arriving as `?????` was **my** Git Bash/curl mangling UTF-8, not data loss — proven by
  sending the same string as proper UTF-8 multipart, which round-tripped intact.

## Caveats on this run

- A **stale `jwt` cookie is not the same as an expired one.** Both are rejected by `JwtService`, so
  finding #3 holds for genuine expiry, but a naturally-aged 12h token was not waited out.
- **Not audited:** batch CSV issuance (`/institution/batch`), analytics, bulk verify with a real CSV
  upload, `/institution/resubmit` (needs a REJECTED institution; none was driven to that state to
  avoid mutating seeded rows), and AA suspend/reinstate/revoke transitions.
- The `npm run build` failure on a Google Fonts fetch for Manrope was **transient network**, not a
  code defect. It reproduced with all local changes stashed, and later resolved on its own once
  `fonts.gstatic.com` became reachable. Worth knowing: `next/font/google` fetches at build time and
  caches into `.next`, so **deleting `.next` while offline takes the whole dev server down with
  500s on every route** (`layout.tsx` cannot resolve the font). If that happens, restart the dev
  server once connectivity is back. Consider vendoring the fonts via `next/font/local` if offline
  builds need to be reliable.
- **Two rate limiters shape the suite**, both working correctly as product safeguards:
  `AuthRateLimitFilter` (~10 logins/min/IP) and `VerifyRateLimitFilter`
  ([MAX_REQUESTS = 30](../certichain-backend/src/main/java/com/certichain/certichainbackend/verifier/VerifyRateLimitFilter.java#L27)
  per IP window). A whole-suite run exceeds both from a single IP, so every login and every public
  `/api/verify/*` call sends a randomized `X-Forwarded-For` (`verifyHeaders()` in `e2e/_helpers.ts`),
  mirroring what `scripts/seed/seed-credentials.sh` already does. `workers: 1` for the same reason.
  Heavy parallelism without those headers will produce spurious failures.
- Password reset is **also rate-limited per account** ("Too many reset requests"), so reset tests use
  a fresh address per run. The reset endpoint correctly returns the same neutral
  "If that email exists, a reset link was sent" for both known and unknown addresses — no account
  enumeration.

---

## Fixes applied

All four were fixed and re-verified against the running stack.

### 1. Claim-on-signup moved into the shared path

`AuthService.signup` is now `@Transactional` and claims `PENDING_CLAIM` credentials for
`role == GRADUATE`, so every signup path behaves identically instead of only
`/api/graduate/signup`. Chose this over repointing the frontend because it is the smaller
diff and fixes every current and future caller at once.

Verified live through the endpoint the UI actually calls:

| | before | after |
|---|---|---|
| `pendingCredentialCount` after `/api/auth/signup` | 1 (unclaimed) | **0** |
| `/api/graduate/timeline` | 0 items | **1 item** |
| public verification | — | **VERIFIED** |

Guarded by 4 new unit tests in `AuthServiceTest` (claims for graduates; no-op when nothing
pending; never claims for INSTITUTION/AA roles; normalizes a mixed-case email before
lookup) plus the inverted e2e test.

### 2. Email failures are now loud and monitorable

- Send failures log at **ERROR** with a running tally instead of a per-message WARN:
  `Email delivery FAILED to <to> (N failures so far, M delivered): <cause>`.
- New `EmailHealthIndicator` drives `/actuator/health` to **DOWN** once any send has failed,
  so uptime monitoring catches a dead pipeline. Verified by pointing SMTP at a dead host:
  the API still returned 200 (by design — sends stay async) while health flipped to DOWN.
- Health **details stay hidden**: `/actuator/health` is `permitAll`, so itemising components
  there would publish DB/Redis internals anonymously. The aggregate status is the public
  signal; the per-message cause is in the log.
- `FRONTEND_URL` corrected from the stale LAN IP to `http://localhost:3000`; reset links now
  carry a reachable origin.

Note: SMTP recovered on its own during this session (the same transient connectivity that
broke the Google Fonts fetch), so delivery currently succeeds. The fix is about making a
future outage visible rather than silent.

### 3. Unauthenticated now answers 401, forbidden stays 403

Added an `authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))` to
`SecurityConfig`. Verified live: anonymous and stale-cookie requests to
`/api/institution/me`, `/api/aa/institutions`, `/api/graduate/profile` and `/api/auth/me`
all return **401**, while an authenticated institution hitting `/api/aa/*` still returns
**403**. The frontend session-expiry interceptor now fires, so an expired session redirects
to login instead of stranding the user.

Five web tests asserted the old 403 for *anonymous* requests; those assertions encoded the
bug and were updated. Their wrong-role assertions were left at 403 on purpose, and a new
e2e test pins the 401/403 split so it cannot silently collapse again.

### 4. NRC serial keeps pasted digits

Dropped `maxLength={6}` from the serial input; the change handler already caps at six
digits after stripping non-digits. Pasting `12ab3456` now yields `123456` instead of `1234`.

## Verification of the fixes

- `./mvnw -o test` → **208/208** (204 before, +4 new claim tests)
- `npx playwright test` → **37/37**, run twice consecutively
- `npx vitest run` → **37/37**; `npx tsc --noEmit` clean
- Each fix additionally exercised by hand against the live stack, as described above
