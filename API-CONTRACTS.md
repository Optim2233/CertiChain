# Frontend → Backend API contracts

Every request body the frontend sends is now defined as a zod schema and
validated client-side before the request fires (`.parse()` throws locally on
a malformed payload instead of letting bad data reach the network). This
doc is generated from those schemas — treat it as the source of truth for
what each endpoint receives on the wire.

Schema source files:
- `certichain-frontend/src/features/auth/api/schemas.ts`
- `certichain-frontend/src/features/graduate/api/schemas.ts`
- `certichain-frontend/src/features/institution/api/schemas.ts`
- `certichain-frontend/src/features/accreditation/api/schemas.ts`

`verifier` has no JSON-body write endpoints (file uploads only) — nothing to
document there.

> Encryption is response-transparent: PII is envelope-encrypted at rest (AES-256-GCM)
> and decrypted server-side before serving, so no contract changes — the frontend keeps
> reading plaintext. Covered: `credential_field.field_value` (per-institution DEK, V21/V22),
> user profile + emails (KEK-direct, HMAC blind index for exact-match lookup), institution
> PII + founders/admin JSON (institution DEK), dispute text, notification bodies, legacy
> PDF bytes. Env: `ENCRYPTION_KEK` (32 bytes) + `ENCRYPTION_HMAC_KEY` (≥32 bytes),
> one-time `BACKFILL_PII_ENCRYPTION=true` for pre-existing rows. Emailed links/logo use
> `EMAIL_PUBLIC_BASE_URL` (defaults to `FRONTEND_URL`).

---

## Auth (`/api/auth/*`)

### `POST /api/auth/login`
```
{ email: string (email format), password: string (min 1) }
```

### `POST /api/auth/signup`
```
{
  email: string (email format),
  password: string (min 8),
  role: "ACCREDITATION_AUTHORITY" | "INSTITUTION" | "GRADUATE",
  institutionId?: string (uuid)
}
```

### `POST /api/auth/password`
```
{ currentPassword: string (min 1), newPassword: string (min 8) }
```

---

## Graduate (`/api/graduate/*`)

### `POST /api/graduate/signup/check`
```
{ email: string (email format) }
```

### `POST /api/graduate/signup`  ✅ wired (persisted + encrypted)
```
{
  email: string (email format),
  password: string (min 8),
  firstName: string (min 1),
  lastName: string (min 1),
  phone: string (min 6)
}
```
**Backend status:** `GraduateServiceImpl.signup()` reads all five fields; names/phone are
KEK-envelope-encrypted at rest, email indexed via HMAC blind index.

### `POST /api/graduate/shares`
```
{
  name: string (min 1),
  scope: string (min 1),
  credentialId: string (uuid) | null,
  selectedFieldIds: string[] (uuids)
}
```

### `POST /api/graduate/credentials/{id}/flag`
```
{ reason: string (min 1) }
```

---

## Institution (`/api/institution/*`)

### `POST /api/institution/apply`  ✅ wired (split model since V18)
Non-file fields: `name`, `ministry` (legacy alias → `governingMinistry`), `email`,
`password`, `phone`, `website`, plus the split-model params — `institutionType`,
`institutionNameMm`, `institutionCategory`, address ×6, `governingMinistry`,
`yearEstablished`, establishment-doc ×4, business ×7, `foundersJson`,
`administratorJson`. Plus file parts (`establishmentDocFile`, `dicaCertificate`,
`taxClearance`, `micPermit`, `documents[]`).
**Backend status:** `InstitutionController.apply()` reads all of the above;
PII is institution-DEK-encrypted at rest (DEK minted at apply time).

### `POST /api/institution/credentials`
```
{ graduate_email: string (email format), fields: { name: string, value: string }[] }
```

### `POST /api/institution/activity-records`
```
{ graduate_email: string (email format), activity: string (min 1), date: string (ISO date) }
```

### `POST /api/institution/credentials/{id}/revoke`
```
{ reason: string (min 1) }
```

### `PUT /api/institution/credentials/{id}`
```
{ fields: { name: string, value: string }[] }
```

### `POST /api/institution/disputes/{id}/uphold`
```
{
  resolution_note: string (min 1),
  action: string (min 1),
  fields?: { name: string, value: string }[]
}
```

### `POST /api/institution/disputes/{id}/dismiss`
```
{ resolution_note: string (min 1) }
```

---

## Accreditation Authority (`/api/aa/*`)

### `POST /api/aa/institutions/{id}/request-info`
```
{ note: string (min 1) }
```

### `POST /api/aa/institutions/{id}/reject`
```
{ reason: string (min 1) }
```

### `POST /api/aa/institutions/{id}/suspend`
```
{ reason: string (min 1) }
```

### `POST /api/aa/institutions/{id}/revoke`
```
{ reason: string (min 1) }
```

### `POST /api/aa/institutions/{id}/approve`
### `POST /api/aa/institutions/{id}/reinstate`
No body.

---

## Open gaps (also tracked in `FRONTEND-BACKEND-GAPS.md`)

None — the two historical gaps above are closed. Remaining known item: graduate
notification preferences (frontend toggles are session-only; no endpoint yet —
see `FRONTEND-BACKEND-GAPS.md` gap 3).
