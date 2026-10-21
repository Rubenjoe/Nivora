# Security

## Implemented in the current slice

- Appwrite Node SDK use is isolated in `src/lib/appwrite/server.ts`, marked server-only. Each function creates a fresh SDK client; no shared mutable client instance is used between requests.
- Sign-up, sign-in, and logout handlers require a same-origin `Origin` matching configured `APP_URL`.
- Sign-up and sign-in payloads are validated with Zod, and request parsing failures are handled without returning stack traces.
- The Appwrite session secret is set only in an HTTP-only, same-site cookie with expiry from Appwrite; `Secure` is enabled in production.
- `/api/v1/auth/me` verifies the session with Appwrite server-side and returns only a small user subset.
- Finance endpoints verify the Appwrite session with `account.get()`, resolve the internal profile from the verified Appwrite user ID, and scope transaction/category/summary operations to that profile. Mutation endpoints also require the configured same-origin `Origin`.
- Database URL validation requires a PostgreSQL URL and, in production, `sslmode=require`. The runtime pool is bounded; migration credentials are separate.
- A composite database FK rejects a transaction that pairs one profile with another profile's category.

## Not yet implemented or verified

No live Appwrite project/credentials or Appwrite PostgreSQL connection are configured, so authentication and persistent finance routes have not been integration-tested against live services. The dashboard is not yet a protected, database-backed experience. Recovery, email verification, OAuth, login rate limiting, deployment-origin testing, and end-to-end authorization tests remain unfinished. Server-side ownership checks and a PGlite foreign-key isolation test exist; PostgreSQL RLS is not enabled, and full API cross-user read/update/delete integration tests remain outstanding.

The registration flow uses a privileged server API key to create a user and session. Provision only the minimum required scopes, keep the key server-side, rotate it if exposed, and test the exact Appwrite policy before use. Do not expose personal financial data or describe this app as production-secure until real-provider and authorization tests pass.

## Required design

- Appwrite is the identity/session authority; verify sessions server-side for every private page/API operation.
- Map verified identity to an internal profile; constrain every financial read/write to the authenticated profile.
- Parameterize database queries with Drizzle, validate inputs, return safe errors, and avoid sensitive logging/caching.
- Bound pagination/exports and rate-limit sensitive/expensive endpoints.
- Prove cross-user reads/updates/deletes fail in automated tests. Never trust client-supplied user IDs.
- Evaluate PostgreSQL RLS only with safe transaction-local identity context and verified pool behavior; otherwise enforce server-side ownership with isolation tests.
- Add account export/deletion, backup/restore, CSRF/session, deployment-header, and operational reviews before production readiness.

No production deployment has been made.
