# Database

## Ownership model

Appwrite supplies a verified identity. The server resolves its unique `appwrite_user_id` to one internal `profiles` row; all private records carry a profile foreign key. Every read/write query must be constrained by the authenticated profile, including nested resources, analytics, exports, and background work. Client-supplied profile IDs are not trusted.

## Implemented initial entities

- `profiles`: UUID, unique Appwrite user ID, display name, preferred currency (default INR), timezone, interface mode (`simple`/`pro`), timestamps.
- `categories`: profile-owned, direction/type and stable icon ID; defaults are seeded idempotently per profile.
- `transactions`: profile owner, direction (`income`/`expense`), positive `numeric(19,4)` amount, ISO currency, category FK, date, description/merchant and timestamps.
- `budgets`: profile owner, optional category, amount/currency, weekly/monthly period boundaries and warning threshold.
- `recurring_transactions`: profile owner, template details, cadence, date boundaries, next due date, status, idempotent occurrence tracking.

Additional tags, splits, goals, insights, notifications, audit events, and organizations are deferred until their features are implemented.

## Integrity and calculations

Implemented schema and initial migration: `src/lib/db/schema.ts`, `drizzle/0000_rare_wither.sql`. UUID primary keys, currency and positive-amount checks, profile/category foreign keys, composite `(profile_id, category_id)` FK, uniqueness constraints, and profile/date indexes are included. All initial finance API operations derive the profile from `account.get()` using the Appwrite session and scope reads, updates and deletes to that profile; client profile IDs are not accepted. The composite FK also prevents attaching another user's category.

Money uses PostgreSQL `numeric`; TypeScript totals and category breakdowns use Decimal. Queries are restricted to the profile currency; no cross-currency conversion is implemented. Date filters take ISO dates; timezone-specific month boundaries are not yet wired into the dashboard.

Refund semantics, split representation, and budget uniqueness constraints must be finalized in the relevant milestone and covered by tests before shipping.

## Migrations

Use Drizzle Kit versioned, reviewed migrations (`npm run db:generate`, `npm run db:migrate`). Migrations require `DIRECT_URL` pointed at the direct PostgreSQL engine, not the pooler. No destructive push/sync or unreviewed data loss. The initial generated migration has been applied to isolated PGlite for schema/foreign-key checks, not to a live Appwrite database.

## Current status

Drizzle/PostgreSQL schema, migration generation, exact calculations, idempotent profile/category bootstrap, and initial ownership-scoped API routes are implemented and tested locally with PGlite. No live database is configured; runtime data persistence, migration against Appwrite, full CRUD integration and dashboard-backed UI remain unverified/incomplete. Budgets and recurring transactions are planned only.
