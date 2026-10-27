import assert from "node:assert/strict";
import test from "node:test";
import {
  generateMonthlyReport,
  getMonthBounds,
  formatMonthLabel,
  type RawTransaction,
  type RawCategory,
  type RawBudget,
  type RawGoal,
  type RawContribution,
} from "./monthly-report";

test("computes bounds and prior month correctly", () => {
  const bounds = getMonthBounds("2026-10");
  assert.equal(bounds.from, "2026-10-01");
  assert.equal(bounds.to, "2026-10-31");
  assert.equal(bounds.daysInMonth, 31);
  assert.equal(bounds.priorMonth, "2026-09");
  assert.equal(bounds.priorFrom, "2026-09-01");
  assert.equal(bounds.priorTo, "2026-09-30");
  assert.equal(bounds.priorDaysInMonth, 30);

  // Leap year February test
  const leapFeb = getMonthBounds("2024-02");
  assert.equal(leapFeb.daysInMonth, 29);
  assert.equal(leapFeb.priorMonth, "2024-01");

  // January rolls over to December of prior year
  const jan = getMonthBounds("2026-01");
  assert.equal(jan.priorMonth, "2025-12");
});

test("formats month labels nicely", () => {
  assert.equal(formatMonthLabel("2026-10"), "October 2026");
  assert.equal(formatMonthLabel("2026-01"), "January 2026");
});

test("generates an empty report gracefully when no transactions exist", () => {
  const report = generateMonthlyReport({
    month: "2026-10",
    currency: "INR",
    currentTransactions: [],
    priorTransactions: [],
    categories: [],
    budgets: [],
    goals: [],
    allGoalContributions: [],
  });

  assert.equal(report.periodMonth, "2026-10");
  assert.equal(report.totals.income, "0.00");
  assert.equal(report.totals.expenses, "0.00");
  assert.equal(report.totals.net, "0.00");
  assert.equal(report.totals.savingsRate, 0);
  assert.equal(report.totals.avgDailySpend, "0.00");
  assert.equal(report.comparison.incomeDelta, null);
  assert.deepEqual(report.categoryAnalysis.expenses, []);
  assert.equal(report.velocitySeries.length, 31);
  assert.ok(report.financialHealth.score >= 0);
});

test("computes totals, comparison, categories, and velocity accurately", () => {
  const categories: RawCategory[] = [
    { id: "cat-salary", name: "Salary", kind: "income", icon: "wallet" },
    { id: "cat-rent", name: "Housing", kind: "expense", icon: "home" },
    {
      id: "cat-food",
      name: "Food & Dining",
      kind: "expense",
      icon: "utensils",
    },
  ];

  const currentTransactions: RawTransaction[] = [
    {
      id: "tx-1",
      occurredOn: "2026-10-01",
      kind: "income",
      amount: "100000.00",
      currency: "INR",
      categoryId: "cat-salary",
      merchant: "Acme Corp",
      description: "Monthly salary",
      createdAt: new Date("2026-10-01T09:00:00Z"),
    },
    {
      id: "tx-2",
      occurredOn: "2026-10-02",
      kind: "expense",
      amount: "30000.00",
      currency: "INR",
      categoryId: "cat-rent",
      merchant: "Landlord",
      description: "October rent",
      createdAt: new Date("2026-10-02T10:00:00Z"),
    },
    {
      id: "tx-3",
      occurredOn: "2026-10-15",
      kind: "expense",
      amount: "10000.00",
      currency: "INR",
      categoryId: "cat-food",
      merchant: "Supermarket",
      description: "Groceries",
      createdAt: new Date("2026-10-15T12:00:00Z"),
    },
  ];

  const priorTransactions: RawTransaction[] = [
    {
      id: "tx-prior-1",
      occurredOn: "2026-09-01",
      kind: "income",
      amount: "90000.00",
      currency: "INR",
      categoryId: "cat-salary",
      merchant: "Acme Corp",
      description: "September salary",
      createdAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      id: "tx-prior-2",
      occurredOn: "2026-09-02",
      kind: "expense",
      amount: "50000.00",
      currency: "INR",
      categoryId: "cat-rent",
      merchant: "Landlord",
      description: "September rent + repairs",
      createdAt: new Date("2026-09-02T10:00:00Z"),
    },
  ];

  const budgets: RawBudget[] = [
    {
      id: "b-1",
      name: "Housing Budget",
      categoryId: "cat-rent",
      amount: "35000.00",
      warningThresholdPercent: 80,
    },
    {
      id: "b-2",
      name: "Food Budget",
      categoryId: "cat-food",
      amount: "8000.00",
      warningThresholdPercent: 80,
    },
  ];

  const goals: RawGoal[] = [
    {
      id: "g-1",
      name: "Emergency Fund",
      targetAmount: "200000.00",
      status: "active",
    },
  ];

  const contributions: RawContribution[] = [
    {
      goalId: "g-1",
      amount: "20000.00",
      contributedOn: "2026-10-05",
    },
    {
      goalId: "g-1",
      amount: "15000.00",
      contributedOn: "2026-09-05",
    },
  ];

  const report = generateMonthlyReport({
    month: "2026-10",
    currency: "INR",
    currentTransactions,
    priorTransactions,
    categories,
    budgets,
    goals,
    allGoalContributions: contributions,
  });

  // Check Totals
  assert.equal(report.totals.income, "100000.00");
  assert.equal(report.totals.expenses, "40000.00");
  assert.equal(report.totals.net, "60000.00");
  // Savings rate = (100000 - 40000) / 100000 * 100 = 60%
  assert.equal(report.totals.savingsRate, 60);

  // Prior totals
  assert.equal(report.priorTotals.income, "90000.00");
  assert.equal(report.priorTotals.expenses, "50000.00");

  // Comparison
  // Income rose from 90k to 100k (+11.1%)
  assert.equal(report.comparison.incomeDelta, "+11.1%");
  // Expenses dropped from 50k to 40k (-20.0%)
  assert.equal(report.comparison.expenseDelta, "-20.0%");
  assert.equal(report.comparison.expenseDifference, "-10000.00");

  // Category analysis
  assert.equal(report.categoryAnalysis.expenses.length, 2);
  assert.equal(
    report.categoryAnalysis.topExpenseCategory?.categoryName,
    "Housing",
  );
  assert.equal(
    report.categoryAnalysis.topExpenseCategory?.currentAmount,
    "30000.00",
  );
  // 30,000 / 40,000 = 75%
  assert.equal(
    report.categoryAnalysis.topExpenseCategory?.percentageOfTotal,
    75,
  );

  // Budgets
  // Housing: 30,000 / 35,000 = 85.7% (status: warning since >= 80%)
  const housingBudget = report.budgetPerformance.budgets.find(
    (b) => b.id === "b-1",
  );
  assert.equal(housingBudget?.status, "warning");

  // Food: 10,000 / 8,000 = 125% (status: over_budget)
  const foodBudget = report.budgetPerformance.budgets.find(
    (b) => b.id === "b-2",
  );
  assert.equal(foodBudget?.status, "over_budget");
  assert.equal(report.budgetPerformance.overBudgetCount, 1);

  // Goals
  assert.equal(report.goalsProgress.totalContributedInMonth, "20000.00");
  assert.equal(report.goalsProgress.goals[0]?.totalSaved, "35000.00");
  assert.equal(report.goalsProgress.goals[0]?.contributedThisMonth, "20000.00");

  // Velocity series
  assert.equal(report.velocitySeries.length, 31);
  assert.equal(report.velocitySeries[1]?.currentCumulativeSpend, "30000.00"); // day 2 cumulative spend was 30k
  assert.equal(report.velocitySeries[30]?.currentCumulativeSpend, "40000.00"); // end of month 40k

  // Highlights
  assert.ok(report.highlights.length > 0);
  assert.equal(report.financialHealth.score, 85);
  assert.equal(report.financialHealth.rating, "Exceptional");
});
