# Frontend → Backend wiring gaps

Frontend UI is feature-complete and builds clean (`tsc --noEmit`, `next build`
both pass). These are the spots where the frontend now collects/sends data
the backend doesn't accept yet — flagged here instead of touched, since
frontend/backend integration is being left to the backend team.

## 1. Institution registration — `phone` + `website` — ✅ FIXED (2026-08-30)

**Frontend** (`features/institution/api/api.ts` → `applyInstitution`) sends
a multipart form with `name, ministry, email, password, phone, website,
documents[]` to `POST /api/institution/apply`.

**Backend** `InstitutionController.java:29` now reads `phone`/`website` as
optional `@RequestParam`, `InstitutionService.java:24` threads them through,
`Institution.java:65` persists them, and `V10__institution_profile.sql` adds
`phone`, `website`, `profile_image_url` columns. `PUT /api/institution/me`
with Supabase Storage for profile images is also implemented
(`SupabaseStorageServiceImpl.java`, `InstitutionServiceImpl.java:130`,
`application.properties` `supabase.*`). See gap 4 for storage details.

## 2. Graduate signup — `firstName` + `lastName` + `phone` — ✅ FIXED

**Frontend** (`features/graduate/api/api.ts` → `signup`) sends
`{ email, password, firstName, lastName, phone }` to `POST
/api/graduate/signup`.

**Backend** `GraduateServiceImpl.signup()` reads all five; names/phone are
KEK-envelope-encrypted at rest, email exact-matched via HMAC blind index.
`GraduateProfileResponse` decrypts on read. Nothing outstanding.

## 3. Graduate notification preferences — no endpoint at all

`app/(graduate)/graduate/settings/page.tsx` has three notification toggles
(Dispute updates / Share activity / New credential issued). There is no
`/api/graduate/preferences` (or similar) endpoint anywhere, and no
`notification_prefs`-shaped column on any entity. The toggles are session-only
React state — flagged in the UI with "Not saved yet — resets on refresh"
rather than silently pretending to persist.

**To close:** add a preferences table/column + `GET`/`PUT` endpoint, then
wire the settings page's toggles to it.

## 4. Institution profile image — Supabase Storage — ✅ IMPLEMENTED (2026-08-30)

**Frontend** `app/(institution)/institution/settings/page.tsx` now allows
uploading a profile image (jpeg/png/webp/gif, max 5MB) with preview and
fallback URL input. It calls `PUT /api/institution/me` via
`institution/api/api.ts:138` `updateMe` which sends `multipart/form-data`
(`profileImage` file) or `application/json` (`profileImageUrl`).

**Backend** `SupabaseStorageServiceImpl.java` uploads `profileImage` to
Supabase Storage via `POST /storage/v1/object/{bucket}/{institutionId}/{uuid}.ext`
using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (`application.properties`
`supabase.*`, `.env.example` docs). Returns public URL
`{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}` and persists to
`institution.profile_image_url` (`V10`). If `SUPABASE_*` not set, file uploads
return 400 with message and direct `profileImageUrl` can still be saved
(graceful degrade). `InstitutionServiceImpl.java:130` `updateOwnInstitution`
handles both `profileImage` and `profileImageUrl`, validates URL scheme and
length, logs `Institution profile updated`.

**Supabase setup:** create a public bucket (default `institution-profiles`) in
Supabase Dashboard > Storage, set `SUPABASE_URL=https://<project>.supabase.co`,
`SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > service_role, secret),
`SUPABASE_BUCKET=institution-profiles` in `.env` / env vars, restart backend.
Flyway `V10` adds columns automatically.

## Why these weren't fixed here

Per team split: frontend/backend integration work is being left to the
backend team. These fields are fully wired end-to-end on the frontend side
(real state, validation, requests) — they just need matching backend
acceptance + persistence.
