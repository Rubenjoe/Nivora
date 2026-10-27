<div align="center">

# Nivora

### Clarity for Every Financial Decision

A responsive personal-finance application for organising transactions, understanding spending patterns, planning budgets, tracking savings goals, and reviewing recurring financial activity.

![Status](https://img.shields.io/badge/status-active%20development-blue)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)
![ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F)
![License](https://img.shields.io/badge/license-MIT-green)

[Features](#-features) · [Architecture](#-architecture) · [Setup](#-getting-started) · [Database](#-database-and-migrations) · [Security](#-security-notes)

`</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Database and Migrations](#-database-and-migrations)
- [Development Scripts](#-development-scripts)
- [Application Areas](#-application-areas)
- [Security Notes](#-security-notes)
- [Current Status and Limitations](#-current-status-and-limitations)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Author](#-author)

---

## 🧭 Overview

**Nivora** is a full-stack personal-finance application built to give users a clearer view of their day-to-day finances. It brings transactions, categories, spending analytics, budgets, savings goals, recurring schedules, and profile preferences into a single responsive interface.

The application follows a modular-monolith architecture built with **Next.js App Router** and **TypeScript**. Supabase Auth provides identity and session handling; finance operations are processed by versioned server-side route handlers, application services, ownership-scoped data access, and **Drizzle ORM** over PostgreSQL.

The project is under active development. The repository documents implemented local flows and development migrations, but hosted authentication and finance API behaviour still require end-to-end validation before the system can be considered production-ready.

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Financial overview** | Review key financial summaries and spending analytics in a dashboard. |
| 💳 **Transactions** | Record and manage income and expense transactions with dates, categories, merchant/description fields, and currency. |
| 🗂️ **Categories** | Organise transactions by profile-owned income and expense categories. |
| 📈 **Analytics** | Explore transaction summaries and spending patterns through dashboard views and charts. |
| 🎯 **Budgets** | Define and review budget records and budget-related progress. |
| 🏦 **Savings goals** | Create savings goals and track contributions. |
| 🔁 **Recurring schedules** | Manage recurring transaction schedules and their occurrences. |
| 📤 **CSV export** | Export transaction history for offline analysis. |
| 👤 **Profile preferences** | Configure currency, timezone, date format, appearance, interface mode, and alert preferences. |
| 📱 **Responsive interface** | Navigate finance features on desktop and mobile layouts. |
| 🔐 **Session-aware APIs** | Validate Supabase identity server-side and scope financial operations to the authenticated user's profile. |

Feature availability can evolve as the project progresses. AI-driven investment recommendations and live banking integrations are not claimed as implemented features in this README.

## 🏗️ Architecture

### High-Level System Diagram

```text
┌─────────────────────────────────────┐
│         Next.js App Router UI       │
│ Dashboard · Transactions · Budgets  │
│ Goals · Analytics · Settings        │
└──────────────────┬──────────────────┘
                   │ HTTP / JSON
                   ▼
┌─────────────────────────────────────┐
│       Versioned Route Handlers      │
│              /api/v1                │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Authentication + Application Layer  │
│ Supabase session verification       │
│ Services · Validation · Ownership    │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           Drizzle ORM               │
│       Server-side PostgreSQL        │
└──────────────────┬──────────────────┘
                   │ TLS
                   ▼
┌─────────────────────────────────────┐
│       Supabase PostgreSQL           │
│ Profiles · Transactions · Budgets   │
│ Goals · Categories · Schedules      │
└─────────────────────────────────────┘
```

### Design principles

- **Server-side identity verification:** Validate Supabase sessions on private route handlers before performing finance operations.
- **Explicit ownership checks:** Scope financial records to the profile associated with the verified user.
- **Versioned API contracts:** Keep application operations accessible through reusable `/api/v1` route handlers.
- **Reviewed schema changes:** Generate and apply Drizzle migrations through a controlled workflow.
- **Exact financial arithmetic:** Use decimal arithmetic for monetary values instead of relying on floating-point calculations.
- **Secure database connections:** Keep PostgreSQL credentials server-side and verify TLS certificates.

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| UI | React, TypeScript |
| Styling | Tailwind CSS |
| Components and icons | Lucide |
| Interaction and motion | Motion |
| Validation | Zod |
| Authentication | Supabase Auth with `@supabase/ssr` |
| Database | Supabase PostgreSQL |
| Data access and migrations | Drizzle ORM, Drizzle Kit |
| Monetary arithmetic | Decimal.js |
| PostgreSQL driver | `pg` |
| Testing | Node test runner through `tsx`, PGlite for local database tests |
| Hosting target | Vercel |

## 🧩 Repository Structure

```text
Nivora/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated application pages
│   │   ├── api/                # Versioned API route handlers
│   │   ├── auth/               # Authentication and callback routes
│   │   └── ...                 # Layouts, styles, and feature pages
│   ├── components/             # Reusable UI components
│   └── lib/                    # Domain, data, auth, and utility modules
├── drizzle/                    # Versioned schema migrations
├── scripts/                    # Migration preflight and development scripts
├── docs/
│   ├── ARCHITECTURE.md         # System and data architecture
│   ├── SETUP.md                # Local and deployment setup
│   └── SECURITY.md             # Authentication and security model
├── .env.example                # Safe configuration placeholders
├── drizzle.config.ts           # Drizzle Kit configuration
├── package.json                # Scripts and dependencies
├── LICENSE                     # MIT License
└── README.md
```

Consult the actual source tree for the latest filenames and feature modules.

## ✅ Prerequisites

- **Node.js 24** or a supported current LTS release
- **npm**
- A Supabase project with Auth and PostgreSQL enabled
- A Supabase publishable key and project URL
- A PostgreSQL runtime connection URL for the intended development project
- The Supabase root CA certificate for verified PostgreSQL TLS connections
- A direct or session-pooler database URL for reviewed migration workflows

Do not use production credentials for local experimentation. Do not post connection strings, passwords, CA secrets, or private environment files in issue trackers or chat.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Rubenjoe/Nivora.git
cd Nivora
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the local environment file

**Windows PowerShell**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux**

```bash
cp .env.example .env.local
```

Open `.env.local` and set the values for the intended Supabase development project. Keep this file local and out of version control.

### 4. Configure Supabase Auth

In the Supabase dashboard for your development project:

1. Set the local Site URL to `http://localhost:3000`.
2. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
3. Check the email authentication and confirmation settings.
4. Use the corresponding project URL and publishable key in the local environment.

For a deployed environment, configure the exact deployed origin and callback URL. Do not allow arbitrary redirect URLs.

### 5. Configure PostgreSQL and TLS

Set the runtime database URL in `DATABASE_URL` and configure `DATABASE_SSL_CA_PATH` to point to a downloaded Supabase root CA certificate. For hosted deployments, `DATABASE_SSL_CA` can contain the full PEM certificate; this takes precedence over the local certificate path.

The application verifies the PostgreSQL server certificate. **Do not disable certificate verification** to work around a TLS configuration error.

The `DIRECT_URL` variable is reserved for the separately controlled Drizzle migration workflow. Use the correct connection details for the selected Supabase project; do not guess hosts, ports, usernames, or passwords.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The environment must contain valid settings for the features you want to test. A page loading successfully does not prove that hosted authentication or database writes are working end to end.

## ⚙️ Environment Configuration

The `.env.example` file documents the variable names. Configure them with the appropriate values for your development environment.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the application. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. This is public client configuration, not a privileged secret. |
| `APP_URL` | Canonical application origin used by origin/CSRF checks, such as `http://localhost:3000`. |
| `DATABASE_URL` | Server-side PostgreSQL runtime connection. |
| `DIRECT_URL` | Database connection reserved for reviewed migration operations. |
| `DATABASE_SSL_CA_PATH` | Path to the Supabase CA PEM file in local development. |
| `DATABASE_SSL_CA` | Full CA PEM value for hosted environments; takes precedence over the file path. |

### Environment safety

- Keep `.env.local` out of Git.
- Never place a database connection string or database password in a `NEXT_PUBLIC_` variable.
- Never expose a Supabase service-role/secret key in browser code.
- Configure Preview and Production origins separately.
- After changing environment variables in Vercel, trigger a fresh deployment.
- Keep the local CA certificate outside the repository or in an ignored directory.

## 🗄️ Database and Migrations

Nivora uses Drizzle ORM and versioned SQL migrations for schema changes.

### Migration workflow

1. Make the required schema change in the Drizzle schema definitions.
2. Generate a migration and inspect the resulting SQL.
3. Review the migration and verify the intended project and database connection.
4. Apply it only through the approved migration workflow.
5. Test affected routes and data ownership after migration.

Generate a migration:

```bash
npm run db:generate
```

Apply a migration only to an explicitly approved development database:

```bash
npm run db:migrate
```

The migration command runs a preflight check for `DIRECT_URL`. Do not run migrations automatically as part of a deployment build. Production migrations require a separate review, explicit approval, and a provider-supported backup.

The repository's setup documentation reports that migrations `0000`–`0002` were applied to a development Supabase project. No production migration is represented as having been performed by this README.

## 🧪 Development Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Build the application. |
| `npm run start` | Start a built application. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript checks. |
| `npm test` | Run the configured test suite. |
| `npm run format:check` | Check formatting. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Run the guarded migration workflow; use only for approved database targets. |

Run the relevant checks before pushing changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 🧾 Application Areas

The main finance workflows are organised around:

- **Overview and analytics:** Present financial summaries and spending information.
- **Transactions:** Manage income and expenses with category, date, amount, currency, and optional merchant/description.
- **Categories:** Maintain profile-owned income and expense classifications.
- **Budgets:** Organise budget records and review progress.
- **Savings goals:** Set goals and record contributions.
- **Recurring activity:** Represent recurring schedules and related occurrences.
- **Settings:** Store personal preferences including currency, timezone, date format, appearance, and alerts.
- **Export:** Download transaction records in CSV format.

Financial records are associated with a profile, and private API operations should only use the profile mapped from the verified authenticated user.

## 🔐 Security Notes

Financial data requires deliberate access-control and deployment decisions.

- Supabase Auth is the identity/session authority; private API routes verify the user server-side.
- Use the verified Auth user ID to resolve the user's profile. Never trust a client-supplied profile ID.
- Constrain each financial read/write to the authenticated user's profile.
- The application uses a privileged server-side PostgreSQL connection through Drizzle. Supabase RLS does **not** automatically act as the authorization boundary for those Drizzle queries; verified identity and explicit ownership-scoped queries are mandatory.
- Keep the runtime and migration database URLs server-side.
- Use certificate-verified TLS for PostgreSQL connections.
- Validate request data, parameterize queries, bound pagination/exports, and avoid sensitive logging.
- Test cross-user access failures in addition to happy paths.
- Review session/CSRF behaviour, deployment headers, backups, recovery, export, and account deletion before production use.

See [docs/SECURITY.md](docs/SECURITY.md) for the detailed security model and [docs/SETUP.md](docs/SETUP.md) for deployment notes.

## ⚠️ Current Status and Limitations

Nivora is actively developed. The repository documents local implementation and migration checks, but the following verification remains important:

- Hosted Supabase Auth, confirmation callbacks, and finance API flows need end-to-end validation.
- A successful local build does not establish live database connectivity.
- The actual PostgreSQL connection role and its privileges must be confirmed for the deployed environment.
- Cross-user API tests against hosted Auth and the intended database should be completed before production use.
- The application is a finance-tracking and planning tool; it does not replace professional financial advice and does not imply a live banking connection.

See [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) for the detailed implementation history and remaining work.

## 🩹 Troubleshooting

| Symptom | Checks |
|---|---|
| Sign-in or email confirmation fails | Verify Supabase Auth settings, Site URL, callback allowlist, and the exact deployed `APP_URL`. |
| API returns forbidden/origin errors | Confirm the request origin matches the configured canonical `APP_URL`. |
| TLS certificate error | Download the correct Supabase CA certificate and configure `DATABASE_SSL_CA_PATH` locally or `DATABASE_SSL_CA` in hosted environments. Do not disable certificate verification. |
| Finance records fail to persist | Confirm `DATABASE_URL`, TLS configuration, schema migrations, and server logs without printing credentials. |
| Build succeeds but hosted data fails | A build is not a live Auth/database test. Verify Supabase redirect settings and test the required routes with an approved test account. |
| Migration preflight fails | Check that `DIRECT_URL` is set in the local environment for the intended development project; never paste the full URL in logs or chat. |

## 🗺️ Roadmap

Potential next steps include:

- Complete hosted Auth and finance-flow end-to-end validation.
- Add integration tests using dedicated test users and a test database.
- Verify database runtime-role privileges and deployed query isolation.
- Add operational monitoring and safer error reporting without leaking financial data.
- Expand automated accessibility and cross-device checks.
- Document restore testing, account data export/deletion, and production operations.
- Evaluate any future AI financial insights separately from the core recordkeeping and budgeting features.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full terms.

The MIT license applies to the project code owned by the repository's copyright holder. Dependencies, third-party assets, and external services remain subject to their respective terms.

## 👤 Author

**Ruben Joemon** · [GitHub](https://github.com/Rubenjoe) · [LinkedIn](https://www.linkedin.com/in/ruben-joemon-633b6b330/)

---

Nivora is built as a practical full-stack finance application exploring secure session handling, ownership-aware data access, data modelling, financial calculations, analytics, and responsive product design.
