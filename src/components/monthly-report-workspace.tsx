"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Layers,
  Printer,
  Search,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SmokeType } from "@/components/ui/smoke-type";
import { formatMoney } from "@/lib/finance/money-format";
import { ComparisonBars } from "@/components/comparison-bars";
import { VelocitySpendChart } from "@/components/velocity-spend-chart";
import { CategoryBarChart } from "@/components/category-bar-chart";
import { HealthScoreGauge } from "@/components/health-score-gauge";
import { WeeklySpendChart } from "@/components/weekly-spend-chart";
import type { MonthlyReportResult } from "@/lib/finance/monthly-report";

function defaultMonthISO() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function MonthlyReportWorkspace() {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthISO);
  const [report, setReport] = useState<MonthlyReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Drilldown and Appendix filters
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [drillMerchant, setDrillMerchant] = useState<string | null>(null);
  const [appendixSearch, setAppendixSearch] = useState("");
  const [appendixKind, setAppendixKind] = useState<
    "all" | "expense" | "income"
  >("all");

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/reports?month=${selectedMonth}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load monthly report.");
    }
    return data as MonthlyReportResult;
  }, [selectedMonth]);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (!active) return;
        setReport(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error loading report.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  function handleShiftMonth(offset: number) {
    setLoading(true);
    setDrillCategory(null);
    setDrillMerchant(null);
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthStr!, 10) - 1;
    const nextDate = new Date(year, month + offset, 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const nextMonthISO = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`;
    setSelectedMonth(nextMonthISO);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/v1/reports?month=${selectedMonth}&format=csv`,
      );
      if (!response.ok) throw new Error("CSV export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nivora-money-review-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Filtered Appendix Transactions
  const filteredTransactions = useMemo(() => {
    if (!report?.allTransactions) return [];
    return report.allTransactions.filter((tx) => {
      if (drillCategory && tx.categoryId !== drillCategory) return false;
      if (drillMerchant && tx.merchant !== drillMerchant) return false;
      if (appendixKind !== "all" && tx.kind !== appendixKind) return false;
      if (appendixSearch.trim()) {
        const query = appendixSearch.toLowerCase();
        const m = (tx.merchant ?? "").toLowerCase();
        const d = (tx.description ?? "").toLowerCase();
        const c = tx.categoryName.toLowerCase();
        if (!m.includes(query) && !d.includes(query) && !c.includes(query))
          return false;
      }
      return true;
    });
  }, [report, drillCategory, drillMerchant, appendixKind, appendixSearch]);

  const activeCategoryObject = useMemo(() => {
    if (!drillCategory || !report) return null;
    return report.categoryAnalysis.expenses.find(
      (c) => c.categoryId === drillCategory,
    );
  }, [drillCategory, report]);

  return (
    <div className="feature-workspace monthly-report-page">
      {/* Top Banner / Controls */}
      <div className="feature-intro report-header-area">
        <div>
          <p className="eyebrow">MONTHLY FINANCIAL INTELLIGENCE</p>
          <h1>
            <SmokeType text="Money Review" />
          </h1>
          <p>
            An exhaustive, deterministic financial debrief evaluating cash flow,
            spending velocity, category shifts, and budget integrity.
          </p>
        </div>

        <div className="report-controls-group">
          {/* Month selector */}
          <div className="month-picker-pill">
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => handleShiftMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft size={17} />
            </button>

            <label className="month-picker-label">
              <Calendar size={15} aria-hidden="true" />
              <input
                type="month"
                className="month-native-input"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setLoading(true);
                    setDrillCategory(null);
                    setDrillMerchant(null);
                    setSelectedMonth(e.target.value);
                  }
                }}
              />
              <span className="month-display-name">
                {report?.monthLabel ?? selectedMonth}
              </span>
            </label>

            <button
              type="button"
              className="month-nav-btn"
              onClick={() => handleShiftMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="report-action-buttons">
            <button
              type="button"
              className="secondary-action"
              onClick={handleExportCsv}
              disabled={exporting || loading || !report}
              title="Export complete review as CSV"
            >
              <Download size={15} aria-hidden="true" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>

            <button
              type="button"
              className="secondary-action"
              onClick={handlePrint}
              disabled={loading || !report}
              title="Print or save as PDF"
            >
              <Printer size={15} aria-hidden="true" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* In-progress status pill */}
      {report && (
        <div className="period-status-banner">
          <div className="period-status-content">
            <Clock size={15} aria-hidden="true" />
            <span>
              {report.isCompletedMonth ? (
                <>
                  <strong>Closed Reporting Period:</strong> Full calendar month
                  concluded ({report.daysInMonth} days).
                </>
              ) : (
                <>
                  <strong>Reporting Period In Progress:</strong>{" "}
                  {report.daysElapsed} of {report.daysInMonth} calendar days
                  recorded so far.
                </>
              )}
            </span>
          </div>
          <span className="period-badge">
            {report.totals.totalTransactionCount} recorded transaction
            {report.totals.totalTransactionCount === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {error && (
        <p className="transaction-message error standalone" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="history-empty" role="status">
          <p>Compiling monthly financial intelligence review…</p>
        </div>
      ) : !report ? null : (
        <>
          {/* 1. Scorecard Metrics Row */}
          <div className="summary-grid report-summary-grid">
            {/* Income */}
            <article className="summary-card">
              <GlowingEffect
                glow
                disabled={false}
                spread={24}
                proximity={48}
                inactiveZone={0.12}
              />
              <div className="summary-label">
                <span>Total Income</span>
                <span className="summary-icon income">
                  <TrendingUp size={17} />
                </span>
              </div>
              <p className="summary-value">
                {formatMoney(report.totals.income, report.currency)}
              </p>
              <p className="summary-note">
                {report.comparison.incomeDelta
                  ? `vs ${report.priorMonthLabel}: ${report.comparison.incomeDelta}`
                  : `${report.totals.incomeCount} income deposits`}
              </p>
            </article>

            {/* Expenses */}
            <article className="summary-card">
              <GlowingEffect
                glow
                disabled={false}
                spread={24}
                proximity={48}
                inactiveZone={0.12}
              />
              <div className="summary-label">
                <span>Total Expenses</span>
                <span className="summary-icon expense">
                  <TrendingDown size={17} />
                </span>
              </div>
              <p className="summary-value">
                {formatMoney(report.totals.expenses, report.currency)}
              </p>
              <p className="summary-note">
                {report.comparison.expenseDelta
                  ? `vs ${report.priorMonthLabel}: ${report.comparison.expenseDelta}`
                  : `${report.totals.expenseCount} purchases`}
              </p>
            </article>

            {/* Net Cash Flow */}
            <article className="summary-card">
              <GlowingEffect
                glow
                disabled={false}
                spread={24}
                proximity={48}
                inactiveZone={0.12}
              />
              <div className="summary-label">
                <span>Net Cash Flow</span>
                <span className="summary-icon cash">
                  <Wallet size={17} />
                </span>
              </div>
              <p className="summary-value">
                {formatMoney(report.totals.net, report.currency)}
              </p>
              <p className="summary-note">
                {report.comparison.netDelta
                  ? `vs ${report.priorMonthLabel}: ${report.comparison.netDelta}`
                  : "Net saved this month"}
              </p>
            </article>

            {/* Savings Rate & Daily Average */}
            <article className="summary-card">
              <GlowingEffect
                glow
                disabled={false}
                spread={24}
                proximity={48}
                inactiveZone={0.12}
              />
              <div className="summary-label">
                <span>Savings Rate</span>
                <span className="summary-icon cash">
                  <Award size={17} />
                </span>
              </div>
              <p className="summary-value">{report.totals.savingsRate}%</p>
              <p className="summary-note">
                Avg {formatMoney(report.totals.avgDailySpend, report.currency)}{" "}
                / day
              </p>
            </article>
          </div>

          {/* Secondary Metrics Strip */}
          <div className="secondary-metrics-strip">
            <div className="sec-metric-item">
              <span className="sec-metric-label">Average Expense Value</span>
              <strong>
                {formatMoney(report.totals.avgExpenseAmount, report.currency)}
              </strong>
            </div>
            <div className="sec-metric-item">
              <span className="sec-metric-label">Total Outflow Count</span>
              <strong>{report.totals.expenseCount} transactions</strong>
            </div>
            <div className="sec-metric-item">
              <span className="sec-metric-label">Peak Spending Day</span>
              <strong>
                {report.totals.highestSpendingDay
                  ? `${report.totals.highestSpendingDay.date} (${formatMoney(report.totals.highestSpendingDay.amount, report.currency)})`
                  : "No expense recorded"}
              </strong>
            </div>
            <div className="sec-metric-item">
              <span className="sec-metric-label">Top Expense Category</span>
              <strong>
                {report.categoryAnalysis.topExpenseCategory
                  ? `${report.categoryAnalysis.topExpenseCategory.categoryName} (${report.categoryAnalysis.topExpenseCategory.percentageOfTotal}%)`
                  : "None"}
              </strong>
            </div>
          </div>

          {/* 2. Key Intelligence Highlights */}
          {report.highlights.length > 0 && (
            <section className="panel-card highlights-panel">
              <GlowingEffect
                glow
                disabled={false}
                spread={28}
                proximity={52}
                inactiveZone={0.12}
              />
              <div className="section-heading compact">
                <div>
                  <h2 className="flex-heading">
                    <Sparkles
                      size={17}
                      className="gold-icon"
                      aria-hidden="true"
                    />
                    Month Takeaways & Strategic Insights
                  </h2>
                  <p>
                    Key financial shifts detected across your accounts this
                    month.
                  </p>
                </div>
              </div>

              <div className="highlights-grid">
                {report.highlights.map((item, idx) => (
                  <div className={`highlight-card tone-${item.type}`} key={idx}>
                    <div className="highlight-badge-row">
                      <span className={`highlight-type-badge ${item.type}`}>
                        {item.type === "positive"
                          ? "Strength"
                          : item.type === "warning"
                            ? "Action Needed"
                            : item.type === "info"
                              ? "Signal"
                              : "Observation"}
                      </span>
                      <strong>{item.title}</strong>
                    </div>
                    <p className="highlight-desc">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. Deep Dive Grid: Comparison Bars & Health Gauge */}
          <div className="dashboard-panels report-double-panel">
            {/* Panel A: Month-over-Month Grouped Bars */}
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
                  <h2>Month-over-Month Comparison</h2>
                  <p>
                    Comparing {report.monthLabel} side-by-side with{" "}
                    {report.priorMonthLabel}.
                  </p>
                </div>
              </div>

              <ComparisonBars
                currency={report.currency}
                currentLabel={report.monthLabel}
                priorLabel={report.priorMonthLabel}
                metrics={[
                  {
                    label: "Income",
                    currentAmount: report.totals.income,
                    priorAmount: report.priorTotals.income,
                    delta: report.comparison.incomeDelta,
                    tone: "income",
                  },
                  {
                    label: "Expenses",
                    currentAmount: report.totals.expenses,
                    priorAmount: report.priorTotals.expenses,
                    delta: report.comparison.expenseDelta,
                    tone: "expense",
                  },
                  {
                    label: "Net Cash Flow",
                    currentAmount: report.totals.net,
                    priorAmount: report.priorTotals.net,
                    delta: report.comparison.netDelta,
                    tone: "cash",
                  },
                ]}
              />
            </section>

            {/* Panel B: Financial Health Score */}
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
                  <h2>Financial Health Score</h2>
                  <p>
                    Deterministic composite score based on discipline and
                    savings.
                  </p>
                </div>
              </div>

              <HealthScoreGauge health={report.financialHealth} />
            </section>
          </div>

          {/* 4. Spending Velocity Curve */}
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
                <h2>Spending Velocity vs Prior Month</h2>
                <p>
                  Cumulative spend day 1 to {report.daysInMonth}. Compare
                  whether you burned funds faster or slower than in{" "}
                  {report.priorMonthLabel}.
                </p>
              </div>
            </div>

            <VelocitySpendChart
              series={report.velocitySeries}
              currency={report.currency}
              currentMonthLabel={report.monthLabel}
              priorMonthLabel={report.priorMonthLabel}
            />
          </section>

          {/* 5. Weekly Spending Breakdown */}
          {report.weeklyTotals.length > 0 && (
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
                  <h2>Weekly Outflow & Inflow Pacing</h2>
                  <p>
                    Distribution of spending and earnings across calendar weeks.
                  </p>
                </div>
              </div>

              <WeeklySpendChart
                weeks={report.weeklyTotals}
                currency={report.currency}
              />
            </section>
          )}

          {/* 6. Category Breakdown & Top Merchants */}
          <div className="dashboard-panels report-double-panel">
            {/* Category Breakdown with Drilldown */}
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
                  <h2>Category Analysis & Drilldown</h2>
                  <p>
                    Click any category to filter the transaction appendix below.
                  </p>
                </div>
              </div>

              <CategoryBarChart
                categories={report.categoryAnalysis.expenses}
                currency={report.currency}
                selectedCategoryId={drillCategory}
                onSelectCategory={(id) => {
                  setDrillCategory((prev) => (prev === id ? null : id));
                }}
              />
            </section>

            {/* Top Outflows / Merchants */}
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
                  <h2>Top Spending Destinations</h2>
                  <p>
                    Click any merchant to drill into all purchases from that
                    vendor.
                  </p>
                </div>
              </div>

              {report.merchantInsights.length > 0 ? (
                <div className="merchant-insights-wrap">
                  <h3 className="subheading-small">
                    Highest Outflow Merchants
                  </h3>
                  <ul className="merchant-list">
                    {report.merchantInsights.map((m) => {
                      const isSelected = drillMerchant === m.merchant;
                      return (
                        <li
                          className={`merchant-item interactive ${isSelected ? "selected" : ""}`}
                          key={m.merchant}
                          onClick={() => {
                            setDrillMerchant((prev) =>
                              prev === m.merchant ? null : m.merchant,
                            );
                          }}
                          role="button"
                          tabIndex={0}
                          title="Click to drill down into this merchant's transactions"
                        >
                          <div className="merchant-name-col">
                            <strong>{m.merchant}</strong>
                            <span>
                              {m.transactionCount} purchase
                              {m.transactionCount > 1 ? "s" : ""} · Avg{" "}
                              {formatMoney(
                                m.avgTransactionAmount,
                                report.currency,
                              )}
                            </span>
                          </div>
                          <div className="merchant-val-col">
                            <strong>
                              {formatMoney(m.totalSpent, report.currency)}
                            </strong>
                            <span>
                              {m.percentageOfExpenses}% of spend{" "}
                              {m.delta ? `(${m.delta})` : ""}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="empty-copy">
                  <p>No merchant information recorded for this period.</p>
                </div>
              )}

              {report.topTransactions.length > 0 ? (
                <div className="top-tx-wrap">
                  <h3 className="subheading-small">
                    Largest Individual Expenses
                  </h3>
                  <ul className="top-tx-list">
                    {report.topTransactions.map((tx) => (
                      <li className="top-tx-item" key={tx.id}>
                        <div>
                          <strong>{tx.merchant || tx.categoryName}</strong>
                          <span className="top-tx-sub">
                            {tx.occurredOn} · {tx.categoryName}
                            {tx.description ? ` (${tx.description})` : ""}
                          </span>
                        </div>
                        <strong className="top-tx-amount">
                          {formatMoney(tx.amount, report.currency)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>

          {/* 7. Budget Performance */}
          {report.budgetPerformance.budgets.length > 0 && (
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
                  <h2>Budget Performance in {report.monthLabel}</h2>
                  <p>
                    {report.budgetPerformance.adherenceRate}% adherence rate
                    across {report.budgetPerformance.budgets.length} monitored
                    budgets.
                  </p>
                </div>
              </div>

              <ul className="widget-list">
                {report.budgetPerformance.budgets.map((b) => (
                  <li key={b.id} className="widget-row">
                    <div>
                      <strong>{b.name}</strong>
                      <span>
                        {formatMoney(b.spent, report.currency)} of{" "}
                        {formatMoney(b.budgeted, report.currency)} ({b.percent}
                        %)
                      </span>
                    </div>
                    <div
                      className={`budget-progress ${
                        b.status === "over_budget"
                          ? "alert"
                          : b.status === "warning"
                            ? "warning"
                            : ""
                      }`}
                    >
                      <span style={{ width: `${Math.min(b.percent, 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 8. Interactive Transaction Appendix */}
          <section
            className="panel-card appendix-panel"
            id="transaction-appendix"
          >
            <GlowingEffect
              glow
              disabled={false}
              spread={30}
              proximity={56}
              inactiveZone={0.12}
            />
            <div className="section-heading compact">
              <div>
                <h2>Transaction Appendix</h2>
                <p>
                  Every individual transaction recorded in {report.monthLabel}.
                  Inspect, search, and verify the data behind the report.
                </p>
              </div>

              {/* Active drilldown indicator */}
              {(drillCategory || drillMerchant) && (
                <div className="active-drilldown-chips">
                  {drillCategory && activeCategoryObject && (
                    <span className="drill-chip">
                      Category: {activeCategoryObject.categoryName}
                      <button
                        type="button"
                        onClick={() => setDrillCategory(null)}
                        aria-label="Clear category filter"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                  {drillMerchant && (
                    <span className="drill-chip">
                      Merchant: {drillMerchant}
                      <button
                        type="button"
                        onClick={() => setDrillMerchant(null)}
                        aria-label="Clear merchant filter"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    className="clear-all-drills"
                    onClick={() => {
                      setDrillCategory(null);
                      setDrillMerchant(null);
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Search and Kind filters */}
            <div className="appendix-controls">
              <div className="appendix-search-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search merchant, description, category…"
                  value={appendixSearch}
                  onChange={(e) => setAppendixSearch(e.target.value)}
                  className="appendix-search-input"
                />
              </div>

              <div className="appendix-type-pills">
                <button
                  type="button"
                  className={`appendix-type-btn ${appendixKind === "all" ? "active" : ""}`}
                  onClick={() => setAppendixKind("all")}
                >
                  All ({report.allTransactions.length})
                </button>
                <button
                  type="button"
                  className={`appendix-type-btn ${appendixKind === "expense" ? "active" : ""}`}
                  onClick={() => setAppendixKind("expense")}
                >
                  Expenses ({report.totals.expenseCount})
                </button>
                <button
                  type="button"
                  className={`appendix-type-btn ${appendixKind === "income" ? "active" : ""}`}
                  onClick={() => setAppendixKind("income")}
                >
                  Income ({report.totals.incomeCount})
                </button>
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length > 0 ? (
              <div className="appendix-table-scroll">
                <table className="appendix-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Type</th>
                      <th scope="col">Category</th>
                      <th scope="col">Merchant / Party</th>
                      <th scope="col">Description</th>
                      <th scope="col" className="text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="tx-date-cell">{tx.occurredOn}</td>
                        <td>
                          <span
                            className={`tx-kind-tag ${tx.kind === "income" ? "income" : "expense"}`}
                          >
                            {tx.kind}
                          </span>
                        </td>
                        <td className="tx-cat-cell">
                          <strong>{tx.categoryName}</strong>
                        </td>
                        <td>{tx.merchant || "—"}</td>
                        <td className="tx-desc-cell">
                          {tx.description || "—"}
                        </td>
                        <td
                          className={`tx-amount-cell text-right ${
                            tx.kind === "income" ? "income" : "expense"
                          }`}
                        >
                          {tx.kind === "income" ? "+" : "−"}
                          {formatMoney(tx.amount, report.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-copy">
                <p>No transactions match the selected filters.</p>
              </div>
            )}
          </section>

          {/* Print Watermark / Footer */}
          <footer className="print-report-footer">
            <p>
              Generated by Nivora Financial Intelligence on{" "}
              {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.
              Every calculation is exact, profile-scoped, and verified.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
