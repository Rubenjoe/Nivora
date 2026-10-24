"use client";

import Decimal from "decimal.js";

interface DonutChartProps {
  categories: { name: string; amount: string }[];
  total: string;
  currency: string;
}

export function DonutChart({ categories, total, currency }: DonutChartProps) {
  const colors = [
    "#a995ff",
    "#87b7ff",
    "#70d6b2",
    "#f4c878",
    "#ff897f",
    "#b7bcc9",
  ];

  const colorForCategory = (name: string) => {
    let hash = 0;
    for (const character of name.toLowerCase()) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return colors[hash % colors.length];
  };

  const totalDec = new Decimal(total);
  const valueFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  });
  const sortedCategories = [...categories].sort((a, b) =>
    new Decimal(b.amount).comparedTo(a.amount),
  );

  const segments = sortedCategories.map((cat) => {
    const percentage = totalDec.isZero()
      ? 0
      : new Decimal(cat.amount).div(totalDec).mul(100).toNumber();
    return { ...cat, percentage, color: colorForCategory(cat.name) };
  });

  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  type SegmentWithOffset = (typeof segments)[number] & {
    strokeDasharray: string;
    strokeDashoffset: number;
  };
  const segmentsWithOffsets = segments.reduce<{
    cumulativePercentage: number;
    segments: SegmentWithOffset[];
  }>(
    (result, segment) => {
      result.segments.push({
        ...segment,
        strokeDasharray: `${(segment.percentage / 100) * circumference} ${circumference}`,
        strokeDashoffset:
          (result.cumulativePercentage * circumference * -1) / 100,
      });
      result.cumulativePercentage += segment.percentage;
      return result;
    },
    { cumulativePercentage: 0, segments: [] },
  ).segments;

  return (
    <div
      className="premium-donut-chart"
      role="img"
      aria-label="Expense category breakdown"
    >
      <svg width={180} height={180} viewBox="0 0 180 180">
        <defs>
          <linearGradient
            id="donutGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-violet)" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgb(242 244 247 / 8%)"
          strokeWidth={14}
        />
        {/* Segments */}
        {segmentsWithOffsets.map((segment, index) => {
          if (segment.percentage === 0) return null;
          const { strokeDasharray, strokeDashoffset } = segment;

          return (
            <circle
              key={segment.name}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={14}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              style={{
                animation: `donutDraw 800ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 80}ms both`,
              }}
            >
              <title>{`${segment.name}: ${valueFormatter.format(Number(segment.amount))} (${segment.percentage.toFixed(1)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="premium-donut-center">
        <span className="premium-donut-total">
          {valueFormatter.format(Number(total))}
        </span>
        <span className="premium-donut-label">Total Expenses</span>
      </div>
    </div>
  );
}
