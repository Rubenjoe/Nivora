import Decimal from "decimal.js";
import { shiftCalendarDate, weekStartISO } from "@/lib/finance/calendar";

export type SeriesGrain = "daily" | "weekly" | "monthly";

export type SeriesPoint = {
  label: string;
  income: string;
  expenses: string;
};

export type ChartCategory = {
  categoryId: string;
  name: string;
  amount: string;
};

export type DailyActivity = {
  date: string;
  income: string;
  expenses: string;
  /** Expense transactions recorded on this day. */
  transactionCount: number;
};

export type MerchantAggregate = {
  merchant: string;
  categoryId: string;
  categoryName: string;
  totalSpent: string;
  transactionCount: number;
  avgTransactionAmount: string;
};

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthlyLabels(from: string, to: string): string[] {
  const [startYear, startMonth] = from.slice(0, 7).split("-").map(Number);
  const end = to.slice(0, 7);
  let year = startYear ?? 0;
  let month = startMonth ?? 1;
  const labels: string[] = [];
  while (monthLabel(year, month) <= end) {
    labels.push(monthLabel(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return labels;
}

function seriesLabels(from: string, to: string, grain: SeriesGrain): string[] {
  if (grain === "monthly") return monthlyLabels(from, to);
  if (grain === "weekly") {
    const labels: string[] = [];
    let cursor = weekStartISO(from);
    const last = weekStartISO(to);
    while (cursor <= last) {
      labels.push(cursor);
      cursor = shiftCalendarDate(cursor, 7);
    }
    return labels;
  }
  const labels: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    labels.push(cursor);
    cursor = shiftCalendarDate(cursor, 1);
  }
  return labels;
}

/**
 * Fills empty buckets so every date/week/month in the range is represented.
 * The API only returns buckets with activity; without this a quiet day would
 * silently disappear from the x-axis and compress time.
 */
export function completeSeries(
  series: SeriesPoint[],
  from: string,
  to: string,
  grain: SeriesGrain,
): SeriesPoint[] {
  const byLabel = new Map(series.map((point) => [point.label, point]));
  return seriesLabels(from, to, grain).map(
    (label) =>
      byLabel.get(label) ?? { label, income: "0.00", expenses: "0.00" },
  );
}

export function fillDailyActivity(
  daily: DailyActivity[],
  from: string,
  to: string,
): DailyActivity[] {
  const byDate = new Map(daily.map((point) => [point.date, point]));
  return seriesLabels(from, to, "daily").map(
    (date) =>
      byDate.get(date) ?? {
        date,
        income: "0.00",
        expenses: "0.00",
        transactionCount: 0,
      },
  );
}

export function spendingIntensity(amount: string, maximum: string): number {
  const value = new Decimal(amount);
  const max = new Decimal(maximum);
  if (!value.greaterThan(0) || !max.greaterThan(0)) return 0;
  const level = Math.ceil(value.div(max).mul(4).toNumber());
  return Math.max(1, Math.min(4, level));
}

export type SankeyNodeKind = "income" | "expense" | "pool" | "retained";

export type SankeyNode = {
  name: string;
  label: string;
  kind: SankeyNodeKind;
  categoryName?: string;
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

export type SankeyAllocation = {
  canRender: boolean;
  reason: string | null;
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncome: string;
  totalExpenses: string;
  retained: string;
  balanced: boolean;
};

/**
 * Builds a pooled cash-flow allocation. Income categories flow into one pool,
 * then out to expense categories and (only when positive) retained cash.
 * This deliberately does not claim that a specific income source funded a
 * specific expense; the pool is an aggregation, not a provenance model.
 */
export function buildSankeyAllocation(
  incomeCategories: ChartCategory[],
  expenseCategories: ChartCategory[],
): SankeyAllocation {
  const income = incomeCategories.reduce(
    (sum, category) => sum.plus(category.amount),
    new Decimal(0),
  );
  const expenses = expenseCategories.reduce(
    (sum, category) => sum.plus(category.amount),
    new Decimal(0),
  );
  const retained = income.minus(expenses);
  const empty: SankeyAllocation = {
    canRender: false,
    reason: null,
    nodes: [],
    links: [],
    totalIncome: income.toFixed(2),
    totalExpenses: expenses.toFixed(2),
    retained: retained.toFixed(2),
    balanced: false,
  };

  if (!income.greaterThan(0)) {
    return {
      ...empty,
      reason:
        "No recorded income in this range, so there is no pool to allocate.",
    };
  }
  if (!expenses.greaterThan(0)) {
    return {
      ...empty,
      reason: "No recorded expenses in this range to allocate.",
    };
  }
  if (retained.isNegative()) {
    return {
      ...empty,
      reason:
        "Expenses exceed recorded income in this range. A pooled allocation cannot reconcile negative cash flow without an opening balance, which Nivora does not model.",
    };
  }

  const poolName = "pool:recorded-income";
  const nodes: SankeyNode[] = incomeCategories
    .filter((category) => new Decimal(category.amount).greaterThan(0))
    .map((category) => ({
      name: `income:${category.categoryId}`,
      label: category.name,
      kind: "income",
      categoryName: category.name,
    }));
  nodes.push({
    name: poolName,
    label: "Recorded income",
    kind: "pool",
  });
  nodes.push(
    ...expenseCategories
      .filter((category) => new Decimal(category.amount).greaterThan(0))
      .map((category) => ({
        name: `expense:${category.categoryId}`,
        label: category.name,
        kind: "expense" as const,
        categoryName: category.name,
      })),
  );
  if (retained.greaterThan(0)) {
    nodes.push({
      name: "retained:cash",
      label: "Retained cash",
      kind: "retained",
    });
  }

  const links: SankeyLink[] = [];
  for (const category of incomeCategories) {
    if (!new Decimal(category.amount).greaterThan(0)) continue;
    links.push({
      source: `income:${category.categoryId}`,
      target: poolName,
      value: new Decimal(category.amount).toNumber(),
    });
  }
  for (const category of expenseCategories) {
    if (!new Decimal(category.amount).greaterThan(0)) continue;
    links.push({
      source: poolName,
      target: `expense:${category.categoryId}`,
      value: new Decimal(category.amount).toNumber(),
    });
  }
  if (retained.greaterThan(0)) {
    links.push({
      source: poolName,
      target: "retained:cash",
      value: retained.toNumber(),
    });
  }

  const inflow = income.toNumber();
  const outflow = expenses.plus(retained).toNumber();
  return {
    canRender: links.length > 0,
    reason: null,
    nodes,
    links,
    totalIncome: income.toFixed(2),
    totalExpenses: expenses.toFixed(2),
    retained: retained.toFixed(2),
    balanced: Math.abs(inflow - outflow) < 0.005,
  };
}

export type TreemapNode = {
  name: string;
  value: number;
  categoryId?: string;
  merchant?: string;
  children?: TreemapNode[];
};

export type TreemapResult = {
  canRender: boolean;
  data: TreemapNode[];
  total: string;
  topCategory: ChartCategory | null;
};

/**
 * Category totals are the parent values. Merchant rows are a second level
 * where they exist; the remaining amount is labelled honestly rather than
 * assigned to an invented merchant.
 */
export function buildCategoryTreemap(
  categories: ChartCategory[],
  merchants: MerchantAggregate[],
): TreemapResult {
  const positiveCategories = categories
    .filter((category) => new Decimal(category.amount).greaterThan(0))
    .sort((a, b) => new Decimal(b.amount).comparedTo(a.amount));
  const merchantsByCategory = new Map<string, MerchantAggregate[]>();
  for (const merchant of merchants) {
    if (!new Decimal(merchant.totalSpent).greaterThan(0)) continue;
    const current = merchantsByCategory.get(merchant.categoryId) ?? [];
    current.push(merchant);
    merchantsByCategory.set(merchant.categoryId, current);
  }

  const data: TreemapNode[] = positiveCategories.map((category) => {
    const total = new Decimal(category.amount);
    const merchantRows = (merchantsByCategory.get(category.categoryId) ?? [])
      .slice()
      .sort((a, b) => new Decimal(b.totalSpent).comparedTo(a.totalSpent));
    const attributed = merchantRows.reduce(
      (sum, merchant) => sum.plus(merchant.totalSpent),
      new Decimal(0),
    );
    const residual = total.minus(attributed);
    const children: TreemapNode[] = merchantRows.map((merchant) => ({
      name: merchant.merchant,
      value: new Decimal(merchant.totalSpent).toNumber(),
      merchant: merchant.merchant,
    }));
    if (merchantRows.length > 0 && residual.greaterThan(0.005)) {
      children.push({
        name: "No merchant recorded",
        value: residual.toNumber(),
      });
    }

    if (
      merchantRows.length === 0 ||
      children.length === 0 ||
      attributed.greaterThan(total) ||
      Math.abs(
        children.reduce((sum, child) => sum + child.value, 0) -
          total.toNumber(),
      ) > 0.01
    ) {
      return {
        name: category.name,
        value: total.toNumber(),
        categoryId: category.categoryId,
      };
    }

    return {
      name: category.name,
      value: total.toNumber(),
      categoryId: category.categoryId,
      children,
    };
  });

  return {
    canRender: data.length > 0,
    data,
    total: positiveCategories
      .reduce((sum, category) => sum.plus(category.amount), new Decimal(0))
      .toFixed(2),
    topCategory: positiveCategories[0] ?? null,
  };
}

export type RadarResult = {
  canRender: boolean;
  indicators: { name: string; max: number }[];
  current: number[];
  prior: number[];
  categories: { categoryId: string; name: string }[];
  notableChange: {
    name: string;
    current: string;
    prior: string;
    difference: string;
  } | null;
};

export function buildCategoryRadar(
  currentCategories: ChartCategory[],
  priorCategories: ChartCategory[],
  limit = 8,
): RadarResult {
  const byId = new Map<
    string,
    { categoryId: string; name: string; current: Decimal; prior: Decimal }
  >();
  for (const category of currentCategories) {
    byId.set(category.categoryId, {
      categoryId: category.categoryId,
      name: category.name,
      current: new Decimal(category.amount),
      prior: new Decimal(0),
    });
  }
  for (const category of priorCategories) {
    const existing = byId.get(category.categoryId);
    if (existing) {
      existing.prior = new Decimal(category.amount);
      if (!existing.name) existing.name = category.name;
    } else {
      byId.set(category.categoryId, {
        categoryId: category.categoryId,
        name: category.name,
        current: new Decimal(0),
        prior: new Decimal(category.amount),
      });
    }
  }

  const ordered = [...byId.values()]
    .filter(
      (category) =>
        category.current.greaterThan(0) || category.prior.greaterThan(0),
    )
    .sort((a, b) =>
      Decimal.max(b.current, b.prior).comparedTo(
        Decimal.max(a.current, a.prior),
      ),
    )
    .slice(0, limit);

  const indicators = ordered.map((category) => {
    const peak = Decimal.max(category.current, category.prior);
    return {
      name: category.name,
      max: peak.greaterThan(0) ? Math.max(1, peak.mul(1.15).toNumber()) : 1,
    };
  });
  const notable = ordered.reduce<{
    category: (typeof ordered)[number];
    difference: Decimal;
  } | null>((best, category) => {
    const difference = category.current.minus(category.prior).abs();
    if (!best || difference.greaterThan(best.difference)) {
      return { category, difference };
    }
    return best;
  }, null);

  return {
    canRender: ordered.length >= 3,
    indicators,
    current: ordered.map((category) => category.current.toNumber()),
    prior: ordered.map((category) => category.prior.toNumber()),
    categories: ordered.map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
    })),
    notableChange: notable
      ? {
          name: notable.category.name,
          current: notable.category.current.toFixed(2),
          prior: notable.category.prior.toFixed(2),
          difference: notable.difference.toFixed(2),
        }
      : null,
  };
}

export type MerchantBubblePoint = {
  merchant: string;
  categoryName: string;
  totalSpent: string;
  transactionCount: number;
  avgTransactionAmount: string;
  x: number;
  y: number;
  size: number;
};

export type MerchantBubbleResult = {
  canRender: boolean;
  points: MerchantBubblePoint[];
  topMerchant: MerchantAggregate | null;
  hiddenCount: number;
};

export function buildMerchantBubbles(
  merchants: MerchantAggregate[],
  limit = 40,
): MerchantBubbleResult {
  const ordered = merchants
    .filter(
      (merchant) =>
        merchant.transactionCount > 0 &&
        new Decimal(merchant.totalSpent).greaterThan(0),
    )
    .sort((a, b) => new Decimal(b.totalSpent).comparedTo(a.totalSpent));
  const visible = ordered.slice(0, limit);
  const maxAverage = visible.reduce(
    (max, merchant) =>
      Decimal.max(max, new Decimal(merchant.avgTransactionAmount)),
    new Decimal(0),
  );
  const points = visible.map((merchant) => {
    const average = new Decimal(merchant.avgTransactionAmount);
    const ratio = maxAverage.greaterThan(0)
      ? average.div(maxAverage).toNumber()
      : 0;
    return {
      merchant: merchant.merchant,
      categoryName: merchant.categoryName,
      totalSpent: merchant.totalSpent,
      transactionCount: merchant.transactionCount,
      avgTransactionAmount: merchant.avgTransactionAmount,
      x: merchant.transactionCount,
      y: new Decimal(merchant.totalSpent).toNumber(),
      size: 9 + Math.sqrt(Math.max(0, ratio)) * 34,
    };
  });
  return {
    canRender: points.length > 0,
    points,
    topMerchant: ordered[0] ?? null,
    hiddenCount: Math.max(0, ordered.length - visible.length),
  };
}

export type ForecastPoint = {
  label: string;
  net: number;
  netDisplay: string;
};

export type ForecastResult = {
  canRender: boolean;
  history: ForecastPoint[];
  projection: ForecastPoint[];
  meanNet: string;
  assumptions: string;
  windowBuckets: number;
};

function nextMonthLabel(label: string, offset: number): string {
  const [year, month] = label.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + offset, 1));
  return monthLabel(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function projectedLabel(
  last: string,
  grain: SeriesGrain,
  step: number,
): string {
  if (grain === "monthly") return nextMonthLabel(last, step);
  if (grain === "weekly") return shiftCalendarDate(last, step * 7);
  return shiftCalendarDate(last, step);
}

/**
 * A deliberately simple run-rate projection. It averages net cash flow over
 * the latest few buckets and repeats that value forward. It is not a
 * statistical forecast and does not know about future transactions.
 */
export function buildCashFlowForecast(
  series: SeriesPoint[],
  grain: SeriesGrain,
): ForecastResult {
  const history = series.map((point) => {
    const net = new Decimal(point.income).minus(point.expenses);
    return {
      label: point.label,
      net: net.toNumber(),
      netDisplay: net.toFixed(2),
    };
  });
  if (history.length < 3) {
    return {
      canRender: false,
      history,
      projection: [],
      meanNet: "0.00",
      assumptions:
        "A run-rate projection needs at least three recorded periods.",
      windowBuckets: 0,
    };
  }

  const windowSize = grain === "daily" ? 7 : grain === "weekly" ? 4 : 3;
  const window = history.slice(-Math.min(windowSize, history.length));
  const mean = window
    .reduce((sum, point) => sum.plus(point.net), new Decimal(0))
    .div(window.length);
  const steps = grain === "daily" ? 7 : grain === "weekly" ? 4 : 3;
  const lastLabel = history.at(-1)?.label ?? series.at(-1)?.label ?? "";
  const projection = Array.from({ length: steps }, (_, index) => {
    const net = mean.toDecimalPlaces(2);
    return {
      label: projectedLabel(lastLabel, grain, index + 1),
      net: net.toNumber(),
      netDisplay: net.toFixed(2),
    };
  });
  const unit =
    grain === "daily" ? "days" : grain === "weekly" ? "weeks" : "months";
  return {
    canRender: true,
    history,
    projection,
    meanNet: mean.toFixed(2),
    assumptions: `Projected by repeating the average net cash flow of the latest ${window.length} recorded ${unit}. It assumes no new recurring commitments and is not a statistical forecast; future transactions will change the result.`,
    windowBuckets: window.length,
  };
}
