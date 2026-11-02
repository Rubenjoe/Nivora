"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, PieChart, Sparkles, X } from "lucide-react";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { DonutChart } from "@/components/donut-chart";
import { SpendingCalendar } from "@/components/charts/spending-calendar";
import {
  fillDailyActivity,
  type DailyActivity,
} from "@/lib/finance/chart-data";
import { formatMoney } from "@/lib/finance/money-format";
import { assignCategoryColors } from "@/lib/finance/category-colors";

type DashboardData = {
  currency: string;
  period: { from: string; to: string; grain: string };
  totals: { income: string; expenses: string; net: string };
  categories: { categoryId: string; name: string; amount: string }[];
  dailyActivity?: DailyActivity[];
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

function comparisonNote(delta: string | null | undefined) {
  if (!delta) return null;
  if (delta === "new") return "First period with activity";
  return `${delta} vs previous period`;
}

function dateISO(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

function ChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton${tall ? " tall" : ""}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function transactionHref(
  period: { from: string; to: string } | undefined,
  filters: { categoryId?: string; merchant?: string } = {},
) {
  if (!period) return "/transactions";
  const query = new URLSearchParams({
    from: period.from,
    to: period.to,
    kind: "expense",
  });
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.merchant) query.set("merchant", filters.merchant);
  return `/transactions?${query.toString()}`;
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
  authenticated,
  mode,
  displayName,
  timezone,
  initialGreeting,
}: {
  authenticated: boolean;
  mode: "simple" | "pro";
  displayName: string | null;
  timezone: string | null;
  initialGreeting: string;
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardRange>("this-month");
  const [loading, setLoading] = useState(true);
  const [reviewNotification, setReviewNotification] = useState<{
    isReady: boolean;
    previousMonth: string;
    previousMonthLabel: string;
  } | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/v1/reports/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.isReady) return;
        const dismissedKey = `nivora-dismissed-review-${data.previousMonth}`;
        if (
          typeof window !== "undefined" &&
          localStorage.getItem(dismissedKey) === "true"
        ) {
          setReviewDismissed(true);
        }
        setReviewNotification(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authenticated]);

  function dismissReviewBanner() {
    if (reviewNotification && typeof window !== "undefined") {
      localStorage.setItem(
        `nivora-dismissed-review-${reviewNotification.previousMonth}`,
        "true",
      );
    }
    setReviewDismissed(true);
  }

  useEffect(() => {
    if (!authenticated) return;
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
  }, [authenticated, period, mode]);

  const categoryColors = assignCategoryColors(
    (dashboard?.categories ?? []).map((category) => category.name),
  );

  const totalCategorySpend = (dashboard?.categories ?? []).reduce(
    (sum, category) => sum.plus(category.amount),
    new Decimal(0),
  );

  const calendarDays =
    dashboard?.period && dashboard.dailyActivity
      ? fillDailyActivity(
          dashboard.dailyActivity,
          dashboard.period.from,
          dashboard.period.to,
        ).map((day) => ({
          date: day.date,
          amount: day.expenses,
          count: day.transactionCount,
        }))
      : [];

  const currency = dashboard?.currency ?? "INR";
  const income = dashboard?.totals.income ?? "0";
  const expenses = dashboard?.totals.expenses ?? "0";
  const net = dashboard?.totals.net ?? "0";

  const totalFlow = new Decimal(income).plus(expenses);
  const incomePercent = totalFlow.isZero()
    ? 0
    : new Decimal(income).div(totalFlow).mul(100).toNumber();
  const topCategory = dashboard?.categories[0];
  const topCategoryShare =
    topCategory && !totalCategorySpend.isZero()
      ? new Decimal(topCategory.amount)
          .div(totalCategorySpend)
          .mul(100)
          .toFixed(1)
      : null;
  const budgetsNearLimit =
    dashboard?.budgets?.filter((budget) => budget.alert).length ?? 0;
  const leadGoal = dashboard?.goals?.[0];
  const hasSignals =
    !loading && !dashboardError && Boolean(dashboard?.categories.length);

  if (!authenticated) {
    return (
      <section className="public-dashboard">
        <p className="public-dashboard-kicker">A clearer view of your money</p>
        <h1>Your finances, in focus.</h1>
        <p>
          Sign in to see your private overview, track spending, and keep your
          financial plans together.
        </p>
        <div className="public-dashboard-actions">
          <Link className="premium-btn-premium" href="/sign-in">
            Sign in
          </Link>
          <Link className="premium-btn-ghost" href="/sign-up">
            Create an account <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <span className="public-dashboard-note">
          Your financial information stays private to your account.
        </span>
      </section>
    );
  }

  return (
    <>
      <div className="premium-header dashboard-header">
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

      {/* In-App Notification: Previous Month Money Review Ready */}
      {reviewNotification?.isReady && !reviewDismissed && (
        <aside className="monthly-review-banner" role="status">
          <div className="banner-content">
            <Sparkles size={15} className="gold-icon" aria-hidden="true" />
            <div>
              <strong>
                Your {reviewNotification.previousMonthLabel} Money Review is
                ready
              </strong>
              <p>
                Spending velocity, category shifts, and your monthly health
                score.
              </p>
            </div>
          </div>
          <div className="banner-actions">
            <Link
              href={`/reports?month=${reviewNotification.previousMonth}`}
              className="banner-primary-btn"
            >
              View review
            </Link>
            <button
              type="button"
              onClick={dismissReviewBanner}
              className="banner-dismiss-btn"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}

      <section className="position-panel" aria-label="Financial summary">
        <div className="position-lead">
          <p className="meta-label">Net cash flow · {rangeLabel(period)}</p>
          <p className="position-value">
            {dashboard ? formatMoney(net, currency) : "—"}
          </p>
          <p className="position-note">
            {comparisonNote(dashboard?.comparison?.netDelta) ??
              "Income minus expenses"}
          </p>
          <div className="flow-balance" aria-hidden="true">
            <span
              className="flow-income"
              style={{ width: `${incomePercent}%` }}
            />
            <span className="flow-expense" />
          </div>
          <div className="flow-balance-legend">
            <span>
              <i className="flow-key income" aria-hidden="true" />
              {formatMoney(income, currency)} in
            </span>
            <span>
              <i className="flow-key expense" aria-hidden="true" />
              {formatMoney(expenses, currency)} out
            </span>
          </div>
        </div>
        <dl className="position-side">
          <div>
            <dt>
              <span className="position-dot income" aria-hidden="true" />
              Total income
            </dt>
            <dd>{dashboard ? formatMoney(income, currency) : "—"}</dd>
            <p>{comparisonNote(dashboard?.comparison?.incomeDelta) ?? "—"}</p>
          </div>
          <div>
            <dt>
              <span className="position-dot expense" aria-hidden="true" />
              Total expenses
            </dt>
            <dd>{dashboard ? formatMoney(expenses, currency) : "—"}</dd>
            <p>{comparisonNote(dashboard?.comparison?.expenseDelta) ?? "—"}</p>
          </div>
        </dl>
      </section>

      {hasSignals && (
        <ul className="signal-strip" aria-label="Signals for this period">
          {topCategory && (
            <li>
              <span>Top category</span>
              <strong>{topCategory.name}</strong>
              <em>{topCategoryShare}% of spending</em>
            </li>
          )}
          <li>
            <span>Budget watch</span>
            <strong>
              {budgetsNearLimit
                ? `${budgetsNearLimit} near the limit`
                : "Within limits"}
            </strong>
            <em>
              {dashboard?.budgets?.length
                ? `${dashboard.budgets.length} active budgets`
                : "No budgets yet"}
            </em>
          </li>
          <li>
            <span>Savings</span>
            <strong>{leadGoal ? leadGoal.name : "No goal yet"}</strong>
            <em>{leadGoal ? `${leadGoal.percent}% funded` : "Set a target"}</em>
          </li>
        </ul>
      )}

      <div className="premium-dashboard-grid">
        <section className="premium-card chart-panel">
          <div className="section-head">
            <div>
              <h2>Cash flow</h2>
              <p>Income and spending, {rangeLabel(period).toLowerCase()}.</p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton tall />
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

        <section className="premium-card breakdown-panel">
          <div className="section-head">
            <div>
              <h2>Where it went</h2>
              <p>Share of expenses by category.</p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton tall />
          ) : !dashboard?.categories.length ? (
            <div className="premium-empty premium-empty-compact">
              <span className="premium-empty-symbol">
                <PieChart size={19} aria-hidden="true" />
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
                drilldown={
                  dashboard.period
                    ? {
                        from: dashboard.period.from,
                        to: dashboard.period.to,
                      }
                    : undefined
                }
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
                    <li
                      className="premium-category-item"
                      key={category.categoryId ?? category.name}
                    >
                      <Link
                        className="premium-category-line category-drill-link"
                        href={transactionHref(dashboard.period, {
                          categoryId: category.categoryId,
                        })}
                        aria-label={`View ${category.name} transactions for this range`}
                      >
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
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>

      <section className="premium-card dashboard-calendar-panel">
        <div className="section-head">
          <div>
            <h2>Daily spending</h2>
            <p>Every recorded expense, by calendar day.</p>
          </div>
          {dashboard?.period ? (
            <Link
              className="quiet-link"
              href={transactionHref(dashboard.period)}
            >
              Open expenses <ArrowUpRight size={13} />
            </Link>
          ) : null}
        </div>
        {loading ? (
          <ChartSkeleton />
        ) : dashboardError ? (
          <div className="premium-error compact">
            <p>{dashboardError}</p>
          </div>
        ) : calendarDays.length ? (
          <SpendingCalendar
            days={calendarDays}
            currency={currency}
            caption={`Spending by day · ${rangeLabel(period)}`}
          />
        ) : (
          <p className="premium-empty-note">No calendar days in this range.</p>
        )}
      </section>

      <div className="dashboard-lower">
        <section className="premium-card premium-recent-panel">
          <div className="section-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest entries in this period.</p>
            </div>
            <Link href="/transactions" className="quiet-link">
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
                  <strong
                    className={`premium-recent-amount ${transaction.kind}`}
                  >
                    {formatMoney(transaction.amount, transaction.currency, {
                      sign:
                        transaction.kind === "expense"
                          ? "negative"
                          : "positive",
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

        <aside className="dashboard-rail" aria-label="Plans and progress">
          <section className="premium-card plans-panel">
            <div className="section-head">
              <div>
                <h2>Plans in motion</h2>
                <p>Budgets and goals at a glance.</p>
              </div>
            </div>
            {dashboard?.budgets?.length ? (
              <div className="rail-group">
                <h3>Budgets</h3>
                <ul className="premium-widget-list">
                  {dashboard.budgets.slice(0, 3).map((budget) => (
                    <li key={budget.id} className="plan-row">
                      <div className="plan-row-head">
                        <strong>{budget.name}</strong>
                        <span className={budget.alert ? "is-alert" : undefined}>
                          {budget.percent}%
                        </span>
                      </div>
                      <div
                        className="premium-progress"
                        role="progressbar"
                        aria-label={`${budget.name} budget used`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(
                          Math.round(budget.percent),
                          100,
                        )}
                      >
                        <span
                          className={`premium-progress-fill ${budget.alert ? "over" : ""}`}
                          style={{ width: `${Math.min(budget.percent, 100)}%` }}
                        />
                      </div>
                      <p>
                        {formatMoney(budget.spent, currency)} of{" "}
                        {formatMoney(budget.amount, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="premium-empty-note">
                No budgets yet.
                <Link href="/budgets" className="premium-inline-link">
                  Create a budget
                </Link>
              </p>
            )}
            {dashboard?.goals?.length ? (
              <div className="rail-group">
                <h3>Savings goals</h3>
                <ul className="premium-widget-list">
                  {dashboard.goals.slice(0, 2).map((goal) => (
                    <li key={goal.id} className="plan-row">
                      <div className="plan-row-head">
                        <strong>{goal.name}</strong>
                        <span>{goal.percent}%</span>
                      </div>
                      <div
                        className="premium-progress"
                        role="progressbar"
                        aria-label={`${goal.name} savings progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(Math.round(goal.percent), 100)}
                      >
                        <span
                          className="premium-progress-fill ok"
                          style={{ width: `${Math.min(goal.percent, 100)}%` }}
                        />
                      </div>
                      <p>
                        {formatMoney(goal.saved, currency)} of{" "}
                        {formatMoney(goal.target, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {mode === "pro" && dashboard?.upcoming?.length ? (
            <section className="premium-card upcoming-panel">
              <div className="section-head">
                <div>
                  <h2>Upcoming</h2>
                  <p>Scheduled commitments.</p>
                </div>
              </div>
              <ul className="premium-widget-list">
                {dashboard.upcoming.map((item) => (
                  <li key={item.id} className="upcoming-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(`${item.nextDueDate}T12:00:00`))}
                      </span>
                    </div>
                    <strong>{formatMoney(item.amount, currency)}</strong>
                  </li>
                ))}
              </ul>
              <Link className="quiet-link" href="/recurring">
                Manage schedules <ArrowUpRight size={13} />
              </Link>
            </section>
          ) : null}
        </aside>
      </div>

      <footer className="premium-footer">
        Built for clarity, not complexity. <span>·</span> Your financial data
        belongs to you.
      </footer>
    </>
  );
}
