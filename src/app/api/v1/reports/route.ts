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

  // 1. Overview & Period Metadata
  lines.push("--- MONTHLY MONEY REVIEW ---");
  lines.push(`Period,${report.monthLabel} (${report.periodMonth})`);
  lines.push(
    `Status,${report.isCompletedMonth ? "Completed Period" : `In Progress (${report.daysElapsed}/${report.daysInMonth} days)`}`,
  );
  lines.push(`Currency,${report.currency}`);
  lines.push(
    `Financial Health Score,${report.financialHealth.score}/100 (${report.financialHealth.rating})`,
  );
  lines.push("");

  // 2. Summary Totals & Operational Metrics
  lines.push("--- SUMMARY METRICS ---");
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
    ["Avg Expense Amount", report.totals.avgExpenseAmount, "", "", ""],
    [
      "Expense Transaction Count",
      String(report.totals.expenseCount),
      String(report.priorTotals.expenseCount),
      "",
      "",
    ],
    [
      "Highest Spending Day",
      report.totals.highestSpendingDay
        ? `${report.totals.highestSpendingDay.date} (${report.totals.highestSpendingDay.amount})`
        : "None",
      "",
      "",
      "",
    ],
  ];
  lines.push(buildCsv(summaryHeaders, summaryRows));
  lines.push("");

  // 3. Category Breakdown
  lines.push("--- CATEGORY BREAKDOWN ---");
  const catHeaders = [
    "Category",
    "Spent",
    "% of Total",
    "Transactions",
    "Avg Transaction",
    "Prior Spent",
    "Change",
    "Budget Status",
    "Trend",
  ];
  const catRows = report.categoryAnalysis.expenses.map((c) => [
    c.categoryName,
    c.currentAmount,
    `${c.percentageOfTotal}%`,
    String(c.transactionCount),
    c.avgTransactionAmount,
    c.priorAmount,
    c.delta ?? "N/A",
    c.budgetStatus ?? "No Budget",
    c.trend,
  ]);
  lines.push(buildCsv(catHeaders, catRows));
  lines.push("");

  // 4. Merchant Breakdown
  if (report.merchantInsights.length > 0) {
    lines.push("--- MERCHANT SPENDING ---");
    const merchantHeaders = [
      "Merchant",
      "Total Spent",
      "Transactions",
      "Avg Transaction",
      "% of Expenses",
      "Prior Spent",
      "Change",
    ];
    const merchantRows = report.merchantInsights.map((m) => [
      m.merchant,
      m.totalSpent,
      String(m.transactionCount),
      m.avgTransactionAmount,
      `${m.percentageOfExpenses}%`,
      m.priorTotalSpent,
      m.delta ?? "N/A",
    ]);
    lines.push(buildCsv(merchantHeaders, merchantRows));
    lines.push("");
  }

  // 5. Weekly Spending Totals
  if (report.weeklyTotals.length > 0) {
    lines.push("--- WEEKLY SPEND BREAKDOWN ---");
    const weeklyHeaders = [
      "Week",
      "Date Range",
      "Expenses",
      "Income",
      "Net Cash Flow",
    ];
    const weeklyRows = report.weeklyTotals.map((w) => [
      w.label,
      `${w.from} to ${w.to}`,
      w.expenses,
      w.income,
      w.net,
    ]);
    lines.push(buildCsv(weeklyHeaders, weeklyRows));
    lines.push("");
  }

  // 6. Budgets
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

  // 7. Transaction Appendix
  if (report.allTransactions.length > 0) {
    lines.push("--- TRANSACTION APPENDIX ---");
    const txHeaders = [
      "Date",
      "Type",
      "Category",
      "Merchant",
      "Description",
      "Amount",
      "Currency",
    ];
    const txRows = report.allTransactions.map((tx) => [
      tx.occurredOn,
      tx.kind,
      tx.categoryName,
      tx.merchant ?? "",
      tx.description ?? "",
      tx.amount,
      tx.currency,
    ]);
    lines.push(buildCsv(txHeaders, txRows));
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

    // Parallel profile-scoped database queries
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
      timezone: current.profile.timezone,
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
