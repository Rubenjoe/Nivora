# Roadmap

1. **Foundation: implemented.** Next.js App Router, strict TypeScript, responsive shell, environment basics, and project documentation.
2. **Authentication: implemented locally; hosted verification pending.** Registration, login, logout, confirmation callback, `/me`, session refresh, and server-side user verification use `@supabase/ssr`. Dashboard settings and live sign-up are not verified.
3. **Data: development migrations applied and verified.** Keep Drizzle and reviewed PostgreSQL migrations; the profile identity column is `supabase_user_id` referencing Supabase Auth `auth.users`. Migrations `0000`–`0002` are applied and live history matches local hashes and journal timestamps. `0002` adds profile preferences and persistence tables for budgets, savings goals, and recurring items.
4. **Transactions and income: implemented locally; hosted verification pending.** Versioned CRUD/list/category/summary API routes use input validation, exact decimal calculations, and profile-scoped queries. Run the approved two-user development flow before claiming hosted ownership verification.
5. **Dashboard and analytics: implemented locally; hosted verification pending.** The dashboard requests period totals, cash-flow series, spending categories, recent entries, and comparisons from the profile-scoped analytics API. No live Supabase data has been verified.
6. **Budgets: implemented locally; hosted verification pending.** Profile-scoped APIs and budget creation, editing, progress, and empty states are present.
7. **Goals and recurring schedules: implemented locally; hosted verification pending.** APIs and UI support goal targets/contributions and recurring schedule controls. Background processing is not claimed as configured.
8. **Security/reliability: partial.** Server-side ownership checks and an isolated schema test exist. Hosted Supabase Auth, live cross-user API checks, runtime role verification, rate limiting, backup/restore, and operational review remain.
9. **Production readiness: not started.** Production migrations require explicit approval and a provider-supported backup.

Later, only after the individual product is stable: organization/B2B services with privacy boundaries, AI explanations of computed facts, notifications/education, Expo mobile client, billing, and additional integrations subject to consent and compliance.

Current active phase and actual outcomes: `IMPLEMENTATION_PROGRESS.md`. Local UI/performance and workspace improvements are recorded there; hosted integration verification remains open.
