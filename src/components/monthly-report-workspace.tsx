"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Info,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SmokeType } from "@/components/ui/smoke-type";
import { formatMoney } from "@/lib/finance/money-format";
import { ComparisonBars } from "@/components/comparison-bars";
import { VelocitySpendChart } from "@/components/velocity-spend-chart";
import { CategoryBarChart } from "@/components/category-bar-chart";
import { HealthScoreGauge } from "@/components/health-score-gauge";
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
                  if (e.target.value) setSelectedMonth(e.target.value);
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
                  : "No prior month income"}
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
                  : "No prior month expenses"}
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

            {/* Savings Rate */}
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
                {report.comparison.savingsRateDelta !== 0
                  ? `${report.comparison.savingsRateDelta > 0 ? "+" : ""}${report.comparison.savingsRateDelta}% pts vs prior`
                  : "Target benchmark: 20%+"}
              </p>
            </article>
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

          {/* 5. Category Breakdown & Top Merchants */}
          <div className="dashboard-panels report-double-panel">
            {/* Category Breakdown */}
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
                  <h2>Category Analysis</h2>
                  <p>
                    Category allocations and shift versus{" "}
                    {report.priorMonthLabel}.
                  </p>
                </div>
              </div>

              <CategoryBarChart
                categories={report.categoryAnalysis.expenses}
                currency={report.currency}
                totalExpenses={report.totals.expenses}
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
                  <p>Merchants and major single transactions.</p>
                </div>
              </div>

              {report.merchantInsights.length > 0 ? (
                <div className="merchant-insights-wrap">
                  <h3 className="subheading-small">
                    Highest Outflow Merchants
                  </h3>
                  <ul className="merchant-list">
                    {report.merchantInsights.map((m) => (
                      <li className="merchant-item" key={m.merchant}>
                        <div className="merchant-name-col">
                          <strong>{m.merchant}</strong>
                          <span>
                            {m.transactionCount} transaction
                            {m.transactionCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="merchant-val-col">
                          <strong>
                            {formatMoney(m.totalSpent, report.currency)}
                          </strong>
                          <span>{m.percentageOfExpenses}% of spend</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

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

          {/* 6. Budget & Goal Performance */}
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
