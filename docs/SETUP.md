# Setup

## Current status

The responsive Next.js shell, partial Appwrite Authentication API, and initial PostgreSQL/Drizzle foundation are implemented, but neither Appwrite nor PostgreSQL is configured or verified here. Finance API handlers are present, but dashboard transaction entry, history and summaries are not yet wired to them, so financial data does not currently persist in this workspace. Do not substitute another production database provider.

## Local development

1. Install Node.js 24 (or a supported current LTS) and npm.
2. From this directory run `npm install`.
3. Copy `.env.example` to `.env.local`; set `APP_URL`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, and a server-only `APPWRITE_API_KEY` from your provisioned Appwrite project.
4. In Appwrite, add the exact local web origin (typically `http://localhost:3000`) as a platform and enable email/password authentication.
5. For this registration/session flow, create a narrowly scoped API key with the privileges needed to create users and sessions (`users.write` and `sessions.write`). Never place it in a `NEXT_PUBLIC_` variable or share it.
6. Run `npm run dev` and open `http://localhost:3000`. Real sign-up/sign-in requests require the correctly provisioned Appwrite settings above.

The Appwrite SDK setup follows the current official SSR guidance: https://appwrite.io/docs/products/auth/server-side-rendering and its Next.js SSR tutorial. A new SDK client is created per request; the session secret is kept in an HTTP-only cookie. Google OAuth, recovery, verification, and protected financial pages are not implemented yet.

## PostgreSQL configuration (implemented foundation; live configuration required)

Provision Appwrite native PostgreSQL and obtain the actual credentials from its Console's Credentials → Drizzle/DSN tabs. The Drizzle guide documents TLS with `sslmode=require`; use the pooler port 6432 for runtime traffic and the direct engine port 5432 for Drizzle Kit migrations. Copy `.env.example` and set `DATABASE_URL` and `DIRECT_URL` to the actual URLs. Never invent hostnames or credentials. Local PostgreSQL is acceptable for development; tests use isolated in-memory PGlite and do not prove a live connection.

## Environment

`.env.example` contains names and safe placeholders only. `.env.local` is ignored by Git; keep all credentials server-side.

## Migrations, backup, and restore

Generate reviewed migrations with `npm run db:generate`; apply them with `npm run db:migrate` only after setting `DIRECT_URL` to the intended database. Verify migrations on a fresh disposable database. Before production changes, take a provider-supported backup and document a restore verification. Do not use destructive schema synchronization instead of reviewed migrations.
