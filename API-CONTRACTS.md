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

### `POST /api/graduate/signup`  ⚠️ gap
```
{
  email: string (email format),
  password: string (min 8),
  firstName: string (min 1),
  lastName: string (min 1),
  phone: string (min 6)
}
```
**Backend status:** `GraduateController.signup()` takes a loose
`Map<String,String> body` — confirm `GraduateServiceImpl` reads
`firstName`/`lastName`/`phone` out of it. If not, they're silently dropped.
Needs matching columns wherever graduate profile data lives.

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

### `POST /api/institution/apply`  ⚠️ gap — `multipart/form-data`
Non-file fields:
```
{
  name: string (min 1),
  ministry: string (min 1),
  email: string (email format),
  password: string (min 8),
  phone: string (min 6),
  website: string (url format)
}
```
Plus one or more `documents` file parts.

**Backend status:** `InstitutionController.apply()` only reads
`name, ministry, email, password, documents` via `@RequestParam`. `phone`
and `website` are silently dropped (Spring ignores unknown multipart
parts). Needs: `institutions` table columns, `Institution` entity fields,
`InstitutionService.apply(...)` signature update. See the doc comment on
`InstitutionService.apply()` — email/password were already a deliberate,
team-confirmed deviation from `02-institution.md`'s documented request body;
phone/website likely need the same treatment (confirm the doc should also
be updated).

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

1. Institution `phone` + `website` — sent, not accepted/persisted.
2. Graduate `firstName` + `lastName` + `phone` — sent, likely not
   read/persisted (confirm against `GraduateServiceImpl`).

Everything else above already round-trips correctly against the current
controllers as of this doc.
