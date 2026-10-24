# Database

## Target and ownership model

Supabase PostgreSQL is the authoritative financial store. Supabase Auth supplies the verified user identity. The server resolves that identity to one internal `profiles` row; every private record carries a profile foreign key. Every read/write query must be constrained by the authenticated profile, including nested resources, analytics, exports, and background work. Client-provided IDs are never proof of identity or authorization.

## Current schema versus target identity

The Supabase development project (`oxjnxvqarqrilzuetzai`) has migrations `0000`, `0001`, and `0002` applied and verified live:

- `profiles`: UUID, `supabase_user_id` UUID NOT NULL UNIQUE FK to `auth.users(id)` ON DELETE RESTRICT, display name, currency, timezone, interface mode, date format, appearance, budget and goal alerts, timestamps
- `categories`: profile-owned, kind, stable icon ID, created_at
- `transactions`: profile owner, direction (income/expense), positive `numeric(19,4)` amount, ISO currency, category FK, date, optional merchant/description, timestamps
- `budgets`, `savings_goals`, `goal_contributions`, `recurring_schedules`, and `recurring_occurrences`: created by migration `0002`; local APIs and feature pages are implemented, hosted flows remain unverified.

The new `0002` profile columns and tables were confirmed through read-only live schema queries after application. Their policies and grants were not separately audited during that verification.

## Applied migrations

- `0000_rare_wither.sql` — applied and verified live against `drizzle/0000_rare_wither.sql` and `src/lib/db/schema.ts`. The live Drizzle history row matches the local SQL hash and journal timestamp. `profiles.supabase_user_id` UUID NOT NULL UNIQUE FK to `auth.users(id)` ON DELETE RESTRICT; RLS enabled on all 3 tables; 12 authenticated-only policies with USING/WITH CHECK on UPDATE.
- `0001_0001_grants_hardening.sql` — applied live (via Supabase migration tool). Grants: anon none; authenticated SELECT/INSERT/UPDATE/DELETE only on profiles/categories/transactions; service_role unchanged. The live Drizzle history row matches the local SQL hash and journal timestamp.
- `0002_black_gamma_corps.sql` — applied to development only after explicit user approval. Live verification confirmed `profiles.date_format`, `appearance`, `budget_alerts_enabled`, and `goal_alerts_enabled`, plus all five feature tables. The Supabase migration tool recorded `nivora_0002_black_gamma_corps`; the corresponding Drizzle history row (local SHA-256 and journal timestamp) was added separately because the Supabase tool does not write Drizzle's ledger.

## Identity-column discrepancy

- `drizzle/0000_rare_wither.sql`: `supabase_user_id` appears as a UUID NOT NULL UNIQUE FK to `auth.users(id)` ON DELETE RESTRICT (line 17); `appwrite_user_id` does not appear.
- `src/lib/db/schema.ts`: `supabaseUserId` maps to `supabase_user_id` (line 29); `appwriteUserId` does not appear.
- `src/lib/db/isolation.test.ts`: `supabase_user_id` appears in profile-insert statements; `appwrite_user_id` does not appear.

The focused ownership test passes against the regenerated migration. Do not weaken the test.

## Integrity and calculations

Money uses PostgreSQL `numeric`; TypeScript totals and category breakdowns use Decimal. Queries are restricted to the profile currency; no cross-currency conversion is implemented. The composite `(profile_id, category_id)` foreign key prevents attaching another profile's category. Date filters take ISO dates; timezone-specific month boundaries are not yet wired into the dashboard.

Refund semantics, split representation, and budget uniqueness constraints must be finalized in the relevant milestone and covered by tests before shipping.

## Migration workflow

Use Drizzle Kit versioned, reviewed migrations (`npm run db:generate`, `npm run db:migrate`) only after the target database is confirmed and the Drizzle history baseline is in place. Never edit schema through the Supabase dashboard SQL editor; schema changes go only through reviewed Drizzle migration workflow files. Do not run `npm run db:migrate` until `drizzle.__drizzle_migrations` has baseline rows for all applied migrations. Production migrations require explicit approval and a provider-supported backup.

### Default privileges checklist

Supabase defaults grant ALL privileges on new tables in the `public` schema to `anon` and `authenticated` (from `postgres` and `supabase_admin`). Migration `0001` fixed the three existing tables only. Every future migration that creates a table must also:

1. `REVOKE ALL` on the new table from `anon`, or
2. Set up `ALTER DEFAULT PRIVILEGES` so future tables don't grant excess privileges to `anon`/`authenticated`, or
3. Explicitly grant only SELECT/INSERT/UPDATE/DELETE to `authenticated` on the new table.

This must be reviewed and approved before any new table-creating migration is applied.

## Current status

The existing Drizzle schema, exact calculations, profile/category bootstrap, and ownership-scoped API routes are implemented. Migrations `0000`–`0002` have been applied to the Supabase development project and verified live. Finance APIs and UI cover categories, transaction CRUD, summaries, analytics, budgets, goals, recurring schedules, profile settings, and transaction CSV export. Private operations use verified-profile filters and Decimal arithmetic. Transaction history is paginated at 100 rows per request. Hosted Auth and database behavior have not been end-to-end verified.

The auth code still uses Supabase Auth (`@supabase/ssr`), not Appwrite. No live Supabase Auth end-to-end test has been performed. Do not claim end-to-end verification.
