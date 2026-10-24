# Architecture

## Target system

```text
Next.js App Router UI
  -> versioned Next.js Route Handlers (/api/v1)
  -> Supabase Auth session verification via @supabase/ssr
  -> financial services / server-side ownership checks / repositories
  -> Drizzle ORM
  -> Supabase PostgreSQL
```

The product is a modular monolith. UI components do not access the database directly; financial operations use server-side services and ownership-scoped repositories. Supabase Auth is the identity/session authority, while Supabase PostgreSQL stores profiles and financial records. API contracts remain reusable by a future Expo client; core operations must not depend exclusively on Server Actions.

## Key decisions

- App Router with strict TypeScript; prefer Server Components unless browser interaction is required.
- Supabase Auth sessions are validated server-side with the supported `@supabase/ssr` pattern. The legacy Appwrite implementation is superseded and must not be extended.
- Simple and Pro modes share one profile and financial record set. Mode is an interface preference only.
- Use UUID keys, foreign keys, explicit ownership, constraints, and reviewed versioned migrations.
- Use exact decimal arithmetic and explicit currency per financial record.
- Do not use Appwrite for identity or financial data. Do not add microservices or real billing/investment integrations to the initial scope.
- Keep external AI, email, and payment providers behind server-only interfaces when those features are justified.

## Current implementation state

Auth routes now use `@supabase/ssr`, including server-side `getUser()` verification for private finance operations and `getClaims()` in the Next.js proxy for session refresh. Profile resolution receives the verified `auth.users` UUID. Migrations `0000`–`0002` are applied in development, and their local hashes and journal timestamps match live Drizzle history. Hosted Auth and finance flows have not yet been end-to-end verified. See `IMPLEMENTATION_PROGRESS.md` for exact status and pending work.

Finance APIs cover categories, transaction CRUD, summaries, analytics, budgets, goals, recurring schedules, profile settings, and transaction CSV export. Private reads and writes use verified-profile filters and Decimal arithmetic. Transaction history is paginated in pages of 100. Feature UI is API-backed and has loading, failure, or empty states; hosted Auth/database behavior remains unverified.

## Database access and RLS

The intended data path is server-only Drizzle over PostgreSQL using `DATABASE_URL` for runtime and `DIRECT_URL` for migrations. The actual runtime database role is not yet known because no Supabase DSN is configured. A raw Drizzle `pg` connection does not automatically carry a Supabase Auth JWT or populate `auth.uid()`; do not claim RLS currently isolates these queries. Server-side verified identity plus profile-scoped queries remains mandatory. See `docs/SECURITY.md` for the role/RLS decision and its limits.

## Schema

- `profiles`: UUID PK, `supabase_user_id` UUID NOT NULL UNIQUE FK → `auth.users(id)` ON DELETE RESTRICT, display name, currency, timezone, interface mode, date format, appearance, budget/goal alerts, timestamps
- `categories`: profile-owned, kind (income/expense), icon, created_at; composite unique on `(profile_id, id, kind)` and `(profile_id, name, kind)`
- `transactions`: profile owner, category FK, kind, `numeric(19,4)` amount, ISO currency, date, optional merchant/description, timestamps; composite FK `(profile_id, category_id, kind)` → `categories`
- `budgets`, `savings_goals`, `goal_contributions`, `recurring_schedules`, and `recurring_occurrences`: profile-owned schema added by migration `0002`; local APIs and feature pages exist, with hosted verification pending
- RLS enabled on all 3 tables, 12 authenticated-only policies; `anon` has no table grants
- Migration `0001` revokes excess grants: `anon` none, `authenticated` SELECT/INSERT/UPDATE/DELETE only
