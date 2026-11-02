"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/finance/money-format";
import { spendingIntensity } from "@/lib/finance/chart-data";

export type CalendarDay = {
  date: string;
  amount: string;
  count: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekdayIndex(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 0;
  return (parsed.getUTCDay() + 6) % 7;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function fullDayLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function SpendingCalendar({
  days,
  currency,
  caption,
}: {
  days: CalendarDay[];
  currency: string;
  caption: string;
}) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const maximum = days.reduce(
    (max, day) => Decimal.max(max, new Decimal(day.amount)),
    new Decimal(0),
  );
  const total = days.reduce((sum, day) => sum.plus(day.amount), new Decimal(0));
  const activeCount = days.reduce((sum, day) => sum + day.count, 0);
  const leading = days[0] ? weekdayIndex(days[0].date) : 0;
  const active = activeDate
    ? (days.find((day) => day.date === activeDate) ?? null)
    : null;

  if (!days.length) {
    return (
      <div className="spending-calendar-empty">
        This range has no calendar days to display.
      </div>
    );
  }

  return (
    <figure className="spending-calendar">
      <div className="spending-calendar-head">
        <figcaption className="spending-calendar-caption">{caption}</figcaption>
        <span className="spending-calendar-scale" aria-hidden="true">
          Less
          <i className="spending-level level-1" />
          <i className="spending-level level-2" />
          <i className="spending-level level-3" />
          <i className="spending-level level-4" />
          More
        </span>
      </div>

      <div className="spending-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="spending-calendar-grid" role="group" aria-label={caption}>
        {Array.from({ length: leading }, (_, index) => (
          <span
            key={`leading-${index}`}
            className="spending-day-spacer"
            aria-hidden="true"
          />
        ))}
        {days.map((day) => {
          const hasSpend =
            day.count > 0 && new Decimal(day.amount).isPositive();
          const level = hasSpend
            ? spendingIntensity(day.amount, maximum.toFixed(2))
            : 0;
          const label = `${fullDayLabel(day.date)}: ${
            hasSpend
              ? `${formatMoney(day.amount, currency)} across ${day.count} expense${
                  day.count === 1 ? "" : "s"
                }`
              : "no expenses recorded"
          }`;
          if (!hasSpend) {
            return (
              <span
                key={day.date}
                className="spending-day empty"
                aria-label={label}
                title={label}
              />
            );
          }
          return (
            <Link
              key={day.date}
              href={`/transactions?from=${day.date}&to=${day.date}&kind=expense`}
              className={`spending-day level-${level}`}
              aria-label={`${label}. Open these transactions.`}
              onMouseEnter={() => setActiveDate(day.date)}
              onMouseLeave={() => setActiveDate(null)}
              onFocus={() => setActiveDate(day.date)}
              onBlur={() => setActiveDate(null)}
            >
              <span className="spending-day-number">
                {Number(day.date.slice(-2))}
              </span>
              <span className="spending-day-tooltip" aria-hidden="true">
                <strong>{dayLabel(day.date)}</strong>
                <span>{formatMoney(day.amount, currency)}</span>
                <span>
                  {day.count} expense{day.count === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="spending-calendar-readout" aria-live="polite">
        {active
          ? `${fullDayLabel(active.date)} · ${formatMoney(
              active.amount,
              currency,
            )} across ${active.count} expense${active.count === 1 ? "" : "s"}`
          : `${formatMoney(total.toFixed(2), currency)} across ${activeCount} expense${
              activeCount === 1 ? "" : "s"
            }. Hover or focus a day for its exact figures; select it to open the transactions.`}
      </p>
    </figure>
  );
}
