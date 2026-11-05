import Decimal from "decimal.js";
import { and, eq, gte, lte } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import type { getDatabase } from "@/lib/db/index";

type Database = ReturnType<typeof getDatabase>;

export async function expenseTotalForBudget(
  db: Database,
  profileId: string,
  currency: string,
  periodMonth: string,
  categoryId: string | null,
) {
  const [yearStr, monthStr] = periodMonth.slice(0, 7).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01`;
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
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
