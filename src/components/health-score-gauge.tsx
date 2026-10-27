"use client";

import type { FinancialHealthReport } from "@/lib/finance/monthly-report";

export function HealthScoreGauge({
  health,
}: {
  health: FinancialHealthReport;
}) {
  const { score, rating, breakdown } = health;

  // Rating colors
  const ratingTone =
    rating === "Exceptional"
      ? "tone-exceptional"
      : rating === "Healthy"
        ? "tone-healthy"
        : rating === "Fair"
          ? "tone-fair"
          : "tone-attention";

  // Semi-circle SVG calculation
  const radius = 60;
  const stroke = 10;
  const circumference = Math.PI * radius; // half circle length
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="health-score-container">
      <div className="health-score-main">
        <div className="health-gauge-svg-wrap">
          <svg
            viewBox="0 0 160 95"
            className="health-gauge-svg"
            role="img"
            aria-label={`Financial Health Score: ${score} out of 100 (${rating})`}
          >
            <defs>
              <linearGradient id="healthScoreGrad" x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="0%"
                  stopColor="var(--color-chart-expense, #ff897f)"
                />
                <stop offset="50%" stopColor="var(--color-gold, #f4c878)" />
                <stop
                  offset="100%"
                  stopColor="var(--color-chart-income, #70d6b2)"
                />
              </linearGradient>
            </defs>
            {/* Background Arc */}
            <path
              d="M 20 85 A 60 60 0 0 1 140 85"
              fill="none"
              stroke="var(--color-border, #2a2e38)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d="M 20 85 A 60 60 0 0 1 140 85"
              fill="none"
              stroke="url(#healthScoreGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="health-gauge-value"
            />
          </svg>
          <div className="health-gauge-center">
            <span className="health-score-digit">{score}</span>
            <span className="health-score-max">/ 100</span>
          </div>
        </div>

        <div className="health-rating-badge-wrap">
          <span className={`health-rating-badge ${ratingTone}`}>{rating}</span>
          <p className="health-rating-description">
            {rating === "Exceptional"
              ? "Your financial metrics this month reflect outstanding discipline, high savings, and controlled outflows."
              : rating === "Healthy"
                ? "Your finances are balanced with steady savings and good budget control."
                : rating === "Fair"
                  ? "A solid baseline, but expenses or budget variances need attention."
                  : "Outflows exceeded targets this month. Focus on reducing discretionary expenses."}
          </p>
        </div>
      </div>

      {/* Sub-scores breakdown */}
      <div className="health-breakdown-grid">
        <div className="health-breakdown-item">
          <div className="health-breakdown-meta">
            <span>Savings Rate</span>
            <strong>{breakdown.savingsRateScore} / 40</strong>
          </div>
          <div className="health-sub-track">
            <div
              className="health-sub-fill"
              style={{ width: `${(breakdown.savingsRateScore / 40) * 100}%` }}
            />
          </div>
        </div>

        <div className="health-breakdown-item">
          <div className="health-breakdown-meta">
            <span>Budget Discipline</span>
            <strong>{breakdown.budgetScore} / 30</strong>
          </div>
          <div className="health-sub-track">
            <div
              className="health-sub-fill"
              style={{ width: `${(breakdown.budgetScore / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="health-breakdown-item">
          <div className="health-breakdown-meta">
            <span>Spending Consistency</span>
            <strong>{breakdown.spendDisciplineScore} / 20</strong>
          </div>
          <div className="health-sub-track">
            <div
              className="health-sub-fill"
              style={{
                width: `${(breakdown.spendDisciplineScore / 20) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="health-breakdown-item">
          <div className="health-breakdown-meta">
            <span>Goal Allocation</span>
            <strong>{breakdown.goalsScore} / 10</strong>
          </div>
          <div className="health-sub-track">
            <div
              className="health-sub-fill"
              style={{ width: `${(breakdown.goalsScore / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
