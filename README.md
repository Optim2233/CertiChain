# CertiChain

Credential verification platform with an Accreditation Authority, Institution, Graduate, and Verifier portal (see [context_kit/wireframes-reference.md](context_kit/wireframes-reference.md)).

- `certichain-backend/` — Spring Boot 4 (Java 21), REST API + PostgreSQL
- `certichain-frontend/` — Next.js 16 (React 19), TypeScript, Tailwind CSS 4

## Prerequisites

- JDK 21
- Node.js 20+
- PostgreSQL running locally (or update `DATABASE_URL` to point elsewhere)
- VS Code with the **Extension Pack for Java** + **Spring Boot Extension Pack** (backend), and the built-in TypeScript/ESLint support (frontend) — both are picked up automatically when you open each folder

## Backend setup

```bash
cd certichain-backend
cp .env.example .env   # edit if your DB creds differ
./mvnw spring-boot:run # or mvnw.cmd on Windows cmd.exe
```

Runs on `http://localhost:8080`. `.env` is gitignored — never commit real credentials.

## Frontend setup

```bash
cd certichain-frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Opening in VS Code

This is a two-project repo (Maven + npm), not a single workspace root. Two options:

- **Simplest:** open `certichain-backend/` and `certichain-frontend/` as separate VS Code windows.
- **One window:** open the repo root and use a multi-root workspace (`File > Add Folder to Workspace` for both subfolders) so the Java and TS/ESLint extensions each scope correctly to their project.

## Auth workflow

Stateless JWT carried in an HttpOnly cookie — no server-side session store, single token type for all four roles.

**Login/signup** (`AuthController.login`/`.signup` → `AuthService`, `certichain-backend/.../auth/`):
1. `POST /api/auth/login` with `{email, password}`. `AuthService.authenticate` looks up the user by email and checks the password hash in one step, throwing the same `ValidationException("Invalid email or password")` whether the email doesn't exist or the password is wrong — deliberately uniform to avoid leaking which one failed.
2. On success, `JwtService.issue` signs a JWT (HMAC, 12h expiry) with claims `sub=userId`, `email`, `role`, and `institutionId` (omitted for graduates).
3. The token is set as an HttpOnly, non-`Secure` (dev only — flip before deploying past local), `Path=/` cookie named `jwt`.
4. The response body also returns the full user payload (`UserResponse`) directly, so the frontend doesn't need a follow-up `/api/auth/me` round trip before it knows where to route.
5. `signup` does the same, auto-logging the new user in with the same cookie-issuing step.

**Per-request auth** (`JwtAuthenticationFilter`, runs once per request ahead of the controllers):
1. Reads the `jwt` cookie first; falls back to an `Authorization: Bearer <token>` header for backwards compatibility.
2. Parses/verifies the token via `JwtService.parse`. On success, populates `SecurityContextHolder` with a `UsernamePasswordAuthenticationToken` (principal = userId, authority = `ROLE_<role>`).
3. On a missing/invalid/expired token, it clears the context and lets the request continue unauthenticated — `SecurityConfig` then permits or rejects it per route (public endpoints like verify/institutions stay open even with a garbage token; protected routes 401/403 downstream).

**Frontend** (`certichain-frontend/src/features/auth/`):
1. `useLogin`/`useSignup` (`hooks/useAuth.ts`) call `authService.login`/`.signup` (`api/api.ts`), which hit the backend with `withCredentials: true` so the `Set-Cookie` response is honored.
2. On success, the returned user is written into `useAuthStore` (Zustand, `store/authStore.ts` — just `{user, isAuthenticated}`) and the router pushes to a role home: `ACCREDITATION_AUTHORITY → /authority`, `INSTITUTION → /institution`, `GRADUATE → /graduate`.
3. `useMe` re-hydrates the store from `GET /api/auth/me` on load when `isAuthenticated` is false (e.g. after a hard refresh) — the cookie itself is HttpOnly and unreadable from JS, so this is the only way the client learns who's logged in without a fresh login.
4. `useLogout` calls `POST /api/auth/logout` (clears the cookie server-side by re-setting it with `maxAge=0`), clears the store, and routes to `/`.

**Route gating** (`certichain-frontend/src/proxy.ts`, Next's middleware): runs before any page render, checking only for the *presence* of the `jwt` cookie (can't decode an HttpOnly cookie server-side without re-verifying it, so this is a coarse gate, not the source of truth):
- No cookie + visiting `/authority`, `/institution`, or `/graduate` → redirect to `/login?redirect=<path>`.
- Cookie present + visiting `/login` or `/register` → redirect to `/`.
- Actual role-based authorization is enforced by the backend (`SecurityConfig` route rules + `ROLE_*` authorities), not by this proxy — it only prevents obviously-wrong navigation.

## More context

- [context_kit/CLAUDE.md](context_kit/CLAUDE.md) — project background, tech stack, architecture decisions
- [context_kit/wireframes-reference.md](context_kit/wireframes-reference.md) — portal flows and UI reference
