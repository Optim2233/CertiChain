# Frontend → Backend wiring gaps

Frontend UI is feature-complete and builds clean (`tsc --noEmit`, `next build`
both pass). These are the spots where the frontend now collects/sends data
the backend doesn't accept yet — flagged here instead of touched, since
frontend/backend integration is being left to the backend team.

## 1. Institution registration — `phone` + `website`

**Frontend** (`features/institution/api/api.ts` → `applyInstitution`) sends
a multipart form with `name, ministry, email, password, phone, website,
documents[]` to `POST /api/institution/apply`.

**Backend** (`InstitutionController.java:26-32`) only reads
`name, ministry, email, password, documents` via `@RequestParam`. The extra
`phone`/`website` multipart parts are silently dropped by Spring (no error).

`InstitutionService.apply()` and the `Institution` entity also have no
`phone`/`website` fields — this needs a migration + entity field + service
signature change, not just a controller tweak. Note the doc comment on
`InstitutionService.apply()` (institution/InstitutionService.java:14-22)
about email/password already being an intentional deviation from
`02-institution.md`'s documented request body — same treatment likely needed
for phone/website (confirm the doc should be updated too).

**To close:** add `phone`/`website` columns to `institutions` table, add
fields to `Institution` entity, thread through
`InstitutionService.apply(...)` and `InstitutionController.apply(...)`.

## 2. Graduate signup — `firstName` + `lastName` + `phone`

**Frontend** (`features/graduate/api/api.ts` → `signup`) sends
`{ email, password, firstName, lastName, phone }` to `POST
/api/graduate/signup`.

**Backend** (`GraduateController.java:27-28`) takes a loose
`Map<String, String> body` and (need to confirm in `GraduateServiceImpl`)
likely only reads `email`/`password` out of it — same silent-drop behavior,
no error, no persistence.

**To close:** check what `GraduateService.signup()` currently pulls from the
map; add `firstName`/`lastName`/`phone` columns wherever graduate profile
data lives, and read them out.

## 3. Graduate notification preferences — no endpoint at all

`app/(graduate)/graduate/settings/page.tsx` has three notification toggles
(Dispute updates / Share activity / New credential issued). There is no
`/api/graduate/preferences` (or similar) endpoint anywhere, and no
`notification_prefs`-shaped column on any entity. The toggles are session-only
React state — flagged in the UI with "Not saved yet — resets on refresh"
rather than silently pretending to persist.

**To close:** add a preferences table/column + `GET`/`PUT` endpoint, then
wire the settings page's toggles to it.

## Why these weren't fixed here

Per team split: frontend/backend integration work is being left to the
backend team. These fields are fully wired end-to-end on the frontend side
(real state, validation, requests) — they just need matching backend
acceptance + persistence.
