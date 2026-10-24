"use client";

import Decimal from "decimal.js";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/finance/money-format";

type SeriesPoint = { label: string; income: string; expenses: string };

export function CashFlowChart({
  currency,
  series,
}: {
  currency: string;
  series: SeriesPoint[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const measure = () => {
      const next = node.getBoundingClientRect().width;
      if (next > 0) setWidth(Math.round(next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const height = 236;
  const paddingTop = 20;
  const paddingBottom = 34;
  const paddingLeft = Math.min(64, Math.max(46, width * 0.12));
  const paddingRight = 14;
  const chartWidth = Math.max(40, width - paddingLeft - paddingRight);
  const chartHeight = height - paddingTop - paddingBottom;
  const scale = maxValue.isZero() ? 0 : chartHeight / maxValue.toNumber();
  const baselineY = paddingTop + chartHeight;

  const pointX = (index: number) =>
    series.length === 1
      ? paddingLeft + chartWidth / 2
      : paddingLeft + (index / (series.length - 1)) * chartWidth;

  // Build plotted points once per series. Horizontal control points keep every
  // vertex at its exact value — no smoothing that could imply false trends.
  const buildPoints = (dataKey: "income" | "expenses") =>
    series.map((point, index) => ({
      x: pointX(index),
      y: baselineY - new Decimal(point[dataKey]).mul(scale).toNumber(),
    }));

  const curvePath = (points: { x: number; y: number }[]) => {
    if (points.length === 1) {
      return `M ${points[0]!.x} ${points[0]!.y} L ${points[0]!.x} ${baselineY}`;
    }
    let path = `M ${points[0]!.x} ${points[0]!.y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]!;
      const next = points[i + 1]!;
      const midX = (current.x + next.x) / 2;
      path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const areaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 1) {
      return `M ${points[0]!.x} ${points[0]!.y} L ${points[0]!.x} ${baselineY} Z`;
    }
    return `${curvePath(points)} L ${points.at(-1)!.x} ${baselineY} L ${points[0]!.x} ${baselineY} Z`;
  };

  const incomePoints = buildPoints("income");
  const expensePoints = buildPoints("expenses");
  const incomeCurve = curvePath(incomePoints);
  const expenseCurve = curvePath(expensePoints);

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: maxValue.mul(ratio).toFixed(2),
    y: paddingTop + chartHeight * (1 - ratio),
  }));

  const maxLabels = Math.max(2, Math.floor(chartWidth / 92));
  const labelStep = Math.max(1, Math.ceil(series.length / maxLabels));
  const activePoint = activeIndex === null ? null : series[activeIndex];
  const activeX = activeIndex === null ? 0 : pointX(activeIndex);
  const tooltipLeft = Math.min(82, Math.max(18, (activeX / width) * 100));

  return (
    <div className="premium-cash-flow-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Income versus expenses chart"
        className="premium-cash-flow-chart"
        width={width}
        height={height}
      >
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-chart-income)"
              stopOpacity="0.2"
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
              stopOpacity="0.13"
            />
            <stop
              offset="100%"
              stopColor="var(--color-chart-expense)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <g className="premium-chart-grid">
          {yLabels.map(
            (label, index) =>
              index > 0 && (
                <line
                  key={label.y}
                  x1={paddingLeft}
                  y1={label.y}
                  x2={width - paddingRight}
                  y2={label.y}
                />
              ),
          )}
          <line
            x1={paddingLeft}
            y1={baselineY}
            x2={width - paddingRight}
            y2={baselineY}
            className="premium-chart-baseline"
          />
        </g>

        <g className="premium-chart-axis-labels">
          {yLabels.map((label, index) => (
            <text
              key={label.y}
              x={paddingLeft - 9}
              y={label.y + 4}
              textAnchor="end"
              fontWeight={index === 0 ? 600 : 400}
            >
              {formatMoney(label.value, currency, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </text>
          ))}
        </g>

        <path d={areaPath(incomePoints)} fill="url(#incomeGradient)" />
        <path d={areaPath(expensePoints)} fill="url(#expenseGradient)" />

        <path
          d={incomeCurve}
          fill="none"
          stroke="var(--color-chart-income)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="premium-chart-line"
        />
        <path
          d={expenseCurve}
          fill="none"
          stroke="var(--color-chart-expense)"
          strokeWidth={2.2}
          strokeDasharray="7 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="premium-chart-line"
        />

        {series.map((point, index) => {
          const x = pointX(index);
          const showLabel =
            index % labelStep === 0 || index === series.length - 1;
          const summary = `${point.label}: income ${formatMoney(point.income, currency)}, expenses ${formatMoney(point.expenses, currency)}`;
          return (
            <g key={point.label}>
              {showLabel && (
                <text
                  x={x}
                  y={height - 10}
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === series.length - 1
                        ? "end"
                        : "middle"
                  }
                  className="premium-chart-date"
                >
                  {point.label}
                </text>
              )}
              <circle
                cx={x}
                cy={incomePoints[index]!.y}
                r={4}
                fill="var(--color-chart-income)"
                stroke="var(--color-card-solid)"
                strokeWidth={2}
                className="premium-chart-point"
              />
              <rect
                x={x - 3.5}
                y={expensePoints[index]!.y - 3.5}
                width={7}
                height={7}
                rx={1.5}
                transform={`rotate(45 ${x} ${expensePoints[index]!.y})`}
                fill="var(--color-chart-expense)"
                stroke="var(--color-card-solid)"
                strokeWidth={1.6}
                className="premium-chart-point"
              />
              <rect
                x={x - Math.max(8, chartWidth / series.length / 2)}
                y={paddingTop}
                width={Math.max(16, chartWidth / series.length)}
                height={chartHeight}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={summary}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="premium-chart-hit"
              >
                <title>{summary}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {activePoint && (
        <div
          className="premium-chart-tooltip"
          style={{
            left: `clamp(92px, ${tooltipLeft}%, calc(100% - 92px))`,
          }}
          role="status"
        >
          <span className="premium-chart-tooltip-date">
            {activePoint.label}
          </span>
          <span className="premium-chart-tooltip-row">
            <i
              className="premium-chart-tooltip-key income"
              aria-hidden="true"
            />
            Income
            <strong>{formatMoney(activePoint.income, currency)}</strong>
          </span>
          <span className="premium-chart-tooltip-row">
            <i
              className="premium-chart-tooltip-key expense"
              aria-hidden="true"
            />
            Expenses
            <strong>{formatMoney(activePoint.expenses, currency)}</strong>
          </span>
        </div>
      )}

      <div className="premium-chart-legend">
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
