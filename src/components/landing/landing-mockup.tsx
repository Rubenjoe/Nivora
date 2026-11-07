"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import {
  Briefcase,
  Car,
  Coffee,
  ShoppingBasket,
  Tv,
  Utensils,
} from "lucide-react";

/**
 * LandingMockup — the product surface of the landing page.
 *
 * Everything is drawn with plain markup, SVG, and CSS: no screenshots, no
 * image requests, crisp at every DPI, and it inherits the live design
 * tokens. All figures are illustrative samples formatted with the same
 * `en-IN` grouping the app uses (see `src/lib/finance/money-format.ts`).
 */

const inr = new Intl.NumberFormat("en-IN");

/** Exposes a ref plus a one-way `active` flag once in view. */
function useActive<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const active = useInView(ref, { once: true, margin: "-12% 0px" });
  return { ref, active };
}

/* --------------------------------------------------------------------------
 * Dashboard mockup — hero centrepiece
 * ------------------------------------------------------------------------ */

const CASH_FLOW_PATH =
  "M0 152 C 32 146, 52 128, 84 124 C 116 120, 132 142, 164 136 C 196 130, 214 96, 246 92 C 278 88, 296 112, 328 106 C 360 100, 378 66, 410 62 C 442 58, 460 86, 492 76 C 518 68, 542 48, 560 42";

const CATEGORIES: Array<{
  label: string;
  amount: number;
  color: string;
  share: number;
}> = [
  { label: "Groceries", amount: 11420, color: "#7ed7b2", share: 33.7 },
  { label: "Dining", amount: 7380, color: "#d6b779", share: 21.8 },
  { label: "Transport", amount: 5370, color: "#88b9ec", share: 15.9 },
  { label: "Subscriptions", amount: 5030, color: "#f18782", share: 14.8 },
  { label: "Everything else", amount: 4680, color: "#7fc8c8", share: 13.8 },
];

export function DashboardMockup({ className }: { className?: string }) {
  const { ref, active } = useActive<HTMLDivElement>();

  // Donut geometry — sweep segments around one circle (no mutation).
  const R = 44;
  const CIRC = 2 * Math.PI * R;
  const segments = CATEGORIES.map((c, i) => ({
    ...c,
    dash: (c.share / 100) * CIRC,
    offset: CATEGORIES.slice(0, i).reduce(
      (sum, x) => sum + (x.share / 100) * CIRC,
      0,
    ),
  }));

  return (
    <div
      ref={ref}
      className={["nl-mock", className].filter(Boolean).join(" ")}
      data-active={active || undefined}
      role="img"
      aria-label="Illustrative preview of the Nivora dashboard with net cash flow, income and expense metrics, a cash-flow chart, and top spending categories."
    >
      {/* Chrome */}
      <div className="nl-mock-bar">
        <div className="nl-mock-brand">
          <span className="nl-mock-logo" aria-hidden="true">
            <i /> <i /> <i /> <i />
          </span>
          <span className="nl-mock-word">nivora</span>
        </div>
        <nav className="nl-mock-nav" aria-hidden="true">
          <span className="nl-mock-tab is-active">Dashboard</span>
          <span className="nl-mock-tab">Transactions</span>
          <span className="nl-mock-tab">Budgets</span>
          <span className="nl-mock-tab">Analytics</span>
          <span className="nl-mock-tab">Goals</span>
        </nav>
        <div className="nl-mock-tools" aria-hidden="true">
          <span className="nl-mock-dot" />
          <span className="nl-mock-avatar">NV</span>
        </div>
      </div>

      {/* Greeting row */}
      <div className="nl-mock-head">
        <div>
          <p className="nl-mock-kicker">ILLUSTRATIVE · NOVEMBER 2026</p>
          <p className="nl-mock-greet">Good evening, Explorer</p>
        </div>
        <span className="nl-mock-pill">This month</span>
      </div>

      {/* Metric cards */}
      <div className="nl-mock-metrics">
        <div
          className="nl-mock-metric"
          style={{ "--accent": "#a995ff" } as React.CSSProperties}
        >
          <span className="nl-mock-metric-label">Net cash flow</span>
          <span className="nl-mock-metric-value">+₹{inr.format(18420)}</span>
          <span className="nl-mock-metric-chip is-up">+12.4%</span>
          <svg
            className="nl-mock-spark"
            viewBox="0 0 96 26"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <path d="M0 20 C 12 18, 18 12, 30 13 C 42 14, 50 8, 62 7 C 74 6, 84 4, 96 2" />
          </svg>
        </div>
        <div
          className="nl-mock-metric"
          style={{ "--accent": "#7ed7b2" } as React.CSSProperties}
        >
          <span className="nl-mock-metric-label">Income</span>
          <span className="nl-mock-metric-value">₹{inr.format(52300)}</span>
          <span className="nl-mock-metric-chip is-up">+₹4,200</span>
          <svg
            className="nl-mock-spark"
            viewBox="0 0 96 26"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <path d="M0 22 C 14 21, 24 16, 36 17 C 48 18, 58 10, 70 9 C 80 8, 90 5, 96 4" />
          </svg>
        </div>
        <div
          className="nl-mock-metric"
          style={{ "--accent": "#f18782" } as React.CSSProperties}
        >
          <span className="nl-mock-metric-label">Expenses</span>
          <span className="nl-mock-metric-value">₹{inr.format(33880)}</span>
          <span className="nl-mock-metric-chip is-down">−6.1%</span>
          <svg
            className="nl-mock-spark"
            viewBox="0 0 96 26"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <path d="M0 8 C 12 10, 22 16, 34 14 C 46 12, 56 18, 68 17 C 80 16, 90 21, 96 22" />
          </svg>
        </div>
      </div>

      {/* Chart + insights */}
      <div className="nl-mock-grid">
        <div className="nl-mock-chart">
          <div className="nl-mock-card-head">
            <span>Cash flow</span>
            <span className="nl-mock-legend">
              <i style={{ background: "#7ed7b2" }} /> Income
              <i style={{ background: "#f18782" }} /> Expenses
            </span>
          </div>
          <div className="nl-mock-chart-body">
            <svg
              className="nl-mock-line"
              viewBox="0 0 560 200"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="nlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a995ff" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#a995ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="nlStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5d4ac4" />
                  <stop offset="55%" stopColor="#a995ff" />
                  <stop offset="100%" stopColor="#88b9ec" />
                </linearGradient>
              </defs>
              {[40, 80, 120, 160].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="560"
                  y2={y}
                  stroke="rgba(244,241,236,0.06)"
                  strokeWidth="1"
                />
              ))}
              <path
                className="nl-mock-area"
                d={`${CASH_FLOW_PATH} L 560 200 L 0 200 Z`}
                fill="url(#nlFill)"
              />
              <path
                className="nl-mock-draw"
                d={CASH_FLOW_PATH}
                fill="none"
                stroke="url(#nlStroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
              />
              <path
                className="nl-mock-path-2"
                d="M0 168 C 36 166, 56 158, 88 160 C 120 162, 140 172, 172 168 C 204 164, 224 150, 256 152 C 288 154, 306 164, 338 160 C 370 156, 390 142, 422 144 C 454 146, 472 138, 504 132 C 530 127, 548 122, 560 118"
                fill="none"
                stroke="#f18782"
                strokeWidth="1.6"
                strokeDasharray="5 6"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
          </div>
          <div className="nl-mock-axis" aria-hidden="true">
            <span>Nov 1</span>
            <span>Nov 8</span>
            <span>Nov 15</span>
            <span>Nov 22</span>
            <span>Nov 29</span>
          </div>
        </div>

        <div className="nl-mock-insights">
          <div className="nl-mock-card-head">
            <span>Top categories</span>
          </div>
          <div className="nl-mock-donut-row">
            <svg
              className="nl-mock-donut"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="rgba(244,241,236,0.05)"
                strokeWidth="12"
              />
              {segments.map((s, i) => (
                <circle
                  key={s.label}
                  className="nl-mock-seg"
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="12"
                  strokeLinecap="butt"
                  strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                  strokeDashoffset={-s.offset}
                  transform="rotate(-90 60 60)"
                  style={{ transitionDelay: `${i * 110}ms` }}
                />
              ))}
            </svg>
            <div className="nl-mock-donut-center" aria-hidden="true">
              <strong>₹33,880</strong>
              <span>this month</span>
            </div>
          </div>
          <ul className="nl-mock-legend-list">
            {CATEGORIES.map((c, i) => (
              <li key={c.label} style={{ transitionDelay: `${i * 90}ms` }}>
                <i style={{ background: c.color }} />
                <span className="nl-mock-legend-name">{c.label}</span>
                <span className="nl-mock-legend-amount">
                  ₹{inr.format(c.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <span className="nl-mock-note">Illustrative sample data</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Story panels — sticky scroll section
 * ------------------------------------------------------------------------ */

const TXNS: Array<{
  icon: typeof Coffee;
  merchant: string;
  meta: string;
  amount: string;
  positive?: boolean;
}> = [
  {
    icon: Briefcase,
    merchant: "Salary — Northwind",
    meta: "Income",
    amount: "+₹52,300",
    positive: true,
  },
  {
    icon: ShoppingBasket,
    merchant: "BigBasket",
    meta: "Groceries",
    amount: "−₹2,840",
  },
  { icon: Utensils, merchant: "Zomato", meta: "Dining", amount: "−₹460" },
  { icon: Car, merchant: "Uber", meta: "Transport", amount: "−₹212" },
  { icon: Tv, merchant: "Netflix", meta: "Subscriptions", amount: "−₹649" },
  { icon: Coffee, merchant: "Blue Tokai", meta: "Dining", amount: "−₹340" },
];

export function StoryTransactions({ active }: { active: boolean }) {
  return (
    <div className="nl-story-panel" data-active={active || undefined}>
      <div className="nl-story-panel-head">
        <span className="nl-story-panel-title">Transactions</span>
        <span className="nl-story-panel-pill">November</span>
      </div>
      <ul className="nl-txn-list">
        {TXNS.map((t, i) => (
          <li key={t.merchant} style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="nl-txn-icon">
              <t.icon size={15} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="nl-txn-name">
              {t.merchant}
              <em>{t.meta}</em>
            </span>
            <span
              className={t.positive ? "nl-txn-amount is-up" : "nl-txn-amount"}
            >
              {t.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoryAnalytics({ active }: { active: boolean }) {
  return (
    <div className="nl-story-panel" data-active={active || undefined}>
      <div className="nl-story-panel-head">
        <span className="nl-story-panel-title">Spending by week</span>
        <span className="nl-story-panel-pill">Analytics</span>
      </div>
      <div className="nl-story-bars" aria-hidden="true">
        {[
          { h: 46, d: 0 },
          { h: 72, d: 70 },
          { h: 58, d: 140 },
          { h: 88, d: 210 },
          { h: 64, d: 280 },
        ].map((b, i) => (
          <span
            key={i}
            className={i === 3 ? "is-peak" : undefined}
            style={
              {
                height: `${b.h}%`,
                transitionDelay: `${b.d}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="nl-story-bar-labels" aria-hidden="true">
        <span>W1</span>
        <span>W2</span>
        <span>W3</span>
        <span>W4</span>
        <span>W5</span>
      </div>
      <div className="nl-story-stat-row">
        <div>
          <strong>₹33,880</strong>
          <span>Total spend</span>
        </div>
        <div>
          <strong className="is-up">−6.1%</strong>
          <span>vs October</span>
        </div>
        <div>
          <strong>12</strong>
          <span>Categories</span>
        </div>
      </div>
    </div>
  );
}

const BUDGETS: Array<{
  label: string;
  used: string;
  pct: number;
  over?: boolean;
}> = [
  { label: "Groceries", used: "₹11,420 / ₹15,000", pct: 76 },
  { label: "Dining", used: "₹6,800 / ₹8,000", pct: 85 },
  { label: "Transport", used: "₹4,200 / ₹5,000", pct: 84 },
  { label: "Subscriptions", used: "₹2,150 / ₹1,500", pct: 143, over: true },
];

export function StoryBudgets({ active }: { active: boolean }) {
  return (
    <div className="nl-story-panel" data-active={active || undefined}>
      <div className="nl-story-panel-head">
        <span className="nl-story-panel-title">Budgets</span>
        <span className="nl-story-panel-pill">3 on track</span>
      </div>
      <ul className="nl-budget-list">
        {BUDGETS.map((b, i) => (
          <li key={b.label} style={{ transitionDelay: `${i * 110}ms` }}>
            <div className="nl-budget-row">
              <span>{b.label}</span>
              <span className={b.over ? "is-over" : undefined}>{b.used}</span>
            </div>
            <div className="nl-budget-track">
              <span
                className={b.over ? "is-over" : undefined}
                style={{ width: `${Math.min(b.pct, 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoryGoal({ active }: { active: boolean }) {
  const R = 54;
  return (
    <div className="nl-story-panel" data-active={active || undefined}>
      <div className="nl-story-panel-head">
        <span className="nl-story-panel-title">Savings goal</span>
        <span className="nl-story-panel-pill">On pace</span>
      </div>
      <div className="nl-goal">
        <div className="nl-goal-ring">
          <svg viewBox="0 0 132 132" aria-hidden="true">
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke="rgba(244,241,236,0.07)"
              strokeWidth="10"
            />
            <circle
              className="nl-goal-arc"
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke="#d6b779"
              strokeWidth="10"
              strokeLinecap="round"
              transform="rotate(-90 66 66)"
            />
          </svg>
          <div className="nl-goal-center">
            <strong>68%</strong>
            <span>₹34,000</span>
          </div>
        </div>
        <div className="nl-goal-copy">
          <p className="nl-goal-name">Japan, spring 2027</p>
          <p className="nl-goal-sub">₹34,000 of ₹50,000 saved</p>
          <ul className="nl-goal-list">
            <li style={{ transitionDelay: "150ms" }}>
              <i className="is-done" /> Flights — booked
            </li>
            <li style={{ transitionDelay: "250ms" }}>
              <i /> Stay — researching
            </li>
            <li style={{ transitionDelay: "350ms" }}>
              <i /> Rail pass — pending
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
