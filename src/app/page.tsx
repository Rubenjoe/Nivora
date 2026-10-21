"use client";

import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Goal,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Settings2,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true, available: true },
  { label: "Transactions", icon: CreditCard, available: true },
  { label: "Budgets", icon: Wallet, available: false },
  { label: "Analytics", icon: BarChart3, available: false },
  { label: "Goals", icon: Goal, available: false },
];

type DashboardData = {
  currency: string;
  totals: { income: string; expenses: string; net: string };
  categories: { name: string; amount: string }[];
  transactions: {
    transaction: {
      id: string;
      kind: "income" | "expense";
      amount: string;
      currency: string;
      merchant: string | null;
      occurredOn: string;
    };
    categoryName: string;
  }[];
};

function dateISO(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

async function readDashboard(
  period: "this-month" | "last-month",
): Promise<DashboardData> {
  const now = new Date();
  const start =
    period === "this-month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end =
    period === "this-month"
      ? now
      : new Date(now.getFullYear(), now.getMonth(), 0);
  const query = new URLSearchParams({ from: dateISO(start), to: dateISO(end) });
  const [summaryResponse, transactionResponse] = await Promise.all([
    fetch(`/api/v1/summary?${query}`, { cache: "no-store" }),
    fetch(`/api/v1/transactions?${query}`, { cache: "no-store" }),
  ]);
  const [summary, history] = await Promise.all([
    summaryResponse.json(),
    transactionResponse.json(),
  ]);
  if (!summaryResponse.ok || !transactionResponse.ok) {
    if (summaryResponse.status === 401 || transactionResponse.status === 401) {
      throw new Error("Sign in to see your private financial overview.");
    }
    throw new Error(
      summary.error ??
        history.error ??
        "Your financial summary is unavailable.",
    );
  }
  return {
    ...summary,
    transactions: history.transactions.slice(0, 5),
  } as DashboardData;
}

function BrandMark() {
  return (
    <div aria-hidden="true" className="brand-mark">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"this-month" | "last-month">(
    "this-month",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    readDashboard(period)
      .then((result) => {
        if (active) {
          setDashboard(result);
          setDashboardError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setDashboardError(
            cause instanceof Error
              ? cause.message
              : "Your financial summary is unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const formatMoney = (amount: string, currency: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount as unknown as number);

  const maximumCategorySpend = (dashboard?.categories ?? []).reduce(
    (maximum, category) =>
      new Decimal(category.amount).greaterThan(maximum)
        ? new Decimal(category.amount)
        : maximum,
    new Decimal(0),
  );

  return (
    <main className="app-shell">
      <a className="skip-link" href="#overview">
        Skip to main content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Nivora home">
          <BrandMark />
          <span>nivora</span>
        </a>
        <div className="workspace-label">YOUR MONEY, IN FOCUS</div>
        <nav aria-label="Main navigation" className="nav-list">
          {navigation.map(({ label, icon: Icon, active, available }) =>
            available ? (
              <a
                key={label}
                className={active ? "nav-item active" : "nav-item"}
                href={label === "Transactions" ? "/transactions" : "#overview"}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ) : (
              <div
                key={label}
                className="nav-item nav-disabled"
                aria-disabled="true"
                title={`${label} is not available yet`}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                <span className="soon-tag">SOON</span>
              </div>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-card">
            <div className="mode-icon">
              <Sparkles size={16} />
            </div>
            <div>
              <strong>Simple mode</strong>
              <span>A calmer way to begin</span>
            </div>
            <span className="mode-dot" aria-label="Simple mode selected" />
          </div>
          <div className="nav-item nav-disabled" aria-disabled="true">
            <Settings2 size={18} />
            <span>Settings</span>
            <span className="soon-tag">SOON</span>
          </div>
          <div className="nav-item nav-disabled" aria-disabled="true">
            <CircleHelp size={18} />
            <span>Help & support</span>
            <span className="soon-tag">SOON</span>
          </div>
          <div className="profile-row">
            <div className="avatar">N</div>
            <div className="profile-copy">
              <strong>Your space</strong>
              <span>Private by design</span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar">
          <div className="crumb">
            My finances <span>/</span> <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <div className="secure">
              <LockKeyhole size={14} /> Your data is private
            </div>
            <ThemeToggle />
            <a className="topbar-signin" href="/sign-in">
              Sign in
            </a>
            <a className="topbar-signup" href="/sign-up">
              Get started
            </a>
          </div>
        </header>
        <div className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR FINANCIAL HOME</p>
              <h1>
                Your finances,
                <br className="mobile-break" /> at a glance.
              </h1>
              <p className="subheading">A little clarity goes a long way.</p>
            </div>
            <select
              className="period-button"
              aria-label="Choose summary period"
              value={period}
              onChange={(event) => {
                setLoading(true);
                setDashboard(null);
                setDashboardError(null);
                setPeriod(event.target.value as "this-month" | "last-month");
              }}
            >
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
            </select>
          </div>

          <div className="summary-grid" aria-label="Financial summary">
            <article className="summary-card">
              <div className="summary-label">
                <span>Income</span>
                <span className="summary-icon income">
                  <ArrowDownLeft size={17} />
                </span>
              </div>
              <p className="summary-value">
                {dashboard
                  ? formatMoney(dashboard.totals.income, dashboard.currency)
                  : "—"}
              </p>
              <p className="summary-note">
                {loading
                  ? "Loading your records…"
                  : dashboard
                    ? `Recorded ${period === "this-month" ? "this month" : "last month"}`
                    : "Use your own data only"}
              </p>
            </article>
            <article className="summary-card">
              <div className="summary-label">
                <span>Spent</span>
                <span className="summary-icon expense">
                  <ArrowUpRight size={17} />
                </span>
              </div>
              <p className="summary-value">
                {dashboard
                  ? formatMoney(dashboard.totals.expenses, dashboard.currency)
                  : "—"}
              </p>
              <p className="summary-note">
                {dashboard
                  ? `Spending ${period === "this-month" ? "this month" : "last month"}`
                  : loading
                    ? "Loading your records…"
                    : "No preview figures"}
              </p>
            </article>
            <article className="summary-card cash-card">
              <div className="summary-label">
                <span>Net cash flow</span>
                <span className="summary-icon cash">
                  <Wallet size={17} />
                </span>
              </div>
              <p className="summary-value">
                {dashboard
                  ? formatMoney(dashboard.totals.net, dashboard.currency)
                  : "—"}
              </p>
              <p className="summary-note">
                {dashboard
                  ? `Income minus expenses, ${period === "this-month" ? "this month" : "last month"}`
                  : loading
                    ? "Loading your records…"
                    : "Sign in to see your cash flow"}
              </p>
            </article>
          </div>

          <div className="section-heading">
            <div>
              <h2 id="chart-title">Spending by category</h2>
              <p>Only transactions recorded in the selected period.</p>
            </div>
            <span className="period-caption">
              {period === "this-month" ? "THIS MONTH" : "LAST MONTH"}
            </span>
          </div>
          <section
            className="empty-chart category-chart"
            aria-labelledby="chart-title"
          >
            {loading ? (
              <p className="dashboard-feedback" role="status">
                Loading your records…
              </p>
            ) : dashboardError ? (
              <div className="dashboard-feedback" role="status">
                <h3>Your figures stay private</h3>
                <p>{dashboardError}</p>
                <Link className="dashboard-inline-link" href="/sign-in">
                  Sign in to continue
                </Link>
              </div>
            ) : !dashboard?.categories.length ? (
              <div className="empty-copy">
                <div className="empty-symbol">
                  <BarChart3 size={20} aria-hidden="true" />
                </div>
                <h3>A clear page is a good start.</h3>
                <p>
                  Record a few expenses and their real category breakdown will
                  appear here. There are no sample figures.
                </p>
              </div>
            ) : (
              <ol className="category-list" aria-label="Spending by category">
                {dashboard.categories.map((category, index) => {
                  const proportion = maximumCategorySpend.isZero()
                    ? "0"
                    : new Decimal(category.amount)
                        .div(maximumCategorySpend)
                        .mul(100)
                        .toFixed(1);
                  return (
                    <li
                      className="category-item"
                      key={`${category.name}-${index}`}
                    >
                      <div className="category-line">
                        <span>{category.name}</span>
                        <strong>
                          {formatMoney(category.amount, dashboard.currency)}
                        </strong>
                      </div>
                      <div className="category-track" aria-hidden="true">
                        <span
                          className="category-bar-fill"
                          style={{ width: `${proportion}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="dashboard-recent" aria-labelledby="recent-title">
            <div className="recent-heading">
              <div>
                <h2 id="recent-title">Recent activity</h2>
                <p>Entries from the selected period</p>
              </div>
              <Link href="/transactions">
                All transactions <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {dashboard?.transactions.length ? (
              <ul className="recent-list">
                {dashboard.transactions.map(({ transaction, categoryName }) => (
                  <li key={transaction.id} className="recent-row">
                    <span
                      className={`recent-sign ${transaction.kind}`}
                      aria-hidden="true"
                    >
                      {transaction.kind === "expense" ? "−" : "+"}
                    </span>
                    <span className="recent-copy">
                      <strong>{transaction.merchant || categoryName}</strong>
                      <small>
                        {categoryName} ·{" "}
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(
                          new Date(`${transaction.occurredOn}T12:00:00`),
                        )}
                      </small>
                    </span>
                    <strong className={`recent-amount ${transaction.kind}`}>
                      {transaction.kind === "expense" ? "−" : "+"}
                      {formatMoney(transaction.amount, transaction.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="recent-empty" role="status">
                {loading
                  ? "Loading recent activity…"
                  : (dashboardError ??
                    "Your recorded transactions will appear here.")}
              </p>
            )}
          </section>

          <section className="next-step">
            <div className="step-ornament">
              <Sparkles size={18} />
            </div>
            <div className="step-copy">
              <p className="eyebrow">A GOOD PLACE TO START</p>
              <h2>Small steps count.</h2>
              <p>
                Your first entry is all it takes to get started. Add
                transactions once your account is set up.
              </p>
            </div>
            <Link className="add-button" href="/transactions">
              <Plus size={17} /> Add a transaction
            </Link>
          </section>
          <footer className="footer-note">
            Built for clarity, not complexity. <span>·</span> Your financial
            data belongs to you.
          </footer>
        </div>
      </section>
    </main>
  );
}
