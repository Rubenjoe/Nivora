# Architecture

## Intended system

```text
Responsive Next.js App Router UI
  -> versioned Next.js Route Handlers (/api/v1)
  -> server-side Appwrite session verification and profile resolution
  -> financial services / authorization / repositories
  -> Drizzle ORM
  -> PostgreSQL (Appwrite native managed PostgreSQL in production)
```

The initial product is a modular monolith. UI components never access the database directly; financial operations use a server-side service and ownership-scoped repository. Appwrite is the identity/session authority, while PostgreSQL stores application profiles and financial records. API contracts remain reusable by a future Expo client; core operations must not depend exclusively on Server Actions.

## Key decisions

- App Router with strict TypeScript; prefer Server Components unless browser interaction is required.
- Simple and Pro modes share one profile and financial record set. Mode is an interface preference only.
- Use UUID keys, foreign keys, explicit ownership, constraints, and safe versioned migrations.
- Use exact decimal arithmetic and explicit currency per financial record.
- No Supabase, microservices, or real billing/investment integrations in the initial scope.
- Keep external AI, email, and payment providers behind server-only interfaces when those features are justified.

## Current implementation state

The repository started empty. The first database slice now defines profiles linked to Appwrite IDs, per-profile categories, transactions, Drizzle/PostgreSQL runtime access, generated migrations, verified-session profile initialization, and ownership-scoped transaction/category/summary API routes. This is code-complete only for those slices; Appwrite and Appwrite PostgreSQL are not provisioned or live-tested here. See `IMPLEMENTATION_PROGRESS.md` for exact verification and remaining work.

The runtime driver is `pg` through Drizzle's node-postgres adapter. Appwrite's current Drizzle guide recommends direct TLS PostgreSQL connections, port 6432 pooler for short-lived runtime traffic and port 5432 direct engine for migrations. Keep credentials server-side. No Appwrite TablesDB is used for finance.
