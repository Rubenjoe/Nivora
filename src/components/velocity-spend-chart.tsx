"use client";

import Decimal from "decimal.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatMoney } from "@/lib/finance/money-format";
import type { DailyVelocityItem } from "@/lib/finance/monthly-report";

export function VelocitySpendChart({
  series,
  currency,
  currentMonthLabel,
  priorMonthLabel,
}: {
  series: DailyVelocityItem[];
  currency: string;
  currentMonthLabel: string;
  priorMonthLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

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

  const chartData = useMemo(() => {
    if (!series.length) return null;

    const maxVal = series.reduce((max, point) => {
      const cur = new Decimal(point.currentCumulativeSpend);
      const pri = new Decimal(point.priorCumulativeSpend);
      const local = Decimal.max(cur, pri);
      return local.greaterThan(max) ? local : max;
    }, new Decimal(0));

    const height = 240;
    const paddingTop = 24;
    const paddingBottom = 34;
    const paddingLeft = Math.min(68, Math.max(48, width * 0.12));
    const paddingRight = 16;
    const chartWidth = Math.max(40, width - paddingLeft - paddingRight);
    const chartHeight = height - paddingTop - paddingBottom;
    const scale = maxVal.isZero() ? 0 : chartHeight / maxVal.toNumber();
    const baselineY = paddingTop + chartHeight;

    const pointX = (index: number) =>
      series.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (index / (series.length - 1)) * chartWidth;

    const curPoints = series.map((pt, i) => ({
      x: pointX(i),
      y:
        baselineY -
        new Decimal(pt.currentCumulativeSpend).mul(scale).toNumber(),
    }));

    const priPoints = series.map((pt, i) => ({
      x: pointX(i),
      y: baselineY - new Decimal(pt.priorCumulativeSpend).mul(scale).toNumber(),
    }));

    const buildCurve = (points: { x: number; y: number }[]) => {
      if (!points.length) return "";
      if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
      let p = `M ${points[0]!.x} ${points[0]!.y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const c = points[i]!;
        const n = points[i + 1]!;
        const midX = (c.x + n.x) / 2;
        p += ` C ${midX} ${c.y}, ${midX} ${n.y}, ${n.x} ${n.y}`;
      }
      return p;
    };

    const buildArea = (points: { x: number; y: number }[]) => {
      if (!points.length) return "";
      return `${buildCurve(points)} L ${points.at(-1)!.x} ${baselineY} L ${points[0]!.x} ${baselineY} Z`;
    };

    const yTicks = [0, 0.33, 0.66, 1].map((r) => ({
      val: maxVal.mul(r).toFixed(2),
      y: paddingTop + chartHeight * (1 - r),
    }));

    return {
      height,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      chartWidth,
      chartHeight,
      baselineY,
      pointX,
      curPoints,
      priPoints,
      curCurve: buildCurve(curPoints),
      priCurve: buildCurve(priPoints),
      curArea: buildArea(curPoints),
      yTicks,
    };
  }, [series, width]);

  if (!chartData) {
    return (
      <div className="premium-empty premium-empty-compact">
        <p>No cumulative velocity data available.</p>
      </div>
    );
  }

  const {
    height,
    paddingTop,
    paddingLeft,
    paddingRight,
    chartWidth,
    chartHeight,
    baselineY,
    pointX,
    curPoints,
    priPoints,
    curCurve,
    priCurve,
    curArea,
    yTicks,
  } = chartData;

  const activePoint =
    activeIndex !== null && activeIndex < series.length
      ? series[activeIndex]
      : null;
  const activeX = activeIndex !== null ? pointX(activeIndex) : 0;
  const tooltipLeft = Math.min(80, Math.max(20, (activeX / width) * 100));

  const handlePointer = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const localX = ((e.clientX - rect.left) * width) / rect.width;
    const clampedX = Math.max(
      paddingLeft,
      Math.min(width - paddingRight, localX),
    );
    const ratio = (clampedX - paddingLeft) / chartWidth;
    const idx = Math.min(
      series.length - 1,
      Math.max(0, Math.round(ratio * (series.length - 1))),
    );
    setActiveIndex(idx);
  };

  return (
    <div className="velocity-chart-wrapper" ref={wrapRef}>
      <div className="chart-header-actions">
        <button
          type="button"
          className="chart-accessible-toggle"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
        >
          {showTable ? "View Chart" : "View Accessible Table"}
        </button>
      </div>

      {showTable ? (
        <div className="accessible-chart-table-wrap">
          <table className="accessible-data-table">
            <caption className="sr-only">
              Cumulative spending velocity comparison between{" "}
              {currentMonthLabel} and {priorMonthLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Date</th>
                <th scope="col">Daily Spend ({currency})</th>
                <th scope="col">
                  {currentMonthLabel} Cumulative ({currency})
                </th>
                <th scope="col">
                  {priorMonthLabel} Cumulative ({currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((item) => (
                <tr key={item.day}>
                  <td>Day {item.day}</td>
                  <td>{item.date}</td>
                  <td>{formatMoney(item.currentDailySpend, currency)}</td>
                  <td>{formatMoney(item.currentCumulativeSpend, currency)}</td>
                  <td>{formatMoney(item.priorCumulativeSpend, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Cumulative spending velocity curve comparing ${currentMonthLabel} against ${priorMonthLabel}`}
            className="premium-cash-flow-chart velocity-svg-chart"
            width={width}
            height={height}
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="velocityCurGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary, #a995ff)"
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary, #a995ff)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <g className="premium-chart-grid">
              {yTicks.map(
                (tick, i) =>
                  i > 0 && (
                    <line
                      key={tick.y}
                      x1={paddingLeft}
                      y1={tick.y}
                      x2={width - paddingRight}
                      y2={tick.y}
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

            {/* Y axis labels */}
            <g className="premium-chart-axis-labels">
              {yTicks.map((tick) => (
                <text
                  key={tick.y}
                  x={paddingLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="var(--color-text, #f3f2f7)"
                  fontSize={11.5}
                  fontWeight={500}
                >
                  {formatMoney(tick.val, currency, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </text>
              ))}
            </g>

            {/* Prior Month Curve (Dashed) */}
            <path
              d={priCurve}
              fill="none"
              stroke="var(--color-muted, #717585)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />

            {/* Current Month Area & Curve */}
            <path d={curArea} fill="url(#velocityCurGrad)" />
            <path
              d={curCurve}
              fill="none"
              stroke="var(--color-primary, #a995ff)"
              strokeWidth={2.6}
              strokeLinecap="round"
            />

            {/* Active pointer guide */}
            {activeIndex !== null && (
              <line
                x1={activeX}
                y1={paddingTop}
                x2={activeX}
                y2={baselineY}
                stroke="var(--color-primary, #a995ff)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}

            {/* Day ticks along X */}
            {series.map((item, idx) => {
              const x = pointX(idx);
              const show =
                idx === 0 ||
                idx === 6 ||
                idx === 14 ||
                idx === 21 ||
                idx === series.length - 1;
              return (
                <g key={item.day}>
                  {show && (
                    <text
                      x={x}
                      y={height - 10}
                      textAnchor={
                        idx === 0
                          ? "start"
                          : idx === series.length - 1
                            ? "end"
                            : "middle"
                      }
                      className="premium-chart-date"
                      fill="var(--color-text, #f3f2f7)"
                      fontSize={11}
                      fontWeight={500}
                    >
                      Day {item.day}
                    </text>
                  )}
                  {activeIndex === idx && (
                    <>
                      <circle
                        cx={x}
                        cy={curPoints[idx]!.y}
                        r={5}
                        fill="var(--color-primary, #a995ff)"
                        stroke="var(--color-card-solid, #141419)"
                        strokeWidth={2}
                      />
                      <circle
                        cx={x}
                        cy={priPoints[idx]!.y}
                        r={4}
                        fill="var(--color-muted, #717585)"
                        stroke="var(--color-card-solid, #141419)"
                        strokeWidth={2}
                      />
                    </>
                  )}
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
                Day {activePoint.day} ({activePoint.date})
              </span>
              <span className="premium-chart-tooltip-row">
                <i
                  className="premium-chart-tooltip-key"
                  style={{ background: "var(--color-primary, #a995ff)" }}
                  aria-hidden="true"
                />
                {currentMonthLabel} Spend:
                <strong>
                  {formatMoney(activePoint.currentCumulativeSpend, currency)}
                </strong>
              </span>
              <span className="premium-chart-tooltip-row">
                <i
                  className="premium-chart-tooltip-key"
                  style={{ background: "var(--color-muted, #717585)" }}
                  aria-hidden="true"
                />
                {priorMonthLabel} Pace:
                <strong>
                  {formatMoney(activePoint.priorCumulativeSpend, currency)}
                </strong>
              </span>
              <span className="premium-chart-tooltip-note">
                Daily: {formatMoney(activePoint.currentDailySpend, currency)}
              </span>
            </div>
          )}

          <div className="premium-chart-legend">
            <span>
              <i
                className="premium-legend-swatch"
                style={{ background: "var(--color-primary, #a995ff)" }}
                aria-hidden="true"
              />
              {currentMonthLabel} (Cumulative)
            </span>
            <span>
              <i
                className="premium-legend-swatch"
                style={{
                  background: "var(--color-muted, #717585)",
                  borderTop: "2px dashed #999",
                }}
                aria-hidden="true"
              />
              {priorMonthLabel} (Pace)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
