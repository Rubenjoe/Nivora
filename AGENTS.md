# Agent handoff — Nivora

## Repository boundary and working rules

- Work only in `D:\Projects\nivora`. The actual Git root is this project directory; do not inspect or modify parent directory contents.
- Read `IMPLEMENTATION_PROGRESS.md` before making changes and update it after meaningful milestones.
- Keep product docs in `docs/`, migrations in `drizzle/`, and utilities in `scripts/`.
- `.env`/`.env.local`, credentials, and local certificates are private. Never print their contents, commit them, or ask the user to paste credentials. `.env.example` contains safe placeholders only.
- Preserve existing work. Review project-scoped Git status before and after edits; never use broad cleanup or reset commands.

## Product and security constraints

- Next.js App Router, React, strict TypeScript, modular monolith, and versioned `/api/v1` routes.
- Supabase Auth owns identity and sessions; Supabase PostgreSQL is the financial source of truth through Drizzle and reviewed forward migrations. Do not use Appwrite for identity or financial data.
- Verify Auth server-side and derive ownership from the verified user/profile. A client-supplied ID never proves authorization.
- Runtime Drizzle uses a privileged database connection, so RLS does not protect its queries. Every private query must filter by the verified profile.
- Use PostgreSQL numeric and Decimal arithmetic; never combine currencies without a conversion model.
- Never present preview/demo values as persisted data or claim external integration is configured without verification.
- Simple/Pro is a UI preference, not an entitlement.
- Do not apply migrations, modify live data, or deploy production changes without explicit authorization.

## Current handoff

Supabase Auth (`@supabase/ssr`), development migrations `0000`–`0002`, versioned finance APIs, and responsive feature pages are implemented locally. The three migrations were applied and verified only in development project `oxjnxvqarqrilzuetzai`. No production migration was run.

The dashboard uses profile-scoped analytics and recent activity; budgets, analytics, goals, recurring schedules, settings, help, and transaction workflows have routes and UI. The current visual system uses a dark graphite canvas, restrained glass surfaces, horizontal desktop navigation, a responsive mobile drawer, and a working quick-action dock. Transaction history is paginated at 100 rows per API page. See `IMPLEMENTATION_PROGRESS.md` and `docs/ROADMAP.md` for feature scope and verification limits.

The local environment status script confirms required public settings, PostgreSQL URL shapes, and a resolvable CA file without printing their values. This does not prove database connectivity. Hosted Auth, live finance APIs, and database connectivity remain unverified. Never ask for secrets in chat.

Latest local checks: lint, typecheck, format check, 24 tests, production build, and `npm audit --omit=dev` passed (0 production vulnerabilities). The build emits dynamic filesystem tracing warnings from `src/lib/db/configuration.ts`; these remain documented and unresolved.
