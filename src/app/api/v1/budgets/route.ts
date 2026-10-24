import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { budgets, categories, transactions } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { expenseTotalForBudget } from "@/lib/finance/budget-spent";
import type { getDatabase } from "@/lib/db";
import { monthStartDate } from "@/lib/finance/validation";

type Database = ReturnType<typeof getDatabase>;
type BudgetRow = typeof budgets.$inferSelect;

const budgetInput = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  periodMonth: monthStartDate,
  categoryId: z.string().uuid().nullable().optional(),
  warningThresholdPercent: z.coerce.number().int().min(1).max(100).optional(),
});

async function budgetWithProgress(
  db: Database,
  profileId: string,
  currency: string,
  row: BudgetRow,
) {
  const spent = await expenseTotalForBudget(
    db,
    profileId,
    currency,
    row.periodMonth,
    row.categoryId,
  );
  return budgetProgressFromAmount(row, spent);
}

function budgetProgressFromAmount(row: BudgetRow, spent: Decimal) {
  const amount = new Decimal(row.amount);
  const percent = amount.isZero()
    ? 0
    : Number(spent.div(amount).mul(100).toFixed(1));
  return {
    budget: row,
    spent: spent.toFixed(2),
    remaining: amount.minus(spent).toFixed(2),
    percent,
    overBudget: spent.greaterThan(amount),
    thresholdAlert: percent >= row.warningThresholdPercent,
  };
}

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const rows = await current.db
      .select()
      .from(budgets)
      .where(eq(budgets.profileId, current.profile.id))
      .orderBy(asc(budgets.periodMonth), asc(budgets.name));
    let spendRows: { period: string; categoryId: string; amount: string }[] =
      [];
    if (rows.length) {
      const lastPeriod = rows.at(-1)!.periodMonth;
      const [year, month] = lastPeriod.split("-").map(Number);
      const endDate = new Date(Date.UTC(year!, month!, 0))
        .toISOString()
        .slice(0, 10);
      spendRows = await current.db
        .select({
          period: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
          categoryId: transactions.categoryId,
          amount: sql<string>`sum(${transactions.amount})::text`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.profileId, current.profile.id),
            eq(transactions.currency, current.profile.currency),
            eq(transactions.kind, "expense"),
            gte(transactions.occurredOn, rows[0]!.periodMonth),
            lte(transactions.occurredOn, endDate),
          ),
        )
        .groupBy(
          sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
          transactions.categoryId,
        );
    }
    const spendByPeriod = new Map<
      string,
      { total: Decimal; categories: Map<string, Decimal> }
    >();
    for (const row of spendRows) {
      const period = spendByPeriod.get(row.period) ?? {
        total: new Decimal(0),
        categories: new Map<string, Decimal>(),
      };
      const amount = new Decimal(row.amount);
      period.total = period.total.plus(amount);
      period.categories.set(
        row.categoryId,
        (period.categories.get(row.categoryId) ?? new Decimal(0)).plus(amount),
      );
      spendByPeriod.set(row.period, period);
    }
    const enriched = rows.map((row) => {
      const period = spendByPeriod.get(row.periodMonth.slice(0, 7));
      const spent = row.categoryId
        ? (period?.categories.get(row.categoryId) ?? new Decimal(0))
        : (period?.total ?? new Decimal(0));
      return budgetProgressFromAmount(row, spent);
    });
    return NextResponse.json({
      currency: current.profile.currency,
      budgets: enriched,
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const parsed = budgetInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid budget details." },
        { status: 400 },
      );
    const data = parsed.data;
    if (data.categoryId) {
      const [category] = await current.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.profileId, current.profile.id),
            eq(categories.kind, "expense"),
          ),
        )
        .limit(1);
      if (!category)
        return NextResponse.json(
          { error: "Choose a valid expense category." },
          { status: 400 },
        );
    }
    const [created] = await current.db
      .insert(budgets)
      .values({
        profileId: current.profile.id,
        name: data.name,
        amount: data.amount,
        periodMonth: data.periodMonth,
        categoryId: data.categoryId ?? null,
        warningThresholdPercent: data.warningThresholdPercent ?? 80,
      })
      .onConflictDoNothing()
      .returning();
    if (!created)
      return NextResponse.json(
        { error: "A budget with this name already exists for that month." },
        { status: 409 },
      );
    const enriched = await budgetWithProgress(
      current.db,
      current.profile.id,
      current.profile.currency,
      created,
    );
    return NextResponse.json(enriched, { status: 201 });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
