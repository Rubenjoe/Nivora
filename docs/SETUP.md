# Setup

## Current status

Supabase Auth and Supabase PostgreSQL are integrated in local code. Migrations `0000`, `0001`, and `0002` are applied to the Supabase development project (`oxjnxvqarqrilzuetzai`); their history rows, local hashes, and journal timestamps have been verified. Hosted Auth and finance flows remain unverified.

## Local development

1. Install Node.js 24 (or a supported current LTS) and npm.
2. From this directory run `npm install`.
3. The local environment status check reports public Supabase settings, PostgreSQL URL formats, and the CA file as present. This checks configuration shape only, not credential validity or connectivity. If the database password is rotated, refresh `DATABASE_URL` (runtime pooler) and `DIRECT_URL` (direct or session pooler) from Dashboard → Connect with the rotated password, and set `DATABASE_SSL_CA_PATH` to the downloaded CA certificate path. Do not share these values in chat.
4. Use the Supabase development project only after confirming the project reference. Confirm explicitly before any production use.
5. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to Redirect URLs for local development. Under Authentication → Providers → Email, enable email confirmations. Add deployed origins and their exact `/auth/confirm` callback only when those origins are known. These dashboard settings have not been inspected or changed by this task.
6. `DATABASE_URL` is the runtime PostgreSQL connection; choose the Supabase connection mode appropriate for the deployment. `DIRECT_URL` is the direct/DDL-capable migration connection. Require TLS as directed by the Supabase connection details. Do not guess hosts, ports, usernames, or credentials.
7. TLS: download the Supabase root CA certificate from the Supabase dashboard — Project settings → Database → connection details → download CA certificate (root cert). Save it outside the repository (e.g. `certs/` next to the project, which is gitignored), set `DATABASE_SSL_CA_PATH` to its path in `.env.local`, and never commit the certificate or its path value with credentials. The runtime database client verifies the server certificate (`rejectUnauthorized` is always `true`); `DATABASE_SSL_CA_PATH` is optional and defaults to the system trust store when unset.

## Vercel deployment

1. Import the Next.js project into Vercel with the repository root as the Root Directory and the default `npm run build` command. Do not configure a static export.
2. In Vercel → Project → Settings → Environment Variables, add these for the environments you will deploy (Production, and Preview if needed):
   - `NEXT_PUBLIC_SUPABASE_URL` — the intended Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — that project's publishable key; never use a service-role/secret key in a public variable.
   - `APP_URL` — the exact canonical HTTPS origin you use to open this deployment, with no path (for example `https://your-domain.example`). The login/API CSRF check compares the request `Origin` to this value. Set Production and Preview values separately; for the stable `main` branch alias, use that exact branch alias as the Preview value.
   - `DATABASE_URL` — the intended Supabase PostgreSQL runtime connection URL.
   - `DATABASE_SSL_CA_CERT` — the Supabase root CA certificate PEM contents, stored as a Vercel secret/environment variable. Do not use a machine-local `DATABASE_SSL_CA_PATH` on Vercel.
3. Do not run `npm run db:migrate` as part of Vercel's build or deployment. Review and apply database migrations separately under the project's migration approval process. `DIRECT_URL` is only needed for that separately controlled migration workflow.
4. The authenticated app routes are explicitly dynamic because they read the request's Supabase session. This prevents Next.js from trying to authenticate a visitor during static prerender/build. Supabase variables are still required at runtime; missing values will prevent Auth-backed pages from working.
5. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to the deployed origin and add the exact deployed `/auth/confirm` URL to Redirect URLs. Add Preview callback URLs only if those preview origins are intended and allowed.
6. After setting/changing environment variables, trigger a fresh deployment. Verify sign-in and callback, then verify private finance APIs only after database connectivity and intended project/schema have been independently confirmed. A successful Vercel build alone does not prove hosted Auth or database connectivity.
7. Check Vercel → Project → Settings → Deployment Protection. For a public production site, do not require Vercel Authentication on Production deployments; this is separate from Nivora's Supabase login. Preview deployments may remain protected, but testers must pass Vercel's access gate before the app's own routes can be tested.

## Migrations

Migrations `0000`, `0001`, and `0002` are applied and verified in the Supabase development project (`oxjnxvqarqrilzuetzai`). The live Drizzle ledger contains three rows, with hashes and `created_at` values matching local SQL and `drizzle/meta/_journal.json`. Migration `0002` was applied through the Supabase migration tool, then its Drizzle bookkeeping row was recorded separately. Do not rerun or replay `0002`.

Before any future approved `npm run db:migrate`, confirm `DIRECT_URL` is set in `.env.local`. The `db:migrate` script runs a pre-flight check that fails with a clear message if `DIRECT_URL` is missing and prints only the Supabase project reference derived from the host — never the full connection URL.

Schema changes go only through the reviewed Drizzle migration workflow; do not edit the Supabase project through the dashboard SQL editor. Before an approved production migration, take a provider-supported backup and document restore verification. Production migrations require explicit approval.

## Environment and credentials

`.env.example` contains safe placeholders only. Keep `.env.local` ignored by Git. Supabase URL and publishable key are public configuration; database URLs are server-only. Never put a service-role/secret key in a `NEXT_PUBLIC_` variable, browser code, logs, or chat. The auth code uses Supabase Auth. A successful hosted flow still depends on the dashboard settings above and a configured private database connection for finance APIs.

Latest safe inspection found the Supabase public settings and both PostgreSQL URLs present; both URLs parse as PostgreSQL URLs, and the CA path resolves to an existing file. Values were not printed. No database connection was attempted, so endpoint, password, TLS handshake, and hosted Auth settings remain unverified. Recheck after any password rotation.
