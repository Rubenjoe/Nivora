import assert from "node:assert/strict";
import test from "node:test";
import {
  generateMonthlyReport,
  getMonthBounds,
  formatMonthLabel,
  getLocalTodayISO,
  type RawTransaction,
  type RawCategory,
  type RawBudget,
  type RawGoal,
  type RawContribution,
} from "./monthly-report";
import {
  evaluateMonthlyNotification,
  getPreviousMonthISO,
} from "./monthly-notification";

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
  assert.equal(report.totals.totalTransactionCount, 0);
  assert.equal(report.totals.expenseCount, 0);
  assert.equal(report.totals.incomeCount, 0);
  assert.equal(report.totals.avgExpenseAmount, "0.00");
  assert.equal(report.totals.highestSpendingDay, null);
  assert.equal(report.comparison.incomeDelta, null);
  assert.deepEqual(report.categoryAnalysis.expenses, []);
  assert.equal(report.velocitySeries.length, 31);
  assert.equal(report.weeklyTotals.length, 5);
  assert.equal(report.allTransactions.length, 0);
  assert.ok(report.financialHealth.score >= 0);
});

test("computes totals, operational metrics, comparison, categories, and velocity accurately", () => {
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
    timezone: "Asia/Kolkata",
  });

  // Check Totals
  assert.equal(report.totals.income, "100000.00");
  assert.equal(report.totals.expenses, "40000.00");
  assert.equal(report.totals.net, "60000.00");
  // Savings rate = (100000 - 40000) / 100000 * 100 = 60%
  assert.equal(report.totals.savingsRate, 60);

  // Transaction counts & averages
  assert.equal(report.totals.totalTransactionCount, 3);
  assert.equal(report.totals.expenseCount, 2);
  assert.equal(report.totals.incomeCount, 1);
  assert.equal(report.totals.avgExpenseAmount, "20000.00"); // 40k / 2
  assert.equal(report.totals.avgIncomeAmount, "100000.00");

  // Peak spending day
  assert.ok(report.totals.highestSpendingDay);
  assert.equal(report.totals.highestSpendingDay.day, 2);
  assert.equal(report.totals.highestSpendingDay.date, "2026-10-02");
  assert.equal(report.totals.highestSpendingDay.amount, "30000.00");

  // Prior totals
  assert.equal(report.priorTotals.income, "90000.00");
  assert.equal(report.priorTotals.expenses, "50000.00");
  assert.equal(report.priorTotals.totalTransactionCount, 2);

  // Comparison
  // Income rose from 90k to 100k (+11.1%)
  assert.equal(report.comparison.incomeDelta, "+11.1%");
  // Expenses dropped from 50k to 40k (-20.0%)
  assert.equal(report.comparison.expenseDelta, "-20.0%");
  assert.equal(report.comparison.expenseDifference, "-10000.00");

  // Category analysis
  assert.equal(report.categoryAnalysis.expenses.length, 2);
  const housingCat = report.categoryAnalysis.expenses.find(
    (c) => c.categoryName === "Housing",
  );
  assert.ok(housingCat);
  assert.equal(housingCat.currentAmount, "30000.00");
  assert.equal(housingCat.transactionCount, 1);
  assert.equal(housingCat.avgTransactionAmount, "30000.00");
  assert.equal(housingCat.budgetedAmount, "35000.00");
  assert.equal(housingCat.budgetStatus, "warning"); // 30k / 35k = 85.7% >= 80%

  // Food Category
  const foodCat = report.categoryAnalysis.expenses.find(
    (c) => c.categoryName === "Food & Dining",
  );
  assert.ok(foodCat);
  assert.equal(foodCat.budgetStatus, "over_budget"); // 10k / 8k = 125%

  // Merchant Insights
  assert.equal(report.merchantInsights.length, 2);
  const landlord = report.merchantInsights.find(
    (m) => m.merchant === "Landlord",
  );
  assert.ok(landlord);
  assert.equal(landlord.totalSpent, "30000.00");
  assert.equal(landlord.priorTotalSpent, "50000.00");
  assert.equal(landlord.delta, "-40.0%");

  // Weekly Totals
  assert.equal(report.weeklyTotals.length, 5);
  // Week 1 (Days 1–7): day 1 income 100k, day 2 expense 30k
  assert.equal(report.weeklyTotals[0]?.expenses, "30000.00");
  assert.equal(report.weeklyTotals[0]?.income, "100000.00");
  // Week 3 (Days 15–21): day 15 expense 10k
  assert.equal(report.weeklyTotals[2]?.expenses, "10000.00");

  // Budgets
  const housingBudget = report.budgetPerformance.budgets.find(
    (b) => b.id === "b-1",
  );
  assert.equal(housingBudget?.status, "warning");

  const foodBudget = report.budgetPerformance.budgets.find(
    (b) => b.id === "b-2",
  );
  assert.equal(foodBudget?.status, "over_budget");
  assert.equal(report.budgetPerformance.overBudgetCount, 1);

  // Goals
  assert.equal(report.goalsProgress.totalContributedInMonth, "20000.00");
  assert.equal(report.goalsProgress.goals[0]?.totalSaved, "35000.00");

  // Velocity series
  assert.equal(report.velocitySeries.length, 31);
  assert.equal(report.velocitySeries[1]?.currentCumulativeSpend, "30000.00");
  assert.equal(report.velocitySeries[30]?.currentCumulativeSpend, "40000.00");

  // Transaction Appendix
  assert.equal(report.allTransactions.length, 3);
  assert.equal(report.allTransactions[0]?.occurredOn, "2026-10-15");

  // Highlights & Health
  assert.ok(report.highlights.length > 0);
  assert.equal(report.financialHealth.score, 85);
  assert.equal(report.financialHealth.rating, "Exceptional");
});

test("evaluates monthly notification readiness based on user history and timezone", () => {
  const prevMonth = getPreviousMonthISO("2026-10-27");
  assert.equal(prevMonth, "2026-09");

  const janRoll = getPreviousMonthISO("2026-01-15");
  assert.equal(janRoll, "2025-12");

  // User registered before end of previous month
  const statusEligible = evaluateMonthlyNotification({
    timeZone: "Asia/Kolkata",
    userCreatedAt: new Date("2026-08-15T00:00:00Z"),
    hasTransactionsInPriorMonth: true,
  });
  assert.equal(statusEligible.isReady, true);
  assert.equal(statusEligible.hasActivity, true);

  // Brand new user registered after previous month ended with 0 transactions in prior month
  const statusNew = evaluateMonthlyNotification({
    timeZone: "Asia/Kolkata",
    userCreatedAt: new Date("2026-10-05T00:00:00Z"),
    hasTransactionsInPriorMonth: false,
  });
  assert.equal(statusNew.isReady, false);
});
