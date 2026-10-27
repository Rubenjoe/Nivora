"use client";

import Decimal from "decimal.js";
import { formatMoney } from "@/lib/finance/money-format";

export type ComparisonMetric = {
  label: string;
  currentAmount: string;
  priorAmount: string;
  delta: string | null;
  tone: "income" | "expense" | "cash";
};

export function ComparisonBars({
  metrics,
  currency,
  currentLabel,
  priorLabel,
}: {
  metrics: ComparisonMetric[];
  currency: string;
  currentLabel: string;
  priorLabel: string;
}) {
  const maxVal = metrics.reduce((max, m) => {
    const cur = new Decimal(m.currentAmount).abs();
    const pri = new Decimal(m.priorAmount).abs();
    const local = Decimal.max(cur, pri);
    return local.greaterThan(max) ? local : max;
  }, new Decimal(0));

  return (
    <div className="comparison-bars-container">
      <div className="comparison-bars-grid">
        {metrics.map((m) => {
          const curDec = new Decimal(m.currentAmount);
          const priDec = new Decimal(m.priorAmount);

          const curPct = maxVal.greaterThan(0)
            ? Math.min(
                100,
                Math.max(4, curDec.abs().div(maxVal).mul(100).toNumber()),
              )
            : 0;
          const priPct = maxVal.greaterThan(0)
            ? Math.min(
                100,
                Math.max(4, priDec.abs().div(maxVal).mul(100).toNumber()),
              )
            : 0;

          const toneClass =
            m.tone === "income"
              ? "income"
              : m.tone === "expense"
                ? "expense"
                : "cash";

          return (
            <div className="comparison-card" key={m.label}>
              <div className="comparison-card-header">
                <div>
                  <span className="comparison-card-label">{m.label}</span>
                  <div className="comparison-card-amounts">
                    <strong className={`comparison-val ${toneClass}`}>
                      {formatMoney(m.currentAmount, currency)}
                    </strong>
                    <span className="comparison-prior-val">
                      vs {formatMoney(m.priorAmount, currency)}
                    </span>
                  </div>
                </div>
                {m.delta && (
                  <span
                    className={`comparison-badge ${
                      m.delta.startsWith("+")
                        ? m.tone === "income" || m.tone === "cash"
                          ? "positive"
                          : "negative"
                        : m.tone === "expense"
                          ? "positive"
                          : "negative"
                    }`}
                  >
                    {m.delta}
                  </span>
                )}
              </div>

              {/* Visual Grouped Bar */}
              <div className="comparison-visual-bars">
                {/* Current Bar */}
                <div className="comparison-bar-row">
                  <span className="comparison-bar-tag">
                    {currentLabel.slice(0, 3)}
                  </span>
                  <div className="comparison-track">
                    <div
                      className={`comparison-fill current ${toneClass}`}
                      style={{ width: `${curPct}%` }}
                    />
                  </div>
                </div>

                {/* Prior Bar */}
                <div className="comparison-bar-row">
                  <span className="comparison-bar-tag prior">
                    {priorLabel.slice(0, 3)}
                  </span>
                  <div className="comparison-track">
                    <div
                      className="comparison-fill prior"
                      style={{ width: `${priPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
