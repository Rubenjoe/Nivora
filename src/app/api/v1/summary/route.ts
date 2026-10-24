import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { categories, transactions } from "@/lib/db/schema";
import { calculateCashFlow } from "@/lib/finance/calculations";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { transactionQuery } from "@/lib/finance/validation";

export async function GET(request: Request) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const query = transactionQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (
      !query.success ||
      !query.data.from ||
      !query.data.to ||
      query.data.from > query.data.to
    ) {
      return NextResponse.json(
        { error: "Provide valid from and to dates." },
        { status: 400 },
      );
    }
    const rows = await current.db
      .select({
        amount: transactions.amount,
        kind: transactions.kind,
        currency: transactions.currency,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(
        categories,
        and(
          eq(transactions.categoryId, categories.id),
          eq(categories.profileId, current.profile.id),
        ),
      )
      .where(
        and(
          eq(transactions.profileId, current.profile.id),
          eq(transactions.currency, current.profile.currency),
          gte(transactions.occurredOn, query.data.from),
          lte(transactions.occurredOn, query.data.to),
        ),
      );
    const totals = calculateCashFlow(rows, current.profile.currency);
    const breakdown = rows
      .filter(
        (row) =>
          row.currency === current.profile.currency && row.kind === "expense",
      )
      .reduce((acc, row) => {
        const previous = acc.get(row.categoryId);
        acc.set(row.categoryId, {
          name: row.categoryName,
          amount: (previous?.amount ?? new Decimal(0)).plus(row.amount),
        });
        return acc;
      }, new Map<string, { name: string; amount: Decimal }>());
    const categoriesBySpend = [...breakdown.values()]
      .map((entry) => ({ ...entry, amount: entry.amount.toFixed(2) }))
      .sort((a, b) => new Decimal(b.amount).comparedTo(a.amount));
    return NextResponse.json({
      period: { from: query.data.from, to: query.data.to },
      currency: current.profile.currency,
      totals,
      categories: categoriesBySpend,
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
