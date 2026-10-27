import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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
import {
  generateMonthlyReport,
  getMonthBounds,
  type MonthlyReportResult,
} from "@/lib/finance/monthly-report";
import { buildCsv } from "@/lib/finance/csv";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function buildReportCsv(report: MonthlyReportResult): string {
  const lines: string[] = [];

  // 1. Overview
  lines.push("--- MONTHLY MONEY REVIEW ---");
  lines.push(`Period,${report.monthLabel} (${report.periodMonth})`);
  lines.push(`Currency,${report.currency}`);
  lines.push(
    `Financial Health Score,${report.financialHealth.score}/100 (${report.financialHealth.rating})`,
  );
  lines.push("");

  lines.push("--- SUMMARY TOTALS ---");
  const summaryHeaders = [
    "Metric",
    "Current Month",
    "Prior Month",
    "Change",
    "Variance",
  ];
  const summaryRows = [
    [
      "Total Income",
      report.totals.income,
      report.priorTotals.income,
      report.comparison.incomeDelta ?? "N/A",
      (
        parseFloat(report.totals.income) - parseFloat(report.priorTotals.income)
      ).toFixed(2),
    ],
    [
      "Total Expenses",
      report.totals.expenses,
      report.priorTotals.expenses,
      report.comparison.expenseDelta ?? "N/A",
      report.comparison.expenseDifference,
    ],
    [
      "Net Cash Flow",
      report.totals.net,
      report.priorTotals.net,
      report.comparison.netDelta ?? "N/A",
      (
        parseFloat(report.totals.net) - parseFloat(report.priorTotals.net)
      ).toFixed(2),
    ],
    [
      "Savings Rate",
      `${report.totals.savingsRate}%`,
      `${report.priorTotals.savingsRate}%`,
      `${report.comparison.savingsRateDelta > 0 ? "+" : ""}${report.comparison.savingsRateDelta}%`,
      "",
    ],
    [
      "Avg Daily Spend",
      report.totals.avgDailySpend,
      report.priorTotals.avgDailySpend,
      "",
      "",
    ],
  ];
  lines.push(buildCsv(summaryHeaders, summaryRows));
  lines.push("");

  // 2. Category Breakdown
  lines.push("--- CATEGORY BREAKDOWN ---");
  const catHeaders = [
    "Category",
    "Spent",
    "% of Total",
    "Prior Spent",
    "Change",
    "Trend",
  ];
  const catRows = report.categoryAnalysis.expenses.map((c) => [
    c.categoryName,
    c.currentAmount,
    `${c.percentageOfTotal}%`,
    c.priorAmount,
    c.delta ?? "N/A",
    c.trend,
  ]);
  lines.push(buildCsv(catHeaders, catRows));
  lines.push("");

  // 3. Budgets
  if (report.budgetPerformance.budgets.length > 0) {
    lines.push("--- BUDGET PERFORMANCE ---");
    const budgetHeaders = [
      "Budget Name",
      "Category",
      "Budgeted",
      "Spent",
      "Remaining",
      "Capacity %",
      "Status",
    ];
    const budgetRows = report.budgetPerformance.budgets.map((b) => [
      b.name,
      b.categoryName ?? "Overall",
      b.budgeted,
      b.spent,
      b.remaining,
      `${b.percent}%`,
      b.status,
    ]);
    lines.push(buildCsv(budgetHeaders, budgetRows));
    lines.push("");
  }

  // 4. Top Transactions
  if (report.topTransactions.length > 0) {
    lines.push("--- TOP EXPENSES ---");
    const topHeaders = [
      "Date",
      "Category",
      "Merchant",
      "Description",
      "Amount",
    ];
    const topRows = report.topTransactions.map((tx) => [
      tx.occurredOn,
      tx.categoryName,
      tx.merchant ?? "",
      tx.description ?? "",
      tx.amount,
    ]);
    lines.push(buildCsv(topHeaders, topRows));
  }

  return lines.join("\r\n");
}

export async function GET(request: Request) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();

    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    const format = url.searchParams.get("format");

    let month: string;
    if (monthParam) {
      if (!MONTH_REGEX.test(monthParam)) {
        return NextResponse.json(
          { error: "Invalid month format. Expected YYYY-MM." },
          { status: 400 },
        );
      }
      month = monthParam;
    } else {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    }

    const bounds = getMonthBounds(month);
    const scopedProfile = eq(transactions.profileId, current.profile.id);
    const scopedCurrency = eq(transactions.currency, current.profile.currency);

    // Run parallel profile-scoped queries
    const [
      currentTxRows,
      priorTxRows,
      categoryRows,
      budgetRows,
      goalRows,
      contributionRows,
    ] = await Promise.all([
      // 1. Current month transactions
      current.db
        .select({
          id: transactions.id,
          occurredOn: transactions.occurredOn,
          kind: transactions.kind,
          amount: transactions.amount,
          currency: transactions.currency,
          categoryId: transactions.categoryId,
          merchant: transactions.merchant,
          description: transactions.description,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(
          and(
            scopedProfile,
            scopedCurrency,
            gte(transactions.occurredOn, bounds.from),
            lte(transactions.occurredOn, bounds.to),
          ),
        )
        .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt)),

      // 2. Prior month transactions
      current.db
        .select({
          id: transactions.id,
          occurredOn: transactions.occurredOn,
          kind: transactions.kind,
          amount: transactions.amount,
          currency: transactions.currency,
          categoryId: transactions.categoryId,
          merchant: transactions.merchant,
          description: transactions.description,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(
          and(
            scopedProfile,
            scopedCurrency,
            gte(transactions.occurredOn, bounds.priorFrom),
            lte(transactions.occurredOn, bounds.priorTo),
          ),
        ),

      // 3. Profile categories
      current.db
        .select({
          id: categories.id,
          name: categories.name,
          kind: categories.kind,
          icon: categories.icon,
        })
        .from(categories)
        .where(eq(categories.profileId, current.profile.id)),

      // 4. Budgets for this month
      current.db
        .select({
          id: budgets.id,
          name: budgets.name,
          categoryId: budgets.categoryId,
          amount: budgets.amount,
          warningThresholdPercent: budgets.warningThresholdPercent,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.profileId, current.profile.id),
            eq(budgets.status, "active"),
            eq(budgets.periodMonth, bounds.from),
          ),
        ),

      // 5. Goals
      current.db
        .select({
          id: savingsGoals.id,
          name: savingsGoals.name,
          targetAmount: savingsGoals.targetAmount,
          status: savingsGoals.status,
        })
        .from(savingsGoals)
        .where(
          and(
            eq(savingsGoals.profileId, current.profile.id),
            sql`${savingsGoals.status} in ('active', 'paused', 'completed')`,
          ),
        ),

      // 6. Goal contributions
      current.db
        .select({
          goalId: goalContributions.goalId,
          amount: goalContributions.amount,
          contributedOn: goalContributions.contributedOn,
        })
        .from(goalContributions)
        .where(eq(goalContributions.profileId, current.profile.id)),
    ]);

    const report = generateMonthlyReport({
      month,
      currency: current.profile.currency,
      currentTransactions: currentTxRows,
      priorTransactions: priorTxRows,
      categories: categoryRows,
      budgets: budgetRows,
      goals: goalRows,
      allGoalContributions: contributionRows,
    });

    if (format === "csv") {
      const csv = buildReportCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="nivora-money-review-${month}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(report);
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
