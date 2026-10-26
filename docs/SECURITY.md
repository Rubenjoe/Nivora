# Security

## Application ownership and database RLS

- Supabase Auth is the identity/session authority. `@supabase/ssr` is used in Route Handlers and a Next.js proxy. Private finance operations call `auth.getUser()` server-side before resolving a profile.
- Map the verified Supabase Auth user ID to an internal profile, then constrain every financial read/write to that profile. Never trust client-supplied profile/user IDs.
- Drizzle runtime queries use the privileged server connection from `DATABASE_URL`. RLS does **not** apply to the application's own Drizzle queries; it is not an application authorization boundary. Server-side authentication and explicit ownership-scoped queries are mandatory.
- `profiles`, `categories`, and `transactions` have Drizzle-defined RLS enabled with policies granted only to the `authenticated` role. The `anon` role has no matching policies. These policies protect access made under Supabase's authenticated database role, not privileged Drizzle queries.
- The profile policy binds `supabase_user_id` to `(select auth.uid())` for SELECT/INSERT/UPDATE/DELETE. UPDATE has both `USING` and `WITH CHECK`, so that identity value cannot be changed to another user ID. Category and transaction policies similarly require the row's profile to belong to `auth.uid()`; UPDATE validates both existing and resulting ownership.
- Policies do not use `user_metadata`, and no `SECURITY DEFINER` authorization functions are used.
- Parameterize database queries with Drizzle, validate inputs, return safe errors, and avoid sensitive logging/caching.
- Configure TLS for PostgreSQL connections with `DATABASE_SSL_CA` containing the complete Supabase CA PEM, or `DATABASE_SSL_CA_PATH` pointing to a local PEM file. The inline value takes precedence. The client always verifies the server certificate (`rejectUnauthorized: true`); certificate verification is never disabled. The certificate file must be kept out of Git (see `.gitignore`).
- Keep publishable Supabase configuration distinct from database credentials. Never expose a service-role/secret key in a `NEXT_PUBLIC_` variable or browser code.
- Bound pagination/exports and rate-limit sensitive/expensive endpoints.
- Prove cross-user reads/updates/deletes fail in automated tests. Do not weaken ownership tests.
- Add account export/deletion, backup/restore, CSRF/session, deployment-header, and operational reviews before production readiness.

## Auth implementation and verification status

Registration, login, logout, email confirmation callback, `/me`, cookie refresh, and finance identity verification are implemented with `@supabase/ssr`. The legacy `node-appwrite` dependency and Appwrite cookie helper have been removed. `getUser()` verifies the Auth user before resolving a profile, and only the verified Auth UUID is used as the profile identity; user metadata is used only for a display name. Migrations `0000`–`0002` are applied to the Supabase development project (`oxjnxvqarqrilzuetzai`), and their local hashes and journal timestamps match live Drizzle history. No hosted Auth or cross-user API test has been performed. Dashboard email confirmation, site URL, and redirect allowlist settings still need inspection/configuration.

When Supabase access is needed, use the available authorized Supabase connection with read-only checks by default. Do not modify the project through the dashboard SQL editor; schema changes go only through reviewed Drizzle migrations. Production migrations require explicit approval and a provider-supported backup.

## Runtime connection role and RLS decision

Drizzle runtime uses the privileged server connection from `DATABASE_URL`. RLS therefore does not apply to Drizzle queries and must not be represented as protecting the app's own queries. The username in the provisioned DSN determines its precise role; verify the role privileges and `BYPASSRLS` status before deployment.

Decision for the current Drizzle architecture: **do not rely on RLS as the enforcement boundary for Drizzle queries.** The application uses a privileged server-side `pg` connection and Drizzle; it does not automatically carry the caller's Supabase Auth JWT or populate `auth.uid()`. The actual provisioned role has not been independently inspected, but the application connection is designated privileged; RLS policies are defense-in-depth only for authenticated-role sessions outside that connection.

Verified server-side authentication plus explicit profile-scoped Drizzle queries are mandatory. Do not claim RLS protects financial data accessed through the app. Before production, verify the DSN role's privileges and `BYPASSRLS` status, then test the chosen isolation design against Supabase.

Live verification confirms `anon` has no table privileges on profiles/categories/transactions and `authenticated` has SELECT/INSERT/UPDATE/DELETE only. Migration `0001` applies grant hardening. The app's privileged Drizzle connection remains separate from authenticated-role policies and grants.

## Production readiness

No production deployment or database migration has been made. Do not run destructive production changes without explicit authorization. Obtain a provider-supported backup and document a restore test before an approved production migration.

The local PGlite suite now simulates the `authenticated` role to verify that one user cannot select, update, or delete another user's transactions under the migration RLS policies. This is a local policy regression test only; it does not verify hosted RLS behavior or the app's privileged Drizzle query isolation. The app's transaction routes were statically inspected for verified-profile filters, while live API checks remain pending valid database settings, two test users, and Auth Dashboard configuration.
