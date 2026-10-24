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
import { DonutChart } from "@/components/donut-chart";

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

function dateISO(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

async function readDashboard(
  period: "this-month" | "last-month",
  mode: "simple" | "pro",
): Promise<DashboardData> {
  const now = new Date();
  const start =
    period === "this-month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end =
    period === "this-month"
      ? now
      : new Date(now.getFullYear(), now.getMonth(), 0);
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

export function DashboardOverview({ mode }: { mode: "simple" | "pro" }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"this-month" | "last-month">(
    "this-month",
  );
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

  const formatMoney = (amount: string, currency: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(Number(amount));

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
        <div>
          <p className="eyebrow">YOUR FINANCIAL HOME</p>
          <h1>Overview</h1>
          <p className="subheading">
            {mode === "simple"
              ? "A clear view of your income, spending, and recent activity."
              : "Detailed cash flow, comparisons, and budget signals."}
          </p>
        </div>
        <div className="dashboard-head-actions">
          <div className="period-select-wrap">
            <label className="premium-label" style={{ marginBottom: 0 }}>
              Period
            </label>
            <select
              className="premium-select"
              aria-label="Choose summary period"
              value={period}
              onChange={(event) => {
                setLoading(true);
                setDashboard(null);
                setDashboardError(null);
                setPeriod(event.target.value as "this-month" | "last-month");
              }}
            >
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
            </select>
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
              ? "premium-summary-accent-purple"
              : tone === "success"
                ? "premium-summary-accent-coral"
                : "premium-summary-accent-blue";
          const iconFill =
            tone === "primary"
              ? "var(--color-primary)"
              : tone === "success"
                ? "var(--color-success)"
                : "var(--color-expense)";
          return (
            <article className={`premium-summary-card ${accent}`} key={label}>
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
                    ? `Recorded ${period === "this-month" ? "this month" : "last month"}`
                    : "Selected period"}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="premium-dashboard-grid">
        <section className="premium-card premium-analytics-panel">
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
                        <span>{category.name}</span>
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
          <div className="premium-section">
            <div>
              <h2>Budget progress</h2>
              <p>Active budgets for the current month.</p>
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
                  {transaction.kind === "expense" ? "−" : "+"}
                  {formatMoney(transaction.amount, transaction.currency)}
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
