"use client";

import { formatMoney } from "@/lib/finance/money-format";
import { assignCategoryColors } from "@/lib/finance/category-colors";
import type { CategoryAnalysisItem } from "@/lib/finance/monthly-report";

export function CategoryBarChart({
  categories,
  currency,
  selectedCategoryId,
  onSelectCategory,
}: {
  categories: CategoryAnalysisItem[];
  currency: string;
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string) => void;
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
          const isSelected = selectedCategoryId === cat.categoryId;

          return (
            <li
              className={`category-bar-item interactive ${isSelected ? "selected" : ""}`}
              key={cat.categoryId}
              onClick={() => onSelectCategory?.(cat.categoryId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCategory?.(cat.categoryId);
                }
              }}
              title="Click to drill down into underlying transactions"
            >
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
                  <span className="category-bar-count">
                    ({cat.transactionCount} txn
                    {cat.transactionCount > 1 ? "s" : ""})
                  </span>
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
                  {cat.transactionCount > 0 && (
                    <span className="cat-avg-tag">
                      {" "}
                      · Avg {formatMoney(cat.avgTransactionAmount, currency)}
                    </span>
                  )}
                </span>
                <span className="category-bar-trend-tag">
                  {cat.budgetStatus === "over_budget" ? (
                    <span className="badge-overbudget">Over Budget</span>
                  ) : cat.budgetStatus === "warning" ? (
                    <span className="badge-warning">Near Budget</span>
                  ) : cat.trend === "decreased" ? (
                    "↓ Reduced"
                  ) : cat.trend === "increased" ? (
                    "↑ Rose"
                  ) : cat.trend === "new" ? (
                    "★ New"
                  ) : (
                    "→ Steady"
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
