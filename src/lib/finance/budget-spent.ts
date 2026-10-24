import Decimal from "decimal.js";
import { and, eq, gte, lte } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import type { getDatabase } from "@/lib/db/index";
import { monthEnd, monthStart, toISODate } from "@/lib/finance/periods";

type Database = ReturnType<typeof getDatabase>;

export async function expenseTotalForBudget(
  db: Database,
  profileId: string,
  currency: string,
  periodMonth: string,
  categoryId: string | null,
) {
  const anchor = new Date(`${periodMonth}T12:00:00`);
  const from = toISODate(monthStart(anchor));
  const to = toISODate(monthEnd(anchor));
  const filters = [
    eq(transactions.profileId, profileId),
    eq(transactions.currency, currency),
    eq(transactions.kind, "expense"),
    gte(transactions.occurredOn, from),
    lte(transactions.occurredOn, to),
  ];
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  const rows = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(and(...filters));
  return rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
}
