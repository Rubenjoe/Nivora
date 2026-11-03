"use client";

import { AppShell } from "@/components/app-shell";
import type { ClientNavSession } from "@/components/use-nav-session";

const previewSession: ClientNavSession = {
  status: "authenticated",
  user: {
    id: "preview-user",
    email: "preview@example.com",
    name: "Preview Account",
  },
  profile: {
    id: "preview-profile",
    displayName: "Preview Account",
    currency: "USD",
    mode: "simple",
    timezone: "UTC",
    dateFormat: "MMM d, yyyy",
    appearance: "dark",
    budgetAlertsEnabled: true,
    goalAlertsEnabled: true,
  },
  storageReady: true,
};

if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("/api/v1/auth/me")) {
      return new Response(
        JSON.stringify({
          ok: true,
          user: previewSession.user,
          profile:
            previewSession.status === "authenticated"
              ? previewSession.profile
              : null,
          storageReady: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };
}

const previewRows = [
  { label: "Housing", value: "$1,850.00", share: 62 },
  { label: "Groceries", value: "$640.00", share: 41 },
  { label: "Transport", value: "$212.00", share: 24 },
];

export default function UiPreviewPage() {
  return (
    <AppShell initialSession={previewSession}>
      <div className="premium-header dashboard-header">
        <div className="dashboard-intro">
          <p className="eyebrow">Overview</p>
          <div className="dashboard-greeting">
            <span className="dashboard-greeting-mark" aria-hidden="true" />
            Good evening, Preview
          </div>
          <h1>Your money, in focus.</h1>
        </div>
        <div className="dashboard-head-actions">
          <div
            className="dashboard-range-control"
            role="group"
            aria-label="Range"
          >
            {["This month", "Last month", "7 days", "30 days"].map(
              (label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`dashboard-range-option${index === 0 ? " active" : ""}`}
                  aria-pressed={index === 0}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <button type="button" className="premium-btn-premium">
            Add transaction
          </button>
        </div>
      </div>

      <section className="position-panel" aria-label="Financial summary">
        <div className="position-lead">
          <p className="meta-label">Net cash flow · This month</p>
          <p className="position-value">+$1,240.00</p>
        </div>
        <dl className="position-side">
          <div>
            <dt>Total income</dt>
            <dd>$4,200.00</dd>
          </div>
          <div>
            <dt>Total expenses</dt>
            <dd>$2,960.00</dd>
          </div>
        </dl>
      </section>

      <section className="premium-card" style={{ marginTop: 16 }}>
        <div className="premium-section">
          <h2>Spending by category</h2>
          <p>Placeholder layout preview only. No financial data is stored.</p>
        </div>
        {previewRows.map((row) => (
          <div key={row.label} className="plan-row">
            <div className="plan-row-head">
              <strong>{row.label}</strong>
              <span>{row.value}</span>
            </div>
            <div className="premium-progress">
              <span
                className="premium-progress-fill ok"
                style={{ width: `${row.share}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="premium-card" style={{ marginTop: 16 }}>
        <div className="premium-transaction-row">
          <span>Groceries</span>
          <span>Whole Foods</span>
          <span>Sep 18</span>
          <span>-$84.20</span>
        </div>
      </section>
    </AppShell>
  );
}
