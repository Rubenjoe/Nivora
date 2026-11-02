"use client";

import Decimal from "decimal.js";
import { useState } from "react";
import { assignCategoryColors } from "@/lib/finance/category-colors";
import { formatMoney } from "@/lib/finance/money-format";

interface DonutChartProps {
  categories: { name: string; amount: string; categoryId?: string }[];
  total: string;
  currency: string;
  drilldown?: { from: string; to: string };
}

function drillHref(
  drilldown: { from: string; to: string },
  categoryId: string,
) {
  const query = new URLSearchParams({
    from: drilldown.from,
    to: drilldown.to,
    kind: "expense",
    categoryId,
  });
  return `/transactions?${query.toString()}`;
}

export function DonutChart({
  categories,
  total,
  currency,
  drilldown,
}: DonutChartProps) {
  const [activeName, setActiveName] = useState<string | null>(null);
  const totalDec = new Decimal(total);
  const sortedCategories = [...categories].sort((a, b) =>
    new Decimal(b.amount).comparedTo(new Decimal(a.amount)),
  );
  const colors = assignCategoryColors(categories.map((item) => item.name));

  const radius = 70;
  const strokeWidth = 16;
  const gap = 1.6;
  const circumference = 2 * Math.PI * radius;

  const segments = sortedCategories.map((category) => {
    const percentage = totalDec.isZero()
      ? 0
      : new Decimal(category.amount).div(totalDec).mul(100).toNumber();
    const dash = Math.max(0, (percentage / 100) * circumference - gap);
    return {
      ...category,
      percentage,
      dash,
      color: colors[category.name] ?? "var(--chart-cat-1)",
    };
  });

  const segmentsWithOffsets = segments.reduce<{
    offset: number;
    rows: ((typeof segments)[number] & { strokeDashoffset: number })[];
  }>(
    (accumulator, segment) => {
      accumulator.rows.push({
        ...segment,
        strokeDashoffset: -accumulator.offset,
      });
      accumulator.offset += (segment.percentage / 100) * circumference;
      return accumulator;
    },
    { offset: 0, rows: [] },
  ).rows;

  const summary = sortedCategories
    .map(
      (category) =>
        `${category.name} ${formatMoney(category.amount, currency)} (${new Decimal(
          category.amount,
        )
          .div(totalDec.isZero() ? 1 : totalDec)
          .mul(100)
          .toFixed(1)}%)`,
    )
    .join(", ");

  const active = segments.find((segment) => segment.name === activeName);

  return (
    <div
      className="premium-donut-chart"
      role="img"
      aria-label={`Expense category breakdown. ${summary}`}
    >
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--color-border-soft)"
          strokeWidth={strokeWidth}
        />
        {segmentsWithOffsets.map((segment, index) => {
          if (segment.percentage <= 0) return null;
          const segmentTitle = `${segment.name}: ${formatMoney(
            segment.amount,
            currency,
          )} (${segment.percentage.toFixed(1)}%)`;
          const circle = (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="butt"
              transform="rotate(-90)"
              className={`premium-donut-segment${
                activeName === segment.name ? " is-active" : ""
              }`}
              style={{ animationDelay: `${index * 45}ms` }}
              onMouseEnter={() => setActiveName(segment.name)}
              onMouseLeave={() => setActiveName(null)}
            >
              <title>{segmentTitle}</title>
            </circle>
          );
          const href =
            drilldown && segment.categoryId
              ? drillHref(drilldown, segment.categoryId)
              : null;
          if (!href)
            return <g key={segment.categoryId ?? segment.name}>{circle}</g>;
          return (
            <a
              key={segment.categoryId ?? segment.name}
              href={href}
              className="premium-donut-link"
              aria-label={`View ${segmentTitle} transactions`}
              onFocus={() => setActiveName(segment.name)}
              onBlur={() => setActiveName(null)}
            >
              {circle}
            </a>
          );
        })}
      </svg>
      <div className="premium-donut-center">
        <span className="premium-donut-total">
          {formatMoney(active ? active.amount : total, currency)}
        </span>
        <span className="premium-donut-label">
          {active
            ? `${active.name} · ${active.percentage.toFixed(1)}%`
            : "Total expenses"}
        </span>
      </div>
    </div>
  );
}
