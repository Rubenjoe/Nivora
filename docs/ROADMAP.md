# Roadmap

1. **Foundation: complete.** Strict Next.js App Router project, initial responsive shell/tokens, environment basics, setup and architecture docs.
2. **Authentication: partial.** Appwrite SSR registration/login/logout and session verification exist; no live project test, protected finance dashboard, recovery or verification yet.
3. **Data: partial.** PostgreSQL/Drizzle schema and generated migration; profile/category initialization, ownership-scoped server helpers and isolated schema test. No live migration/connection yet.
4. **Transactions and income: partial.** Versioned CRUD/list/category/summary API routes with input validation and exact decimal calculations. No end-to-end authenticated request test or transaction-entry/history UI yet.
5. **Simple Mode: not started.** Dashboard remains an empty-state shell; no database-backed totals/chart/category breakdown.
6. **Budgets and Pro Mode: not started.**
7. **Goals and refinement: not started.**
8. **Security/reliability: partial.** Auth/finance checks and schema isolation test exist; rate limiting, live-provider/API isolation tests, backup/restore, and operational review remain.
9. **Production readiness: not started.**

Later, only after the individual product is stable: organization/B2B services with privacy boundaries, AI explanations of computed facts, notifications/education, Expo mobile client, billing, and additional integrations subject to consent and compliance.

Current active phase and actual outcomes: `IMPLEMENTATION_PROGRESS.md`.
