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

## More context

- [context_kit/CLAUDE.md](context_kit/CLAUDE.md) — project background, tech stack, architecture decisions
- [context_kit/wireframes-reference.md](context_kit/wireframes-reference.md) — portal flows and UI reference
