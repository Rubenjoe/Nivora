"use client";

import Decimal from "decimal.js";
import { formatMoney } from "@/lib/finance/money-format";
import { assignCategoryColors } from "@/lib/finance/category-colors";
import type { CategoryAnalysisItem } from "@/lib/finance/monthly-report";

export function CategoryBarChart({
  categories,
  currency,
  totalExpenses,
}: {
  categories: CategoryAnalysisItem[];
  currency: string;
  totalExpenses: string;
}) {
  const categoryNames = categories.map((c) => c.categoryName);
  const colors = assignCategoryColors(categoryNames);

  const maxCategorySpend = categories.reduce(
    (max, c) =>
      Math.max(max, parseFloat(c.currentAmount), parseFloat(c.priorAmount)),
    0,
  );

  if (!categories.length) {
    return (
      <div className="empty-copy">
        <p>No category expenses recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="category-bars-container">
      <ul className="category-bars-list">
        {categories.map((cat) => {
          const curVal = parseFloat(cat.currentAmount);
          const priVal = parseFloat(cat.priorAmount);
          const barWidth =
            maxCategorySpend > 0 ? (curVal / maxCategorySpend) * 100 : 0;
          const priorWidth =
            maxCategorySpend > 0 ? (priVal / maxCategorySpend) * 100 : 0;
          const catColor = colors[cat.categoryName] ?? "var(--chart-cat-1)";

          return (
            <li className="category-bar-item" key={cat.categoryId}>
              <div className="category-bar-header">
                <div className="category-bar-identity">
                  <span
                    className="category-bar-dot"
                    style={{ background: catColor }}
                    aria-hidden="true"
                  />
                  <strong className="category-bar-title">
                    {cat.categoryName}
                  </strong>
                </div>

                <div className="category-bar-numbers">
                  <span className="category-bar-amount">
                    {formatMoney(cat.currentAmount, currency)}
                  </span>
                  <span className="category-bar-share">
                    ({cat.percentageOfTotal}%)
                  </span>
                  {cat.delta && (
                    <span
                      className={`category-bar-delta ${
                        cat.trend === "decreased"
                          ? "positive"
                          : cat.trend === "increased"
                            ? "negative"
                            : "neutral"
                      }`}
                    >
                      {cat.delta}
                    </span>
                  )}
                </div>
              </div>

              {/* Stacked / Comparison Track */}
              <div className="category-dual-track">
                {/* Prior baseline marker */}
                {priVal > 0 && (
                  <div
                    className="category-prior-marker"
                    style={{ left: `${Math.min(100, priorWidth)}%` }}
                    title={`Prior: ${formatMoney(cat.priorAmount, currency)}`}
                  />
                )}
                {/* Current Spend Fill */}
                <div
                  className="category-current-fill"
                  style={{
                    width: `${Math.min(100, barWidth)}%`,
                    background: catColor,
                  }}
                />
              </div>

              <div className="category-bar-footer">
                <span className="category-bar-prior-text">
                  {priVal > 0
                    ? `Prior: ${formatMoney(cat.priorAmount, currency)}`
                    : "No prior spend"}
                </span>
                <span className="category-bar-trend-tag">
                  {cat.trend === "decreased"
                    ? "↓ Reduced"
                    : cat.trend === "increased"
                      ? "↑ Rose"
                      : cat.trend === "new"
                        ? "★ New"
                        : "→ Steady"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
