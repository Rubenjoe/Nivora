"use client";

import Decimal from "decimal.js";

export function CashFlowChart({
  currency,
  series,
}: {
  currency: string;
  series: { label: string; income: string; expenses: string }[];
}) {
  if (!series.length) {
    return (
      <div className="premium-empty premium-empty-compact chart-empty">
        <span
          className="premium-empty-symbol"
          style={{
            background: "var(--color-lavender)",
            color: "var(--color-primary)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        </span>
        <h3>No cash-flow history yet</h3>
        <p>
          Your income and expense trend will appear once transactions exist.
        </p>
      </div>
    );
  }

  const maxValue = series.reduce((max, point) => {
    const income = new Decimal(point.income);
    const expenses = new Decimal(point.expenses);
    const localMax = Decimal.max(income, expenses);
    return localMax.greaterThan(max) ? localMax : max;
  }, new Decimal(0));

  const height = 210;
  const paddingY = 24;
  const paddingX = 64;
  const width = 760;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY - 40;
  const scale = maxValue.isZero() ? 1 : chartHeight / maxValue.toNumber();
  const axisFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const valueFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  });
  const pointX = (index: number) =>
    series.length === 1
      ? width / 2
      : paddingX + (index / (series.length - 1)) * chartWidth;

  const baselineY = paddingY + chartHeight;

  // Build plotted points once per series. Horizontal control points keep every
  // vertex at its exact value — no smoothing that could imply false trends.
  const buildPoints = (dataKey: "income" | "expenses") =>
    series.map((point, index) => {
      const x = pointX(index);
      const value = new Decimal(point[dataKey]).mul(scale).toNumber();
      return { x, y: baselineY - value };
    });

  const curvePath = (points: { x: number; y: number }[]) => {
    if (points.length === 1) {
      // A single entry still reads as a value: drop a stem to the baseline.
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${baselineY}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const areaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${baselineY} Z`;
    }
    // Close along the baseline so the fill covers the area under the curve.
    return `${curvePath(points)} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
  };

  const incomePoints = buildPoints("income");
  const expensePoints = buildPoints("expenses");
  const incomeCurve = curvePath(incomePoints);
  const expenseCurve = curvePath(expensePoints);
  const incomeArea = areaPath(incomePoints);
  const expenseArea = areaPath(expensePoints);

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = maxValue.mul(ratio).toFixed(2);
    const y = paddingY + chartHeight * (1 - ratio);
    return { value, y };
  });

  return (
    <div className="premium-cash-flow-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Income versus expenses chart"
        className="premium-cash-flow-chart"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-chart-income)"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="var(--color-chart-income)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-chart-expense)"
              stopOpacity="0.14"
            />
            <stop
              offset="100%"
              stopColor="var(--color-chart-expense)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <g className="premium-chart-grid" strokeWidth="0.5">
          {yLabels.map(
            (label, i) =>
              i > 0 && (
                <line
                  key={i}
                  x1={paddingX}
                  y1={label.y}
                  x2={width - paddingX + 18}
                  y2={label.y}
                  strokeDasharray="4 4"
                />
              ),
          )}
        </g>

        {/* Y-axis labels */}
        <g
          fontSize="11"
          fill="var(--color-text-secondary)"
          fontFamily="Avenir Next, Avenir, Segoe UI, sans-serif"
        >
          {yLabels.map((label, i) => (
            <text
              key={i}
              x={paddingX - 10}
              y={label.y + 4}
              textAnchor="end"
              fontWeight={i === 0 ? "600" : "400"}
            >
              {axisFormatter.format(Number(label.value))}
            </text>
          ))}
        </g>

        {/* Income area */}
        <path d={incomeArea} fill="url(#incomeGradient)" />

        {/* Expense area */}
        <path d={expenseArea} fill="url(#expenseGradient)" />

        {/* Income line */}
        <path
          d={incomeCurve}
          fill="none"
          stroke="var(--color-chart-income)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="premium-chart-line"
        />

        {/* Expense line */}
        <path
          d={expenseCurve}
          fill="none"
          stroke="var(--color-chart-expense)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="premium-chart-line"
        />

        {/* Data points */}
        {series.map((point, index) => {
          const x = pointX(index);
          const incomeY =
            paddingY +
            chartHeight -
            new Decimal(point.income).mul(scale).toNumber();
          const expenseY =
            paddingY +
            chartHeight -
            new Decimal(point.expenses).mul(scale).toNumber();

          return (
            <g key={point.label}>
              <title>
                {`${point.label}: income ${valueFormatter.format(Number(point.income))}, expenses ${valueFormatter.format(Number(point.expenses))}`}
              </title>
              {/* Income point */}
              <circle
                cx={x}
                cy={incomeY}
                r={4.5}
                fill="var(--color-chart-income)"
                stroke="var(--color-card-solid)"
                strokeWidth={2}
                className="premium-chart-point"
              />
              {/* Expense point */}
              <circle
                cx={x}
                cy={expenseY}
                r={4.5}
                fill="var(--color-chart-expense)"
                stroke="var(--color-card-solid)"
                strokeWidth={2}
                className="premium-chart-point"
              />
              {/* X-axis label */}
              {(index % Math.max(1, Math.ceil(series.length / 6)) === 0 ||
                index === series.length - 1) && (
                <text
                  x={x}
                  y={height - 6}
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === series.length - 1
                        ? "end"
                        : "middle"
                  }
                  fontSize="11"
                  fill="var(--color-text-secondary)"
                  fontFamily="Avenir Next, Avenir, Segoe UI, sans-serif"
                >
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="premium-chart-legend">
        <span>
          <span
            className="premium-legend-dot"
            style={{ background: "var(--color-chart-income)" }}
          />
          Income
        </span>
        <span>
          <span
            className="premium-legend-dot"
            style={{ background: "var(--color-chart-expense)" }}
          />
          Expenses
        </span>
      </div>
    </div>
  );
}
