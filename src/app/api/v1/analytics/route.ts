import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  budgets,
  categories,
  goalContributions,
  savingsGoals,
  transactions,
} from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { transactionQuery } from "@/lib/finance/validation";
import { formatPercentageDelta } from "@/lib/finance/comparison";
import {
  calendarDayCount,
  previousCalendarRange,
  weekStartISO,
} from "@/lib/finance/calendar";

const MAX_RANGE_DAYS = 400;

function bucketKey(occurredOn: string, grain: "daily" | "weekly" | "monthly") {
  if (grain === "daily") return occurredOn;
  if (grain === "monthly") return occurredOn.slice(0, 7);
  return weekStartISO(occurredOn);
}

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
    const { from, to } = query.data;
    const rangeDays = calendarDayCount(from, to);
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: "Date ranges longer than 400 days are not supported." },
        { status: 400 },
      );
    }

    const prev = previousCalendarRange(from, to);

    const scoped = [
      eq(transactions.profileId, current.profile.id),
      eq(transactions.currency, current.profile.currency),
    ];

    const [periodRows, prevRows] = await Promise.all([
      current.db
        .select({
          id: transactions.id,
          occurredOn: transactions.occurredOn,
          createdAt: transactions.createdAt,
          kind: transactions.kind,
          amount: transactions.amount,
          merchant: transactions.merchant,
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
            ...scoped,
            gte(transactions.occurredOn, from),
            lte(transactions.occurredOn, to),
          ),
        ),
      current.db
        .select({
          kind: transactions.kind,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            ...scoped,
            gte(transactions.occurredOn, prev.from),
            lte(transactions.occurredOn, prev.to),
          ),
        ),
    ]);

    const grain: "daily" | "weekly" | "monthly" =
      rangeDays <= 31 ? "daily" : rangeDays <= 120 ? "weekly" : "monthly";

    const buckets = new Map<string, { income: Decimal; expenses: Decimal }>();
    for (const row of periodRows) {
      const key = bucketKey(row.occurredOn, grain);
      const bucket = buckets.get(key) ?? {
        income: new Decimal(0),
        expenses: new Decimal(0),
      };
      if (row.kind === "income") bucket.income = bucket.income.plus(row.amount);
      else bucket.expenses = bucket.expenses.plus(row.amount);
      buckets.set(key, bucket);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([label, { income, expenses }]) => ({
        label,
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
      }));

    const totals = { income: new Decimal(0), expenses: new Decimal(0) };
    const categoryTotals = new Map<string, { name: string; amount: Decimal }>();
    for (const row of periodRows) {
      const amount = new Decimal(row.amount);
      if (row.kind === "income") totals.income = totals.income.plus(amount);
      else {
        totals.expenses = totals.expenses.plus(amount);
        const prior = categoryTotals.get(row.categoryId);
        categoryTotals.set(row.categoryId, {
          name: row.categoryName,
          amount: (prior?.amount ?? new Decimal(0)).plus(amount),
        });
      }
    }
    const categoryBreakdown = [...categoryTotals.values()]
      .map((entry) => ({ ...entry, amount: entry.amount.toFixed(2) }))
      .sort((a, b) => new Decimal(b.amount).comparedTo(a.amount));

    const recentTransactions = [...periodRows]
      .sort((a, b) => {
        const byDate = b.occurredOn.localeCompare(a.occurredOn);
        return byDate || b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, 5)
      .map((row) => ({
        transaction: {
          id: row.id,
          kind: row.kind,
          amount: row.amount,
          currency: current.profile.currency,
          merchant: row.merchant,
          occurredOn: row.occurredOn,
        },
        categoryName: row.categoryName,
      }));

    const prevTotals = { income: new Decimal(0), expenses: new Decimal(0) };
    for (const row of prevRows) {
      const amount = new Decimal(row.amount);
      if (row.kind === "income")
        prevTotals.income = prevTotals.income.plus(amount);
      else prevTotals.expenses = prevTotals.expenses.plus(amount);
    }

    const periodMonth = `${to.slice(0, 7)}-01`;
    const [budgetRows, budgetSpendRows] = await Promise.all([
      current.db
        .select({
          id: budgets.id,
          name: budgets.name,
          amount: budgets.amount,
          categoryId: budgets.categoryId,
          warningThresholdPercent: budgets.warningThresholdPercent,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.profileId, current.profile.id),
            eq(budgets.status, "active"),
            eq(budgets.periodMonth, periodMonth),
          ),
        )
        .orderBy(asc(budgets.name)),
      current.db
        .select({
          categoryId: transactions.categoryId,
          amount: sql<string>`sum(${transactions.amount})::text`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.profileId, current.profile.id),
            eq(transactions.currency, current.profile.currency),
            eq(transactions.kind, "expense"),
            gte(transactions.occurredOn, periodMonth),
            lte(transactions.occurredOn, to),
          ),
        )
        .groupBy(transactions.categoryId),
    ]);

    const spentByCategory = new Map(
      budgetSpendRows.map((row) => [row.categoryId, new Decimal(row.amount)]),
    );
    const totalBudgetSpent = [...spentByCategory.values()].reduce(
      (sum, amount) => sum.plus(amount),
      new Decimal(0),
    );
    const budgetWidgets = budgetRows.map((budget) => {
      const spent = budget.categoryId
        ? (spentByCategory.get(budget.categoryId) ?? new Decimal(0))
        : totalBudgetSpent;
      const percent = new Decimal(budget.amount).isZero()
        ? 0
        : Number(spent.div(budget.amount).mul(100).toFixed(1));
      return {
        id: budget.id,
        name: budget.name,
        spent: spent.toFixed(2),
        amount: budget.amount,
        percent,
        alert:
          percent >= budget.warningThresholdPercent &&
          current.profile.budgetAlertsEnabled !== false,
      };
    });

    const [goalRows, contributionRows] = await Promise.all([
      current.db
        .select({
          id: savingsGoals.id,
          name: savingsGoals.name,
          targetAmount: savingsGoals.targetAmount,
          status: savingsGoals.status,
          createdAt: savingsGoals.createdAt,
        })
        .from(savingsGoals)
        .where(
          and(
            eq(savingsGoals.profileId, current.profile.id),
            sql`${savingsGoals.status} in ('active', 'paused', 'completed')`,
          ),
        )
        .orderBy(desc(savingsGoals.createdAt)),
      current.db
        .select({
          goalId: goalContributions.goalId,
          saved: sql<string>`sum(${goalContributions.amount})::text`,
        })
        .from(goalContributions)
        .where(eq(goalContributions.profileId, current.profile.id))
        .groupBy(goalContributions.goalId),
    ]);
    const savedByGoal = new Map(
      contributionRows.map((row) => [row.goalId, new Decimal(row.saved)]),
    );
    const goalWidgets = goalRows.map((goal) => {
      const saved = savedByGoal.get(goal.id) ?? new Decimal(0);
      return {
        id: goal.id,
        name: goal.name,
        saved: saved.toFixed(2),
        target: goal.targetAmount,
        percent: new Decimal(goal.targetAmount).isZero()
          ? 0
          : Number(saved.div(goal.targetAmount).mul(100).toFixed(1)),
        status: goal.status,
      };
    });

    return NextResponse.json({
      period: { from, to, grain },
      currency: current.profile.currency,
      series,
      totals: {
        income: totals.income.toFixed(2),
        expenses: totals.expenses.toFixed(2),
        net: totals.income.minus(totals.expenses).toFixed(2),
      },
      comparison: {
        incomeDelta: formatPercentageDelta(
          totals.income.toFixed(2),
          prevTotals.income.toFixed(2),
        ),
        expenseDelta: formatPercentageDelta(
          totals.expenses.toFixed(2),
          prevTotals.expenses.toFixed(2),
        ),
        netDelta: formatPercentageDelta(
          totals.income.minus(totals.expenses).toFixed(2),
          prevTotals.income.minus(prevTotals.expenses).toFixed(2),
        ),
      },
      categories: categoryBreakdown,
      transactions: recentTransactions,
      budgets: budgetWidgets,
      goals: goalWidgets,
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
