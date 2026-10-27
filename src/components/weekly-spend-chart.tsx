"use client";

import Decimal from "decimal.js";
import { formatMoney } from "@/lib/finance/money-format";
import type { WeeklySpendItem } from "@/lib/finance/monthly-report";

export function WeeklySpendChart({
  weeks,
  currency,
}: {
  weeks: WeeklySpendItem[];
  currency: string;
}) {
  const maxAmount = weeks.reduce((max, w) => {
    const exp = new Decimal(w.expenses);
    const inc = new Decimal(w.income);
    const local = Decimal.max(exp, inc);
    return local.greaterThan(max) ? local : max;
  }, new Decimal(0));

  if (!weeks.length) {
    return (
      <div className="empty-copy">
        <p>No weekly data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="weekly-spend-container">
      <div className="weekly-bars-grid">
        {weeks.map((week) => {
          const expDec = new Decimal(week.expenses);
          const incDec = new Decimal(week.income);

          const expHeight = maxAmount.greaterThan(0)
            ? Math.max(4, Math.round(expDec.div(maxAmount).mul(100).toNumber()))
            : 0;
          const incHeight = maxAmount.greaterThan(0)
            ? Math.max(4, Math.round(incDec.div(maxAmount).mul(100).toNumber()))
            : 0;

          return (
            <div className="weekly-bar-column" key={week.weekNumber}>
              <div className="weekly-bars-track">
                {/* Income Bar */}
                <div
                  className="weekly-bar income"
                  style={{ height: `${incHeight}%` }}
                  title={`Income: ${formatMoney(week.income, currency)}`}
                />
                {/* Expense Bar */}
                <div
                  className="weekly-bar expense"
                  style={{ height: `${expHeight}%` }}
                  title={`Expenses: ${formatMoney(week.expenses, currency)}`}
                />
              </div>

              <div className="weekly-column-labels">
                <span className="weekly-col-name">W{week.weekNumber}</span>
                <span className="weekly-col-val">
                  {formatMoney(week.expenses, currency, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="weekly-col-dates">
                  {week.from.slice(8)}–{week.to.slice(8)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="weekly-chart-legend">
        <span>
          <i className="premium-legend-swatch income" aria-hidden="true" />
          Income
        </span>
        <span>
          <i className="premium-legend-swatch expense" aria-hidden="true" />
          Expenses
        </span>
      </div>
    </div>
  );
}
