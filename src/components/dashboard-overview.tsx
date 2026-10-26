"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Wallet,
  PieChart,
} from "lucide-react";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { DonutChart } from "@/components/donut-chart";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { formatMoney } from "@/lib/finance/money-format";
import { assignCategoryColors } from "@/lib/finance/category-colors";

type DashboardData = {
  currency: string;
  totals: { income: string; expenses: string; net: string };
  categories: { name: string; amount: string }[];
  transactions: {
    transaction: {
      id: string;
      kind: "income" | "expense";
      amount: string;
      currency: string;
      merchant: string | null;
      occurredOn: string;
    };
    categoryName: string;
  }[];
  series?: { label: string; income: string; expenses: string }[];
  comparison?: {
    incomeDelta: string | null;
    expenseDelta: string | null;
    netDelta: string | null;
  };
  budgets?: {
    id: string;
    name: string;
    spent: string;
    amount: string;
    percent: number;
    alert: boolean;
  }[];
  goals?: {
    id: string;
    name: string;
    saved: string;
    target: string;
    percent: number;
  }[];
  upcoming?: {
    id: string;
    name: string;
    amount: string;
    nextDueDate: string;
  }[];
};

const DASHBOARD_RANGES = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-7-days", label: "7 days" },
  { key: "last-30-days", label: "30 days" },
] as const;

type DashboardRange = (typeof DASHBOARD_RANGES)[number]["key"];

function rangeLabel(range: DashboardRange) {
  return (
    DASHBOARD_RANGES.find((option) => option.key === range)?.label ??
    "This month"
  );
}

function dateISO(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

async function readDashboard(
  period: DashboardRange,
  mode: "simple" | "pro",
): Promise<DashboardData> {
  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);
  if (period === "this-month") {
    start.setDate(1);
  } else if (period === "last-month") {
    start.setFullYear(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    if (period === "last-7-days") {
      start.setDate(now.getDate() - 7);
      end.setDate(now.getDate() - 1);
    } else {
      start.setDate(now.getDate() - 29);
    }
  }
  const query = new URLSearchParams({
    from: dateISO(start),
    to: dateISO(end),
    mode,
  });
  const [analyticsResponse, recurringResponse] = await Promise.all([
    fetch(`/api/v1/analytics?${query}`, { cache: "no-store" }),
    mode === "pro"
      ? fetch("/api/v1/recurring", { cache: "no-store" }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const analytics = (await analyticsResponse.json()) as DashboardData & {
    error?: string;
  };
  if (!analyticsResponse.ok) {
    if (analyticsResponse.status === 401) {
      throw new Error("Sign in to see your private financial overview.");
    }
    throw new Error(
      analytics.error ?? "Your financial summary is unavailable.",
    );
  }
  let upcoming: DashboardData["upcoming"] = [];
  if (recurringResponse?.ok) {
    const recurringData = (await recurringResponse.json()) as {
      schedules?: {
        schedule: {
          id: string;
          merchant: string | null;
          amount: string;
          nextDueDate: string;
          status: string;
        };
        categoryName: string;
      }[];
    };
    upcoming = (recurringData.schedules ?? [])
      .filter((row) => row.schedule.status === "active")
      .slice(0, 4)
      .map((row) => ({
        id: row.schedule.id,
        name: row.schedule.merchant ?? row.categoryName,
        amount: row.schedule.amount,
        nextDueDate: row.schedule.nextDueDate,
      }));
  }
  return {
    ...analytics,
    upcoming,
  } as DashboardData;
}

export function DashboardOverview({
  mode,
  displayName,
  timezone,
  initialGreeting,
}: {
  mode: "simple" | "pro";
  displayName: string | null;
  timezone: string | null;
  initialGreeting: string;
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardRange>("this-month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    readDashboard(period, mode)
      .then((result) => {
        if (active) {
          setDashboard(result);
          setDashboardError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setDashboardError(
            cause instanceof Error
              ? cause.message
              : "Your financial summary is unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, mode]);

  const categoryColors = assignCategoryColors(
    (dashboard?.categories ?? []).map((category) => category.name),
  );

  const totalCategorySpend = (dashboard?.categories ?? []).reduce(
    (sum, category) => sum.plus(category.amount),
    new Decimal(0),
  );

  const currency = dashboard?.currency ?? "INR";
  const income = dashboard?.totals.income ?? "0";
  const expenses = dashboard?.totals.expenses ?? "0";
  const net = dashboard?.totals.net ?? "0";

  return (
    <>
      <div className="premium-header">
        <DashboardGreeting
          displayName={displayName}
          timezone={timezone}
          initialGreeting={initialGreeting}
          period={period}
        />
        <div className="dashboard-head-actions">
          <div
            className="dashboard-range-control"
            role="group"
            aria-label="Overview time range"
          >
            {DASHBOARD_RANGES.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`dashboard-range-option${
                  period === option.key ? " active" : ""
                }`}
                aria-pressed={period === option.key}
                onClick={() => {
                  if (period === option.key) return;
                  setLoading(true);
                  setDashboard(null);
                  setDashboardError(null);
                  setPeriod(option.key);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Link className="premium-btn-premium" href="/transactions">
            <Plus size={16} aria-hidden="true" /> Add transaction
          </Link>
        </div>
      </div>

      <div className="premium-summary-grid" aria-label="Financial summary">
        {[
          {
            label: "Net Cash Flow",
            value: net,
            icon: Wallet,
            tone: "primary",
            delta: dashboard?.comparison?.netDelta,
          },
          {
            label: "Total Income",
            value: income,
            icon: ArrowDownLeft,
            tone: "success",
            delta: dashboard?.comparison?.incomeDelta,
          },
          {
            label: "Total Expenses",
            value: expenses,
            icon: ArrowUpRight,
            tone: "expense",
            delta: dashboard?.comparison?.expenseDelta,
          },
        ].map(({ label, value, icon: Icon, tone, delta }) => {
          const accent =
            tone === "primary"
              ? "premium-summary-accent-net"
              : tone === "success"
                ? "premium-summary-accent-income"
                : "premium-summary-accent-expense";
          const iconFill =
            tone === "primary"
              ? "var(--color-primary)"
              : tone === "success"
                ? "var(--color-success)"
                : "var(--color-expense)";
          return (
            <article className={`premium-summary-card ${accent}`} key={label}>
              <GlowingEffect
                glow
                disabled={false}
                spread={24}
                proximity={48}
                inactiveZone={0.12}
              />
              <div className="premium-summary-head">
                <span className="premium-summary-label">{label}</span>
                <span
                  className="premium-summary-icon"
                  style={{ color: iconFill }}
                >
                  <Icon size={16} />
                </span>
              </div>
              <p className="premium-summary-value">
                {dashboard && value ? formatMoney(value, currency) : "—"}
              </p>
              {delta && (
                <p className="premium-summary-note premium-summary-delta">
                  {delta.startsWith("-") || delta.startsWith("+")
                    ? delta
                    : `Vs prior period: ${delta}`}
                </p>
              )}
              {!delta && (
                <p className="premium-summary-note">
                  {dashboard
                    ? `Recorded · ${rangeLabel(period)}`
                    : "Selected period"}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="premium-dashboard-grid">
        <section className="premium-card premium-analytics-panel">
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="premium-section">
            <div>
              <h2>Cash flow</h2>
              <p>Income and spending across the selected period.</p>
            </div>
          </div>
          {loading ? (
            <div className="premium-loading">Loading your records…</div>
          ) : dashboardError ? (
            <div className="premium-error">
              <h3>Your figures stay private</h3>
              <p>{dashboardError}</p>
            </div>
          ) : (
            <CashFlowChart
              currency={currency}
              series={dashboard?.series ?? []}
            />
          )}
        </section>

        <section className="premium-card premium-category-panel">
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="premium-section">
            <div>
              <h2>Spending breakdown</h2>
              <p>Expense distribution by category.</p>
            </div>
            <span className="premium-summary-note premium-category-total">
              {formatMoney(dashboard?.totals.expenses ?? "0", currency)} total
              expenses
            </span>
          </div>
          {loading ? (
            <div className="premium-loading">Loading your records…</div>
          ) : !dashboard?.categories.length ? (
            <div className="premium-empty premium-empty-compact">
              <span className="premium-empty-symbol">
                <PieChart size={20} aria-hidden="true" />
              </span>
              <h3>No spending breakdown yet</h3>
              <p>Record expenses to see where your money goes.</p>
            </div>
          ) : (
            <div className="premium-donut-wrap">
              <DonutChart
                categories={dashboard.categories}
                total={new Decimal(dashboard.totals.expenses).toFixed(2)}
                currency={currency}
              />
              <ol
                className="premium-category-list"
                aria-label="Spending by category"
              >
                {dashboard.categories.map((category) => {
                  const share = totalCategorySpend.isZero()
                    ? "0"
                    : new Decimal(category.amount)
                        .div(totalCategorySpend)
                        .mul(100)
                        .toFixed(1);
                  return (
                    <li className="premium-category-item" key={category.name}>
                      <div className="premium-category-line">
                        <span className="premium-category-label">
                          <i
                            className="premium-category-dot"
                            style={{
                              background:
                                categoryColors[category.name] ??
                                "var(--chart-cat-1)",
                            }}
                            aria-hidden="true"
                          />
                          {category.name}
                        </span>
                        <strong>
                          {formatMoney(category.amount, currency)}
                        </strong>
                        <span>{share}%</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>

      {(dashboard?.budgets?.length || mode === "pro") && (
        <section className="premium-card premium-budget-panel">
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="premium-section">
            <div>
              <h2>Budget progress</h2>
              <p>Active budgets for the month ending in this range.</p>
            </div>
          </div>
          {!dashboard?.budgets?.length ? (
            <p className="premium-empty-note">
              Create a monthly budget to track spending here.
              <Link href="/budgets" className="premium-inline-link">
                Manage budgets
              </Link>
            </p>
          ) : (
            <ul className="premium-widget-list">
              {dashboard.budgets.map((budget) => (
                <li key={budget.id} className="premium-widget-row">
                  <div>
                    <strong>{budget.name}</strong>
                    <span>
                      {formatMoney(budget.spent, currency)} of{" "}
                      {formatMoney(budget.amount, currency)}
                    </span>
                  </div>
                  <div className="premium-progress">
                    <span
                      className={`premium-progress-fill ${budget.alert ? "over" : ""}`}
                      style={{ width: `${Math.min(budget.percent, 100)}%` }}
                    />
                  </div>
                  <span className="premium-widget-percent">
                    {budget.percent}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {dashboard?.goals?.length ? (
        <section className="premium-card premium-goals-panel">
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="premium-section">
            <div>
              <h2>Savings goals</h2>
              <p>Progress toward your targets.</p>
            </div>
          </div>
          <ul className="premium-widget-list">
            {dashboard.goals.slice(0, 3).map((goal) => (
              <li key={goal.id} className="premium-widget-row">
                <div>
                  <strong>{goal.name}</strong>
                  <span>
                    {formatMoney(goal.saved, currency)} saved of{" "}
                    {formatMoney(goal.target, currency)}
                  </span>
                </div>
                <div className="premium-progress">
                  <span
                    className="premium-progress-fill ok"
                    style={{ width: `${Math.min(goal.percent, 100)}%` }}
                  />
                </div>
                <span className="premium-widget-percent">{goal.percent}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mode === "pro" && dashboard?.upcoming?.length ? (
        <section className="premium-card premium-recurring-panel">
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="premium-section">
            <div>
              <h2>Upcoming recurring</h2>
              <p>Schedules due soon.</p>
            </div>
          </div>
          <ul className="premium-widget-list">
            {dashboard.upcoming.map((item) => (
              <li key={item.id} className="premium-widget-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>Next due {item.nextDueDate}</span>
                </div>
                <strong className="premium-widget-amount">
                  {formatMoney(item.amount, currency)}
                </strong>
              </li>
            ))}
          </ul>
          <Link className="premium-inline-link" href="/recurring">
            Manage recurring schedules <ArrowUpRight size={13} />
          </Link>
        </section>
      ) : null}

      <section className="premium-card premium-recent-panel">
        <GlowingEffect
          glow
          disabled={false}
          spread={30}
          proximity={56}
          inactiveZone={0.12}
        />
        <div className="premium-section">
          <div>
            <h2>Recent activity</h2>
            <p>Entries from the selected period</p>
          </div>
          <Link href="/transactions" className="premium-inline-link">
            All transactions <ArrowUpRight size={13} />
          </Link>
        </div>
        {dashboard?.transactions.length ? (
          <ul className="premium-recent-list">
            {dashboard.transactions.map(({ transaction, categoryName }) => (
              <li key={transaction.id} className="premium-recent-row">
                <span
                  className={`premium-recent-sign ${transaction.kind}`}
                  aria-hidden="true"
                >
                  {transaction.kind === "expense" ? "−" : "+"}
                </span>
                <span className="premium-recent-copy">
                  <strong>{transaction.merchant || categoryName}</strong>
                  <small>
                    {categoryName} ·{" "}
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(`${transaction.occurredOn}T12:00:00`))}
                  </small>
                </span>
                <strong className={`premium-recent-amount ${transaction.kind}`}>
                  {formatMoney(transaction.amount, transaction.currency, {
                    sign:
                      transaction.kind === "expense" ? "negative" : "positive",
                  })}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="premium-recent-empty" role="status">
            {loading
              ? "Loading recent activity…"
              : (dashboardError ??
                "Your recorded transactions will appear here.")}
          </p>
        )}
      </section>

      <footer className="premium-footer">
        Built for clarity, not complexity. <span>·</span> Your financial data
        belongs to you.
      </footer>
    </>
  );
}
