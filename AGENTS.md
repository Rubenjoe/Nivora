# Agent handoff — Nivora

## Repository boundary and current state

- Work only within `D:\Projects\nivora` (this directory). At initial inspection it was empty.
- Git root is the parent `D:\Projects`, which has unrelated pre-existing untracked items. Never stage, edit, delete, or inspect those unrelated items as part of Nivora.
- Read `IMPLEMENTATION_PROGRESS.md` first and update it after each meaningful milestone.
- Required product docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`.
- `.env`/`.env.local` and credentials are private. Never print secrets or commit them. `.env.example` may contain names and safe placeholders only.

## Non-negotiable product constraints

- Next.js App Router + React + strict TypeScript; modular monolith and versioned `/api/v1` endpoints.
- Appwrite manages identity/session. PostgreSQL is the authoritative financial store through Drizzle and versioned migrations. Appwrite native managed PostgreSQL is the intended production provider; local PostgreSQL is acceptable for development when documented.
- Never use Supabase, its SDK/auth/hosting/variables/migrations.
- Financial ownership must be checked server-side for every operation. A client-provided ID is never proof of identity or authorization.
- Use exact decimal arithmetic and PostgreSQL numeric for money. Never sum different currencies without a real conversion model.
- Do not present preview/demo values as persisted user data. Do not claim external services are configured unless tested.
- Simple/Pro is a UI preference, not authorization or an entitlement.
- Do not deploy or run destructive production changes without explicit authorization.

## Working approach

1. Inspect the actual files and instructions before edits; preserve existing useful work.
2. Use project conventions and official current Appwrite SSR documentation for auth integration.
3. Complete milestones in `IMPLEMENTATION_PROGRESS.md` order; run relevant tests/build/type checks before declaring work complete.
4. When infrastructure blocks a feature, finish independent work and document the exact configuration needed.
5. Keep API/business services separate from UI; validate inputs with schemas and centralize financial calculations.
6. Review all changed files and Git status. Since Git root is parent, constrain every Git operation to the Nivora subdirectory and do not touch parent untracked data.
7. Keep these notes factual and update them as the implementation evolves; do not assume code exists merely because the roadmap describes it.

## Current handoff

The project directory was initially empty. Milestone 1 foundation is now implemented; read `IMPLEMENTATION_PROGRESS.md` for verified checks, remaining dependency/audit issues, and next steps. An Obsidian project note is at `C:\Users\ASUS\Documents\Obsidian Vault\Nivora\Nivora.md`; the repository progress file remains authoritative for coding handoffs.


