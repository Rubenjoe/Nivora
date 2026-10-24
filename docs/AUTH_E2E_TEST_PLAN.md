# Supabase Auth two-user development end-to-end plan

## Status

Approved for review with amendments only. No Auth users or financial records have been created, and no hosted end-to-end or RLS check has run. Do not run any check or create anything until the user explicitly confirms that every prerequisite below is complete.

## Prerequisites — user confirmation required before any run

- Target project is the development project `oxjnxvqarqrilzuetzai` only.
- The previously exposed database password has been rotated.
- In ignored `.env.local`, `DATABASE_URL` contains the runtime pooler URL, `DIRECT_URL` contains the direct or session pooler URL, and `DATABASE_SSL_CA_PATH` points to an existing downloaded CA certificate file. Keep all values private.
- In Supabase Dashboard → Authentication → Providers → Email, email confirmation is enabled.
- In Authentication → URL Configuration, Site URL is `http://localhost:3000` and Redirect URLs includes `http://localhost:3000/auth/confirm`.
- The user creates two Auth users in Dashboard → Authentication → Users, using throwaway addresses `nivora-test-a@example.com` and `nivora-test-b@example.com`, with Auto Confirm enabled for both. Do not depend on email delivery. Keep passwords private; do not paste them into chat.
- The local app is available at `http://localhost:3000`; sign in as each user in separate browser profiles. Do not mix or log session cookies, access tokens, refresh tokens, passwords, or confirmation links.
- The user confirms all preceding prerequisites in chat before any run. Approval of this plan alone is not confirmation that prerequisites are complete.

## API test flow

Record each check as PASS or FAIL only after it runs, with HTTP status and sanitized evidence. If a check is not run, report NOT RUN. Do not record credentials, confirmation links, access tokens, refresh tokens, or full cookie values.

1. **Authentication identity:** In profile A, sign in as user A and call `/api/v1/auth/me`; record the returned Auth UUID as A. Repeat in profile B and confirm B has a different UUID.
2. **Create isolated fixtures:** Using A's authenticated session, create an expense category and transactions for amounts `0.1001` and `0.2002`. Include `profile_id` set to B's own profile ID on one transaction request. Using B's session, create a different expense category and transaction with `profile_id` set to A's profile ID. Obtain each own profile ID from that user's authenticated category list response. Record fixture IDs for targeted assertions.
3. **Own-data visibility:** As A, call the categories and transactions list APIs and verify A's fixture rows appear and B's do not. As B, verify B's fixture rows appear and A's do not.
4. **Cross-user category ownership:** As A, attempt to create a transaction using B's category ID; expect validation failure and confirm no transaction was created. Repeat as B using A's category ID.
5. **Cross-user transaction ID access:** As A, request GET, PATCH, and DELETE for B's transaction ID. Each must return 404 or 403 and must never return B's transaction data. Confirm B's transaction remains unchanged. Repeat the same three requests as B against A's transaction ID and confirm A's row remains unchanged.
6. **Tampered owner field:** Inspect each newly created transaction through the authenticated API. PASS if the request is rejected with 400, or if it succeeds and the returned `profileId` is the caller's own profile ID despite the opposite user's `profile_id` in the body. FAIL if the supplied value is used.
7. **Unauthenticated and invalid sessions:** With no Supabase Auth cookies, call `/api/v1/auth/me`, category list, transaction list, summary with valid date filters, and transaction-by-ID; each must return 401. In a separate disposable browser profile, set an invalid value for the Supabase Auth cookie and repeat `/api/v1/auth/me` and a private finance read; each must return 401.
8. **Sign-out invalidation:** Sign out A and B through the app. In each same browser profile, call `/api/v1/auth/me` and a private finance read; each must return 401.
9. **Exact amount storage:** Through GET `/api/v1/transactions`, verify A's amount strings are exactly `0.1001` and `0.2002` (or the database driver's exact scale-preserving equivalents), with no floating-point conversion or truncation. Report this check separately from summary display rounding.

These API checks exercise application-side authentication and profile-scoped privileged Drizzle queries. They are not RLS tests.

## Read-only database ownership and precision checks — before cleanup

After the API checks and before any delete, use Supabase tools for read-only queries scoped to the two exact Auth UUIDs. Resolve each `profiles.id` via `profiles.supabase_user_id`; inspect only their test fixture IDs and rows. Confirm:

- Every test transaction's `profile_id` maps to the Auth UUID of the user who created it, and its category belongs to that same profile.
- The two precision fixtures are stored as exact PostgreSQL numeric values `0.1001` and `0.2002`.
- No fixture from a tampered `profile_id` request exists under the other user's profile, and no unrecognized test fixture rows exist for either exact test profile.

Report these read-only database findings separately from the API results, with sanitized row IDs, owners, and amounts. Do not broaden queries or cleanup scope beyond the two exact Auth UUIDs and recorded test fixtures.

## RLS simulation checks — separately reported

Using Supabase tools only, run read-only RLS visibility checks for each real Auth UUID. In a transaction, switch to the `authenticated` database role, set the request JWT claim subject to one test UUID (and the authenticated role claim as needed), then SELECT that user's profile, categories, and transactions. Repeat for the other UUID. Confirm each simulated identity sees only its own rows and cannot see the other user's rows. Roll back the transaction/session changes. Report the results separately from the API checks; this simulation is not a live browser API test and does not change the fact that privileged Drizzle calls are authorized by application-side profile filters.

## Cleanup after observations

Cleanup uses Supabase tools only, never the app, and requires explicit user approval for the deletes after the pre-cleanup read-only ownership and RLS reports are reviewed. Scope every delete to the two exact Auth UUIDs and their confirmed profile IDs. Follow this strict order:

1. Delete the recorded test transactions.
2. Delete the test categories belonging to those two profiles.
3. Delete the two profiles mapped to the exact Auth UUIDs.
4. Delete the two Auth users through Supabase tools, only after the user explicitly approves this stage.
5. Read-only verify that `auth.users`, `profiles`, `categories`, and `transactions` each contain zero rows.

The Supabase tool session must support the Auth-user deletion step. If it does not, stop before that step and report the limitation; do not substitute the app or another deletion path. Do not broaden the delete scope if any ownership mapping is uncertain.
