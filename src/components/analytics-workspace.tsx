"use client";

import Decimal from "decimal.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { BarChart3, Download, TrendingDown, TrendingUp } from "lucide-react";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SmokeType } from "@/components/ui/smoke-type";
import { formatMoney } from "@/lib/finance/money-format";
import { assignCategoryColors } from "@/lib/finance/category-colors";

type AnalyticsData = {
  period: { from: string; to: string; grain: string };
  currency: string;
  series: { label: string; income: string; expenses: string }[];
  totals: { income: string; expenses: string; net: string };
  comparison: {
    incomeDelta: string | null;
    expenseDelta: string | null;
    netDelta: string | null;
  };
  categories: { name: string; amount: string }[];
  budgets: {
    id: string;
    name: string;
    spent: string;
    amount: string;
    percent: number;
    alert: boolean;
  }[];
};

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const RANGES = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-30", label: "Last 30 days" },
  { key: "last-90", label: "Last 90 days" },
] as const;

function rangeBounds(key: (typeof RANGES)[number]["key"]) {
  const now = new Date();
  if (key === "this-month")
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      to: todayISO(),
    };
  if (key === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const iso = (d: Date) => {
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 10);
    };
    return { from: iso(start), to: iso(end) };
  }
  const days = key === "last-30" ? 29 : 89;
  return { from: daysAgoISO(days), to: todayISO() };
}

export function AnalyticsWorkspace() {
  const [range, setRange] =
    useState<(typeof RANGES)[number]["key"]>("this-month");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const { from, to } = rangeBounds(range);
    const query = new URLSearchParams({ from, to });
    const response = await fetch(`/api/v1/analytics?${query}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Unable to load analytics.");
    return result as AnalyticsData;
  }, [range]);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Unable to load analytics.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const formatAmount = (amount: string, currency: string) =>
    formatMoney(amount, currency);

  async function exportCsv() {
    setExporting(true);
    try {
      const { from, to } = rangeBounds(range);
      const query = new URLSearchParams({ from, to });
      const response = await fetch(`/api/v1/export/transactions?${query}`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nivora-transactions-${from}-to-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const categoryColors = assignCategoryColors(
    (data?.categories ?? []).map((category) => category.name),
  );

  const totalCategorySpend = (data?.categories ?? []).reduce(
    (sum, category) => sum.plus(category.amount),
    new Decimal(0),
  );

  return (
    <div className="feature-workspace">
      <div className="feature-intro analytics-intro">
        <div>
          <p className="eyebrow">UNDERSTAND YOUR MONEY</p>
          <h1>
            <SmokeType text="Analytics" />
          </h1>
          <p>
            Every figure below is computed from your recorded transactions —
            nothing is estimated or filled in.
          </p>
        </div>
        <div className="analytics-actions">
          <select
            className="period-button"
            aria-label="Choose analytics range"
            value={range}
            onChange={(event) =>
              setRange(event.target.value as (typeof RANGES)[number]["key"])
            }
          >
            {RANGES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary-action"
            onClick={() => void exportCsv()}
            disabled={exporting}
          >
            <Download size={15} aria-hidden="true" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {error && (
        <p className="transaction-message error standalone" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="history-empty" role="status">
          Loading analytics…
        </p>
      ) : !data || (!data.series.length && !data.categories.length) ? (
        <div className="history-empty tall">
          <span className="empty-symbol">
            <BarChart3 size={22} />
          </span>
          <h3>Not enough history yet</h3>
          <p>Record a few transactions and this page will come alive.</p>
        </div>
      ) : (
        <>
          <div className="summary-grid analytics-summary">
            {[
              {
                label: "Income",
                value: data.totals.income,
                delta: data.comparison.incomeDelta,
                tone: "income",
              },
              {
                label: "Expenses",
                value: data.totals.expenses,
                delta: data.comparison.expenseDelta,
                tone: "expense",
              },
              {
                label: "Net",
                value: data.totals.net,
                delta: data.comparison.netDelta,
                tone: "cash",
              },
            ].map(({ label, value, delta, tone }) => (
              <article className="summary-card" key={label}>
                <GlowingEffect
                  glow
                  disabled={false}
                  spread={24}
                  proximity={48}
                  inactiveZone={0.12}
                />
                <div className="summary-label">
                  <span>{label}</span>
                  <span className={`summary-icon ${tone}`}>
                    {tone === "income" ? (
                      <TrendingUp size={17} />
                    ) : tone === "expense" ? (
                      <TrendingDown size={17} />
                    ) : (
                      <BarChart3 size={17} />
                    )}
                  </span>
                </div>
                <p className="summary-value">
                  {formatAmount(value, data.currency)}
                </p>
                <p className="summary-note">
                  {delta
                    ? `vs previous period: ${delta}`
                    : "No prior activity to compare"}
                </p>
              </article>
            ))}
          </div>

          <div className="dashboard-panels">
            <section className="panel-card chart-panel">
              <GlowingEffect
                glow
                disabled={false}
                spread={30}
                proximity={56}
                inactiveZone={0.12}
              />
              <div className="section-heading compact">
                <div>
                  <h2>Cash flow</h2>
                  <p>
                    Grouped {data.period.grain} from {data.period.from} to{" "}
                    {data.period.to}.
                  </p>
                </div>
              </div>
              <CashFlowChart currency={data.currency} series={data.series} />
            </section>

            <section className="panel-card category-panel">
              <GlowingEffect
                glow
                disabled={false}
                spread={30}
                proximity={56}
                inactiveZone={0.12}
              />
              <div className="section-heading compact">
                <div>
                  <h2>Category breakdown</h2>
                  <p>Expense totals by category for this range.</p>
                </div>
              </div>
              {data.categories.length ? (
                <ol className="category-list">
                  {data.categories.map((category) => {
                    const share = totalCategorySpend.isZero()
                      ? "0"
                      : new Decimal(category.amount)
                          .div(totalCategorySpend)
                          .mul(100)
                          .toFixed(1);
                    const max = new Decimal(data.categories[0].amount);
                    const proportion = max.isZero()
                      ? "0"
                      : new Decimal(category.amount)
                          .div(max)
                          .mul(100)
                          .toFixed(1);
                    return (
                      <li className="category-item" key={category.name}>
                        <div className="category-line">
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
                            {formatAmount(category.amount, data.currency)}
                          </strong>
                        </div>
                        <div className="category-meta">
                          <span>{share}% of spending</span>
                        </div>
                        <div className="category-track" aria-hidden="true">
                          <span
                            className="category-bar-fill"
                            style={{
                              width: `${proportion}%`,
                              background:
                                categoryColors[category.name] ??
                                "var(--chart-cat-1)",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="empty-copy">
                  <h3>No expenses in this range</h3>
                  <p>Record expenses to see your category breakdown.</p>
                </div>
              )}
            </section>
          </div>

          {data.budgets.length ? (
            <section className="panel-card">
              <GlowingEffect
                glow
                disabled={false}
                spread={30}
                proximity={56}
                inactiveZone={0.12}
              />
              <div className="section-heading compact">
                <div>
                  <h2>Budget performance</h2>
                  <p>Active budgets for the current month.</p>
                </div>
              </div>
              <ul className="widget-list">
                {data.budgets.map((budget) => (
                  <li key={budget.id} className="widget-row">
                    <div>
                      <strong>{budget.name}</strong>
                      <span>
                        {formatAmount(budget.spent, data.currency)} of{" "}
                        {formatAmount(budget.amount, data.currency)}
                      </span>
                    </div>
                    <div
                      className={`budget-progress ${budget.alert ? "alert" : ""}`}
                    >
                      <span
                        style={{ width: `${Math.min(budget.percent, 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
