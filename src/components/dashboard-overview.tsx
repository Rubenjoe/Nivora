"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, PieChart, Sparkles, X } from "lucide-react";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { DonutChart } from "@/components/donut-chart";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { useSlidingIndicator } from "@/components/ui/use-sliding-indicator";
import { SpendingCalendar } from "@/components/charts/spending-calendar";
import {
  fillDailyActivity,
  type DailyActivity,
} from "@/lib/finance/chart-data";
import { shiftCalendarDate } from "@/lib/finance/calendar";
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

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

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

/** Today's calendar date (YYYY-MM-DD) in the profile timezone, not the device's. */
function timeZoneISODate(date: Date, timeZone: string | null): string {
  if (timeZone) {
    try {
      const formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;
    } catch {
      // Invalid stored timezone: fall back to the viewer's device clock.
    }
  }
  return dateISO(date);
}

function lastDayOfMonthISO(year: number, month: number): string {
  // `Date.UTC(year, month, 0)` is the last day of 1-based `month`.
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/**
 * Period boundaries are resolved as calendar dates in the profile timezone so
 * "this month" and rolling windows agree with the greeting and the recorded
 * days even when the user's device clock sits in a different timezone.
 */
function resolvePeriodRange(
  period: DashboardRange,
  timezone: string | null,
): { from: string; to: string } {
  const today = timeZoneISODate(new Date(), timezone);
  const [year = 0, month = 1] = today.slice(0, 7).split("-").map(Number);
  const paddedMonth = String(month).padStart(2, "0");
  if (period === "this-month") {
    return { from: `${year}-${paddedMonth}-01`, to: today };
  }
  if (period === "last-month") {
    const [previousYear, previousMonth] =
      month === 1 ? [year - 1, 12] : [year, month - 1];
    return {
      from: `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`,
      to: lastDayOfMonthISO(previousYear, previousMonth),
    };
  }
  const days = period === "last-7-days" ? 6 : 29;
  return { from: shiftCalendarDate(today, -days), to: today };
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
  timezone: string | null,
  signal: AbortSignal,
): Promise<DashboardData> {
  const { from, to } = resolvePeriodRange(period, timezone);
  const query = new URLSearchParams({
    from,
    to,
    mode,
  });
  const analyticsResponse = await fetch(`/api/v1/analytics?${query}`, {
    cache: "no-store",
    signal,
  });
  const analytics = (await analyticsResponse.json().catch(() => null)) as
    | (DashboardData & {
        error?: string;
      })
    | null;
  if (!analyticsResponse.ok) {
    if (analyticsResponse.status === 401) {
      throw new Error("Sign in to see your private financial overview.");
    }
    throw new Error(
      analytics?.error ?? "Your financial summary is unavailable.",
    );
  }
  if (!analytics || typeof analytics !== "object") {
    throw new Error("Your financial summary is unavailable.");
  }
  return analytics;
}

async function readUpcoming(signal: AbortSignal) {
  const response = await fetch("/api/v1/recurring", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) return [] satisfies NonNullable<DashboardData["upcoming"]>;
  const recurringData = (await response.json().catch(() => null)) as {
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
  } | null;
  if (!Array.isArray(recurringData?.schedules)) return [];
  const upcoming: DashboardData["upcoming"] = recurringData.schedules
    .filter((row) => row.schedule.status === "active")
    .slice(0, 4)
    .map((row) => ({
      id: row.schedule.id,
      name: row.schedule.merchant ?? row.categoryName,
      amount: row.schedule.amount,
      nextDueDate: row.schedule.nextDueDate,
    }));
  return upcoming;
}

export function DashboardOverview({
  authenticated,
  mode,
  currency: profileCurrency,
  displayName,
  timezone,
  initialGreeting,
}: {
  authenticated: boolean;
  mode: "simple" | "pro";
  /** The user's currency, resolved on the server so amounts never flash the default. */
  currency: string | null;
  displayName: string | null;
  timezone: string | null;
  initialGreeting: string;
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardRange>("this-month");
  const [loading, setLoading] = useState(true);
  const [dataPeriod, setDataPeriod] = useState<DashboardRange>("this-month");
  const [dataMode, setDataMode] = useState<"simple" | "pro">(mode);
  const [upcoming, setUpcoming] = useState<DashboardData["upcoming"]>([]);
  const [reviewNotification, setReviewNotification] = useState<{
    isReady: boolean;
    previousMonth: string;
    previousMonthLabel: string;
  } | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const rangeControlRef = useSlidingIndicator<HTMLDivElement>(
    ".dashboard-range-option.active",
    period,
  );

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/v1/reports/status")
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (!active || !data?.isReady) return;
        const dismissedKey = `nivora-dismissed-review-${data.previousMonth}`;
        let wasDismissed = false;
        try {
          wasDismissed = localStorage.getItem(dismissedKey) === "true";
        } catch {
          // The notification still works when storage is unavailable.
        }
        if (wasDismissed) {
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
    if (reviewNotification) {
      try {
        localStorage.setItem(
          `nivora-dismissed-review-${reviewNotification.previousMonth}`,
          "true",
        );
      } catch {
        // Dismiss for this page view even when persistence is unavailable.
      }
    }
    setReviewDismissed(true);
  }

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    readDashboard(period, mode, timezone, controller.signal)
      .then((result) => {
        setDashboard(result);
        setDataPeriod(period);
        setDataMode(mode);
        setDashboardError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setDashboardError(
          cause instanceof Error
            ? cause.message
            : "Your financial summary is unavailable.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
  }, [authenticated, period, mode, timezone]);

  useEffect(() => {
    if (!authenticated || mode !== "pro") return;
    const controller = new AbortController();
    readUpcoming(controller.signal)
      .then(setUpcoming)
      .catch(() => {
        if (!controller.signal.aborted) setUpcoming([]);
      });
    return () => controller.abort();
  }, [authenticated, mode]);

  const categoryColors = useMemo(
    () =>
      assignCategoryColors(
        (dashboard?.categories ?? []).map((category) => category.name),
      ),
    [dashboard?.categories],
  );

  const totalCategorySpend = useMemo(
    () =>
      (dashboard?.categories ?? []).reduce(
        (sum, category) => sum.plus(category.amount),
        new Decimal(0),
      ),
    [dashboard?.categories],
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

  const shownPeriod = dashboard ? dataPeriod : period;
  const isRefreshing = Boolean(
    dashboard && (dataPeriod !== period || dataMode !== mode),
  );

  /* The profile currency arrives from the server, so the very first paint
     formats with the user's currency. The dashboard payload and, only as a
     last resort, the default cover cases where no profile exists. */
  const currency = profileCurrency ?? dashboard?.currency ?? "INR";
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
          period={shownPeriod}
        />
        <div className="dashboard-head-actions">
          <div
            ref={rangeControlRef}
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

      {dashboardError && dashboard ? (
        <p className="dashboard-refresh-error" role="status">
          Could not load {rangeLabel(period)}. Showing your{" "}
          {rangeLabel(dataPeriod)}
          results instead.
        </p>
      ) : null}

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

      <section
        className="position-panel"
        aria-label="Financial summary"
        aria-busy={isRefreshing}
      >
        <div className="position-lead">
          <p className="meta-label">
            Net cash flow · {rangeLabel(shownPeriod)}
          </p>
          <p className="position-value">
            {dashboard ? (
              <AnimatedMoney value={net} currency={currency} />
            ) : (
              "—"
            )}
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
              {dashboard ? formatMoney(income, currency) : "—"} in
            </span>
            <span>
              <i className="flow-key expense" aria-hidden="true" />
              {dashboard ? formatMoney(expenses, currency) : "—"} out
            </span>
          </div>
        </div>
        <dl className="position-side">
          <div>
            <dt>
              <span className="position-dot income" aria-hidden="true" />
              Total income
            </dt>
            <dd>
              {dashboard ? (
                <AnimatedMoney value={income} currency={currency} />
              ) : (
                "—"
              )}
            </dd>
            <p>{comparisonNote(dashboard?.comparison?.incomeDelta) ?? "—"}</p>
          </div>
          <div>
            <dt>
              <span className="position-dot expense" aria-hidden="true" />
              Total expenses
            </dt>
            <dd>
              {dashboard ? (
                <AnimatedMoney value={expenses} currency={currency} />
              ) : (
                "—"
              )}
            </dd>
            <p>{comparisonNote(dashboard?.comparison?.expenseDelta) ?? "—"}</p>
          </div>
        </dl>
      </section>

      {hasSignals && (
        <ul
          className="signal-strip"
          aria-label="Signals for this period"
          aria-busy={isRefreshing}
        >
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

      <div className="premium-dashboard-grid" aria-busy={isRefreshing}>
        <section className="premium-card chart-panel" aria-busy={isRefreshing}>
          <div className="section-head">
            <div>
              <h2>Cash flow</h2>
              <p>
                Income and spending, {rangeLabel(shownPeriod).toLowerCase()}.
              </p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton tall />
          ) : dashboardError && !dashboard ? (
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

        <section
          className="premium-card breakdown-panel"
          aria-busy={isRefreshing}
        >
          <div className="section-head">
            <div>
              <h2>Where it went</h2>
              <p>Share of expenses by category.</p>
            </div>
          </div>
          {loading ? (
            <ChartSkeleton tall />
          ) : dashboardError && !dashboard ? (
            <div className="premium-error compact">
              <p>{dashboardError}</p>
            </div>
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

      <section
        className="premium-card dashboard-calendar-panel"
        aria-busy={isRefreshing}
      >
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
        ) : dashboardError && !dashboard ? (
          <div className="premium-error compact">
            <p>{dashboardError}</p>
          </div>
        ) : calendarDays.length ? (
          <SpendingCalendar
            days={calendarDays}
            currency={currency}
            caption={`Spending by day · ${rangeLabel(shownPeriod)}`}
          />
        ) : (
          <p className="premium-empty-note">No calendar days in this range.</p>
        )}
      </section>

      <div className="dashboard-lower" aria-busy={isRefreshing}>
        <section
          className="premium-card premium-recent-panel"
          aria-busy={isRefreshing}
        >
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
                      {SHORT_DATE_FORMAT.format(
                        new Date(`${transaction.occurredOn}T12:00:00`),
                      )}
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

        <aside
          className="dashboard-rail"
          aria-label="Plans and progress"
          aria-busy={isRefreshing}
        >
          <section
            className="premium-card plans-panel"
            aria-busy={isRefreshing}
          >
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

          {mode === "pro" && upcoming?.length ? (
            <section className="premium-card upcoming-panel">
              <div className="section-head">
                <div>
                  <h2>Upcoming</h2>
                  <p>Scheduled commitments.</p>
                </div>
              </div>
              <ul className="premium-widget-list">
                {upcoming.map((item) => (
                  <li key={item.id} className="upcoming-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {SHORT_DATE_FORMAT.format(
                          new Date(`${item.nextDueDate}T12:00:00`),
                        )}
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
