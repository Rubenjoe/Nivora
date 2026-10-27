# Automated Monthly Report Generation & Scheduling

This document details the architecture, entry points, and operational setup for Nivora's automated Monthly Money Review generation and notification cycle.

---

## 1. Architecture Overview

At the beginning of each calendar month, Nivora determines that the previous month's financial reporting cycle has closed.

- **Timezone Awareness**: Reporting periods are evaluated against the authenticated user's configured timezone (`profiles.timezone`, defaulting to `Asia/Kolkata` or viewer local time).
- **In-App Notification**: When the user opens Nivora, `DashboardOverview` queries `/api/v1/reports/status`. If the previous month is complete and the user has financial records or was registered during that cycle, an in-app banner appears:
  > **Your [Month] Money Review is ready**  
  > Review spending velocity, category shifts, and your monthly health score. [View Review →]
- **Dismissal & Idempotency**: Dismissing the banner stores the dismissed month key in `localStorage` (`nivora-dismissed-review-YYYY-MM`), preventing repeated disruptions.

---

## 2. Cron Webhook Endpoint

Nivora provides a dedicated, secured endpoint for scheduled report jobs:

- **Route**: `POST /api/v1/reports/cron`
- **Authentication**: Requires a pre-shared bearer token or header:
  - `Authorization: Bearer <CRON_SECRET>`
  - Or header: `x-cron-secret: <CRON_SECRET>`
- **Environment Variable**: `CRON_SECRET` must be set in `.env.local` or host environment. If unset, the endpoint safely rejects execution (HTTP 500).

### Example Webhook Request:

```bash
curl -X POST https://your-domain.com/api/v1/reports/cron \
  -H "Authorization: Bearer your_secure_cron_secret"
```

---

## 3. Configuring Schedulers

### A. Vercel Cron Jobs (Recommended for Next.js)

To schedule automatic triggers on the 1st of every month at midnight UTC, add a `crons` entry to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/v1/reports/cron",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

_Note: Vercel automatically passes `Authorization: Bearer ${CRON_SECRET}` when `CRON_SECRET` is configured in Vercel project environment variables._

### B. External Orchestrators (GitHub Actions, Cloudflare Workers, AWS EventBridge)

Trigger the webhook on the 1st of each month with the secret header.

---

## 4. Security & Privacy Safeguards

- Client-supplied IDs are never trusted; report generation and status checks verify sessions server-side.
- Financial figures are never logged in plaintext.
- The reporting engine is deterministic: re-generating a report for an immutable historical month yields identical totals.
