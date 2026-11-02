import Decimal from "decimal.js";
import type {
  ChartCategory,
  DailyActivity,
  MerchantAggregate,
} from "@/lib/finance/chart-data";

export type AnalyticsTransactionRow = {
  occurredOn: string;
  kind: "income" | "expense";
  amount: string;
  categoryId: string;
  categoryName: string;
  merchant?: string | null;
};

/**
 * Aggregates transaction rows already scoped to one verified profile and
 * currency. Money is summed with Decimal; counts are expense counts because
 * the daily activity series feeds the expense calendar.
 */
export function aggregateDailyActivity(
  rows: AnalyticsTransactionRow[],
): DailyActivity[] {
  const byDate = new Map<
    string,
    { income: Decimal; expenses: Decimal; transactionCount: number }
  >();
  for (const row of rows) {
    const bucket = byDate.get(row.occurredOn) ?? {
      income: new Decimal(0),
      expenses: new Decimal(0),
      transactionCount: 0,
    };
    if (row.kind === "income") {
      bucket.income = bucket.income.plus(row.amount);
    } else {
      bucket.expenses = bucket.expenses.plus(row.amount);
      bucket.transactionCount += 1;
    }
    byDate.set(row.occurredOn, bucket);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      income: bucket.income.toFixed(2),
      expenses: bucket.expenses.toFixed(2),
      transactionCount: bucket.transactionCount,
    }));
}

export function aggregateCategoryTotals(
  rows: AnalyticsTransactionRow[],
  kind: "income" | "expense",
): ChartCategory[] {
  const byCategory = new Map<
    string,
    { categoryId: string; name: string; amount: Decimal }
  >();
  for (const row of rows) {
    if (row.kind !== kind) continue;
    const existing = byCategory.get(row.categoryId);
    byCategory.set(row.categoryId, {
      categoryId: row.categoryId,
      name: row.categoryName,
      amount: (existing?.amount ?? new Decimal(0)).plus(row.amount),
    });
  }

  return [...byCategory.values()]
    .map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      amount: category.amount.toFixed(2),
    }))
    .sort((a, b) => new Decimal(b.amount).comparedTo(a.amount));
}

export function aggregateMerchantActivity(
  rows: AnalyticsTransactionRow[],
): MerchantAggregate[] {
  const byMerchantAndCategory = new Map<
    string,
    {
      merchant: string;
      categoryId: string;
      categoryName: string;
      total: Decimal;
      count: number;
    }
  >();
  for (const row of rows) {
    if (row.kind !== "expense") continue;
    const merchant = row.merchant?.trim();
    if (!merchant) continue;
    const key = `${row.categoryId}:${merchant.toLocaleLowerCase()}`;
    const existing = byMerchantAndCategory.get(key);
    byMerchantAndCategory.set(key, {
      merchant: existing?.merchant ?? merchant,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      total: (existing?.total ?? new Decimal(0)).plus(row.amount),
      count: (existing?.count ?? 0) + 1,
    });
  }

  return [...byMerchantAndCategory.values()]
    .map((entry) => ({
      merchant: entry.merchant,
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      totalSpent: entry.total.toFixed(2),
      transactionCount: entry.count,
      avgTransactionAmount: entry.total.div(entry.count).toFixed(2),
    }))
    .sort((a, b) => new Decimal(b.totalSpent).comparedTo(a.totalSpent));
}
