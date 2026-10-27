import Decimal from "decimal.js";
import { formatPercentageDelta } from "@/lib/finance/comparison";

export type RawTransaction = {
  id: string;
  occurredOn: string;
  kind: "income" | "expense";
  amount: string;
  currency: string;
  categoryId: string;
  merchant: string | null;
  description: string | null;
  createdAt: Date;
};

export type RawCategory = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string;
};

export type RawBudget = {
  id: string;
  name: string;
  categoryId: string | null;
  amount: string;
  warningThresholdPercent: number;
};

export type RawGoal = {
  id: string;
  name: string;
  targetAmount: string;
  status: string;
};

export type RawContribution = {
  goalId: string;
  amount: string;
  contributedOn: string;
};

export type CategoryAnalysisItem = {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentAmount: string;
  priorAmount: string;
  percentageOfTotal: number;
  delta: string | null;
  trend: "increased" | "decreased" | "stable" | "new";
};

export type DailyVelocityItem = {
  day: number;
  date: string;
  currentDailySpend: string;
  currentCumulativeSpend: string;
  priorCumulativeSpend: string;
};

export type BudgetReportItem = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  budgeted: string;
  spent: string;
  remaining: string;
  percent: number;
  status: "on_track" | "warning" | "over_budget";
};

export type GoalReportItem = {
  id: string;
  name: string;
  targetAmount: string;
  contributedThisMonth: string;
  totalSaved: string;
  percent: number;
};

export type TopTransactionItem = {
  id: string;
  occurredOn: string;
  amount: string;
  categoryName: string;
  merchant: string | null;
  description: string | null;
};

export type TopMerchantItem = {
  merchant: string;
  totalSpent: string;
  transactionCount: number;
  percentageOfExpenses: number;
};

export type ReportHighlight = {
  type: "positive" | "warning" | "neutral" | "info";
  title: string;
  description: string;
};

export type FinancialHealthReport = {
  score: number;
  rating: "Exceptional" | "Healthy" | "Fair" | "Needs Attention";
  breakdown: {
    savingsRateScore: number;
    budgetScore: number;
    spendDisciplineScore: number;
    goalsScore: number;
  };
};

export type MonthlyReportResult = {
  periodMonth: string; // "YYYY-MM"
  priorMonth: string; // "YYYY-MM"
  monthLabel: string; // e.g. "October 2026"
  priorMonthLabel: string; // e.g. "September 2026"
  currency: string;
  daysInMonth: number;
  totals: {
    income: string;
    expenses: string;
    net: string;
    savingsRate: number;
    avgDailySpend: string;
  };
  priorTotals: {
    income: string;
    expenses: string;
    net: string;
    savingsRate: number;
    avgDailySpend: string;
  };
  comparison: {
    incomeDelta: string | null;
    expenseDelta: string | null;
    netDelta: string | null;
    savingsRateDelta: number;
    expenseDifference: string;
  };
  categoryAnalysis: {
    expenses: CategoryAnalysisItem[];
    income: CategoryAnalysisItem[];
    topExpenseCategory: CategoryAnalysisItem | null;
  };
  velocitySeries: DailyVelocityItem[];
  budgetPerformance: {
    budgets: BudgetReportItem[];
    totalBudgeted: string;
    totalSpent: string;
    adherenceRate: number;
    overBudgetCount: number;
  };
  goalsProgress: {
    totalContributedInMonth: string;
    goals: GoalReportItem[];
  };
  topTransactions: TopTransactionItem[];
  merchantInsights: TopMerchantItem[];
  financialHealth: FinancialHealthReport;
  highlights: ReportHighlight[];
};

export function getMonthBounds(monthStr: string) {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthNumStr!, 10) - 1; // 0-indexed
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const daysInMonth = endDate.getDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  // Prior month
  const priorStart = new Date(year, month - 1, 1);
  const priorEnd = new Date(year, month, 0);
  const priorYear = priorStart.getFullYear();
  const priorMonthNum = priorStart.getMonth() + 1;
  const priorMonthStr = `${priorYear}-${pad(priorMonthNum)}`;
  const priorFrom = `${priorYear}-${pad(priorMonthNum)}-01`;
  const priorTo = `${priorYear}-${pad(priorMonthNum)}-${pad(priorEnd.getDate())}`;

  return {
    from,
    to,
    daysInMonth,
    priorMonth: priorMonthStr,
    priorFrom,
    priorTo,
    priorDaysInMonth: priorEnd.getDate(),
  };
}

export function formatMonthLabel(monthStr: string): string {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthNumStr!, 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function generateMonthlyReport({
  month,
  currency,
  currentTransactions,
  priorTransactions,
  categories,
  budgets,
  goals,
  allGoalContributions,
}: {
  month: string; // "YYYY-MM"
  currency: string;
  currentTransactions: RawTransaction[];
  priorTransactions: RawTransaction[];
  categories: RawCategory[];
  budgets: RawBudget[];
  goals: RawGoal[];
  allGoalContributions: RawContribution[];
}): MonthlyReportResult {
  const bounds = getMonthBounds(month);
  const monthLabel = formatMonthLabel(month);
  const priorMonthLabel = formatMonthLabel(bounds.priorMonth);

  // Category lookup
  const categoryMap = new Map<string, RawCategory>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  // 1. Current Month Totals
  let currentIncome = new Decimal(0);
  let currentExpenses = new Decimal(0);
  const currentCategoryExpenses = new Map<string, Decimal>();
  const currentCategoryIncome = new Map<string, Decimal>();
  const dailySpendMap = new Map<number, Decimal>();

  for (const tx of currentTransactions) {
    if (tx.currency !== currency) continue;
    const amount = new Decimal(tx.amount);
    const day = parseInt(tx.occurredOn.slice(8, 10), 10);

    if (tx.kind === "income") {
      currentIncome = currentIncome.plus(amount);
      const priorCat =
        currentCategoryIncome.get(tx.categoryId) ?? new Decimal(0);
      currentCategoryIncome.set(tx.categoryId, priorCat.plus(amount));
    } else {
      currentExpenses = currentExpenses.plus(amount);
      const priorCat =
        currentCategoryExpenses.get(tx.categoryId) ?? new Decimal(0);
      currentCategoryExpenses.set(tx.categoryId, priorCat.plus(amount));

      const dayTotal = dailySpendMap.get(day) ?? new Decimal(0);
      dailySpendMap.set(day, dayTotal.plus(amount));
    }
  }

  const currentNet = currentIncome.minus(currentExpenses);
  const currentSavingsRate = currentIncome.greaterThan(0)
    ? Math.max(
        0,
        Math.min(
          100,
          Number(currentNet.div(currentIncome).mul(100).toFixed(1)),
        ),
      )
    : 0;
  const currentAvgDailySpend =
    bounds.daysInMonth > 0
      ? currentExpenses.div(bounds.daysInMonth).toFixed(2)
      : "0.00";

  // 2. Prior Month Totals
  let priorIncome = new Decimal(0);
  let priorExpenses = new Decimal(0);
  const priorCategoryExpenses = new Map<string, Decimal>();
  const priorCategoryIncome = new Map<string, Decimal>();
  const priorDailySpendMap = new Map<number, Decimal>();

  for (const tx of priorTransactions) {
    if (tx.currency !== currency) continue;
    const amount = new Decimal(tx.amount);
    const day = parseInt(tx.occurredOn.slice(8, 10), 10);

    if (tx.kind === "income") {
      priorIncome = priorIncome.plus(amount);
      const priorCat = priorCategoryIncome.get(tx.categoryId) ?? new Decimal(0);
      priorCategoryIncome.set(tx.categoryId, priorCat.plus(amount));
    } else {
      priorExpenses = priorExpenses.plus(amount);
      const priorCat =
        priorCategoryExpenses.get(tx.categoryId) ?? new Decimal(0);
      priorCategoryExpenses.set(tx.categoryId, priorCat.plus(amount));

      const dayTotal = priorDailySpendMap.get(day) ?? new Decimal(0);
      priorDailySpendMap.set(day, dayTotal.plus(amount));
    }
  }

  const priorNet = priorIncome.minus(priorExpenses);
  const priorSavingsRate = priorIncome.greaterThan(0)
    ? Math.max(
        0,
        Math.min(100, Number(priorNet.div(priorIncome).mul(100).toFixed(1))),
      )
    : 0;
  const priorAvgDailySpend =
    bounds.priorDaysInMonth > 0
      ? priorExpenses.div(bounds.priorDaysInMonth).toFixed(2)
      : "0.00";

  // 3. Comparison
  const incomeDelta = formatPercentageDelta(
    currentIncome.toFixed(2),
    priorIncome.toFixed(2),
  );
  const expenseDelta = formatPercentageDelta(
    currentExpenses.toFixed(2),
    priorExpenses.toFixed(2),
  );
  const netDelta = formatPercentageDelta(
    currentNet.toFixed(2),
    priorNet.toFixed(2),
  );
  const savingsRateDelta = Number(
    (currentSavingsRate - priorSavingsRate).toFixed(1),
  );
  const expenseDifference = currentExpenses.minus(priorExpenses).toFixed(2);

  // 4. Category Analysis (Expenses & Income)
  const buildCategoryAnalysis = (
    currentMap: Map<string, Decimal>,
    priorMap: Map<string, Decimal>,
    totalAmount: Decimal,
  ): CategoryAnalysisItem[] => {
    const allCatIds = new Set([...currentMap.keys(), ...priorMap.keys()]);
    const items: CategoryAnalysisItem[] = [];

    for (const catId of allCatIds) {
      const cur = currentMap.get(catId) ?? new Decimal(0);
      const pri = priorMap.get(catId) ?? new Decimal(0);
      if (cur.isZero() && pri.isZero()) continue;

      const cat = categoryMap.get(catId);
      const categoryName = cat?.name ?? "Other";
      const icon = cat?.icon ?? "circle-help";

      const pct = totalAmount.greaterThan(0)
        ? Number(cur.div(totalAmount).mul(100).toFixed(1))
        : 0;

      const delta = formatPercentageDelta(cur.toFixed(2), pri.toFixed(2));
      let trend: "increased" | "decreased" | "stable" | "new" = "stable";
      if (pri.isZero()) {
        trend = "new";
      } else if (cur.greaterThan(pri)) {
        trend = "increased";
      } else if (cur.lessThan(pri)) {
        trend = "decreased";
      }

      items.push({
        categoryId: catId,
        categoryName,
        icon,
        currentAmount: cur.toFixed(2),
        priorAmount: pri.toFixed(2),
        percentageOfTotal: pct,
        delta,
        trend,
      });
    }

    return items.sort(
      (a, b) => parseFloat(b.currentAmount) - parseFloat(a.currentAmount),
    );
  };

  const expenseCategories = buildCategoryAnalysis(
    currentCategoryExpenses,
    priorCategoryExpenses,
    currentExpenses,
  );
  const incomeCategories = buildCategoryAnalysis(
    currentCategoryIncome,
    priorCategoryIncome,
    currentIncome,
  );
  const topExpenseCategory = expenseCategories[0] ?? null;

  // 5. Daily Cumulative Velocity Curve
  const velocitySeries: DailyVelocityItem[] = [];
  let cumSpend = new Decimal(0);
  let priorCumSpend = new Decimal(0);

  for (let d = 1; d <= bounds.daysInMonth; d++) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${month}-${pad(d)}`;
    const daily = dailySpendMap.get(d) ?? new Decimal(0);
    cumSpend = cumSpend.plus(daily);

    const priorDaily = priorDailySpendMap.get(d) ?? new Decimal(0);
    priorCumSpend = priorCumSpend.plus(priorDaily);

    velocitySeries.push({
      day: d,
      date: dateStr,
      currentDailySpend: daily.toFixed(2),
      currentCumulativeSpend: cumSpend.toFixed(2),
      priorCumulativeSpend: priorCumSpend.toFixed(2),
    });
  }

  // 6. Budget Performance
  let totalBudgeted = new Decimal(0);
  let totalBudgetSpent = new Decimal(0);
  let overBudgetCount = 0;

  const budgetItems: BudgetReportItem[] = budgets.map((b) => {
    const budgetedDec = new Decimal(b.amount);
    totalBudgeted = totalBudgeted.plus(budgetedDec);

    let spentDec = new Decimal(0);
    if (b.categoryId) {
      spentDec = currentCategoryExpenses.get(b.categoryId) ?? new Decimal(0);
    } else {
      spentDec = currentExpenses;
    }
    totalBudgetSpent = totalBudgetSpent.plus(spentDec);

    const remainingDec = budgetedDec.minus(spentDec);
    const percent = budgetedDec.greaterThan(0)
      ? Number(spentDec.div(budgetedDec).mul(100).toFixed(1))
      : 0;

    let status: "on_track" | "warning" | "over_budget" = "on_track";
    if (percent > 100) {
      status = "over_budget";
      overBudgetCount++;
    } else if (percent >= b.warningThresholdPercent) {
      status = "warning";
    }

    const cat = b.categoryId ? categoryMap.get(b.categoryId) : null;

    return {
      id: b.id,
      name: b.name,
      categoryId: b.categoryId,
      categoryName: cat?.name ?? null,
      budgeted: budgetedDec.toFixed(2),
      spent: spentDec.toFixed(2),
      remaining: remainingDec.toFixed(2),
      percent,
      status,
    };
  });

  const adherenceRate =
    budgets.length > 0
      ? Math.round(((budgets.length - overBudgetCount) / budgets.length) * 100)
      : 100;

  // 7. Savings Goals Progress
  let totalContributedInMonth = new Decimal(0);
  const goalContributionThisMonth = new Map<string, Decimal>();
  const goalContributionTotal = new Map<string, Decimal>();

  for (const c of allGoalContributions) {
    const amt = new Decimal(c.amount);
    const isThisMonth = c.contributedOn.startsWith(month);

    const curTotal = goalContributionTotal.get(c.goalId) ?? new Decimal(0);
    goalContributionTotal.set(c.goalId, curTotal.plus(amt));

    if (isThisMonth) {
      totalContributedInMonth = totalContributedInMonth.plus(amt);
      const curMonthVal =
        goalContributionThisMonth.get(c.goalId) ?? new Decimal(0);
      goalContributionThisMonth.set(c.goalId, curMonthVal.plus(amt));
    }
  }

  const goalItems: GoalReportItem[] = goals.map((g) => {
    const target = new Decimal(g.targetAmount);
    const totalSaved = goalContributionTotal.get(g.id) ?? new Decimal(0);
    const thisMonth = goalContributionThisMonth.get(g.id) ?? new Decimal(0);
    const percent = target.greaterThan(0)
      ? Number(totalSaved.div(target).mul(100).toFixed(1))
      : 0;

    return {
      id: g.id,
      name: g.name,
      targetAmount: target.toFixed(2),
      contributedThisMonth: thisMonth.toFixed(2),
      totalSaved: totalSaved.toFixed(2),
      percent,
    };
  });

  // 8. Top 5 Transactions
  const topTransactions: TopTransactionItem[] = currentTransactions
    .filter((tx) => tx.kind === "expense" && tx.currency === currency)
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, 5)
    .map((tx) => ({
      id: tx.id,
      occurredOn: tx.occurredOn,
      amount: new Decimal(tx.amount).toFixed(2),
      categoryName: categoryMap.get(tx.categoryId)?.name ?? "Expense",
      merchant: tx.merchant,
      description: tx.description,
    }));

  // 9. Merchant Insights (Top 5 merchants)
  const merchantMap = new Map<string, { total: Decimal; count: number }>();
  for (const tx of currentTransactions) {
    if (tx.kind === "expense" && tx.currency === currency && tx.merchant) {
      const cleanMerchant = tx.merchant.trim();
      if (!cleanMerchant) continue;
      const amt = new Decimal(tx.amount);
      const existing = merchantMap.get(cleanMerchant) ?? {
        total: new Decimal(0),
        count: 0,
      };
      merchantMap.set(cleanMerchant, {
        total: existing.total.plus(amt),
        count: existing.count + 1,
      });
    }
  }

  const merchantInsights: TopMerchantItem[] = [...merchantMap.entries()]
    .map(([merchant, stat]) => ({
      merchant,
      totalSpent: stat.total.toFixed(2),
      transactionCount: stat.count,
      percentageOfExpenses: currentExpenses.greaterThan(0)
        ? Number(stat.total.div(currentExpenses).mul(100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
    .slice(0, 5);

  // 10. Financial Health Score (0 - 100)
  // Savings Rate: up to 40 points (40 if >= 30%, linear below)
  const savingsRateScore = Math.min(
    40,
    Math.round((Math.max(0, currentSavingsRate) / 30) * 40),
  );

  // Budget Score: up to 30 points based on adherence
  const budgetScore =
    budgets.length > 0 ? Math.round((adherenceRate / 100) * 30) : 25; // default 25 if no budgets set

  // Spend Discipline Score: up to 20 points
  // If expenses decreased or increased <= 5% compared to prior, full marks
  let spendDisciplineScore = 15;
  if (priorExpenses.greaterThan(0)) {
    const expenseRatio = currentExpenses.div(priorExpenses).toNumber();
    if (expenseRatio <= 1.0) {
      spendDisciplineScore = 20;
    } else if (expenseRatio <= 1.1) {
      spendDisciplineScore = 15;
    } else if (expenseRatio <= 1.25) {
      spendDisciplineScore = 10;
    } else {
      spendDisciplineScore = 5;
    }
  }

  // Goals Score: up to 10 points
  const goalsScore = totalContributedInMonth.greaterThan(0) ? 10 : 5;

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      savingsRateScore + budgetScore + spendDisciplineScore + goalsScore,
    ),
  );

  let rating: "Exceptional" | "Healthy" | "Fair" | "Needs Attention" =
    "Healthy";
  if (totalScore >= 85) rating = "Exceptional";
  else if (totalScore >= 70) rating = "Healthy";
  else if (totalScore >= 50) rating = "Fair";
  else rating = "Needs Attention";

  const financialHealth: FinancialHealthReport = {
    score: totalScore,
    rating,
    breakdown: {
      savingsRateScore,
      budgetScore,
      spendDisciplineScore,
      goalsScore,
    },
  };

  // 11. Automated Smart Insights & Highlights
  const highlights: ReportHighlight[] = [];

  // Highlight 1: Savings rate
  if (currentSavingsRate >= 20) {
    highlights.push({
      type: "positive",
      title: "Strong Savings Momentum",
      description: `You maintained a healthy savings rate of ${currentSavingsRate}% this month, exceeding the standard 20% benchmark.`,
    });
  } else if (currentIncome.greaterThan(0) && currentSavingsRate > 0) {
    highlights.push({
      type: "neutral",
      title: "Positive Net Cash Flow",
      description: `You saved ${currentSavingsRate}% of your income. Increasing your savings rate by even 5% next month can compound your financial buffer.`,
    });
  } else if (currentExpenses.greaterThan(currentIncome)) {
    highlights.push({
      type: "warning",
      title: "Expenses Exceeded Income",
      description: `Monthly spending exceeded income by ${currentExpenses.minus(currentIncome).toFixed(2)} ${currency}. Review discretionary spending to restore balance.`,
    });
  }

  // Highlight 2: Expense variance vs prior month
  if (priorExpenses.greaterThan(0)) {
    const diff = currentExpenses.minus(priorExpenses);
    if (diff.isNegative()) {
      highlights.push({
        type: "positive",
        title: "Reduced Monthly Outflow",
        description: `Your spending was ${diff.abs().toFixed(2)} ${currency} lower (${expenseDelta ?? "0%"}) than in ${priorMonthLabel}.`,
      });
    } else if (diff.greaterThan(0)) {
      highlights.push({
        type: "neutral",
        title: "Spending Rose Month-Over-Month",
        description: `Expenses increased by ${diff.toFixed(2)} ${currency} (${expenseDelta ?? "0%"}) compared to ${priorMonthLabel}.`,
      });
    }
  }

  // Highlight 3: Dominant spending category
  if (topExpenseCategory && parseFloat(topExpenseCategory.currentAmount) > 0) {
    highlights.push({
      type: "info",
      title: `Top Category: ${topExpenseCategory.categoryName}`,
      description: `${topExpenseCategory.categoryName} represented ${topExpenseCategory.percentageOfTotal}% of total expenses (${topExpenseCategory.currentAmount} ${currency}).`,
    });
  }

  // Highlight 4: Budgets
  if (budgets.length > 0) {
    if (overBudgetCount === 0) {
      highlights.push({
        type: "positive",
        title: "All Budgets Honored",
        description: `Excellent discipline! All ${budgets.length} monitored budget categories stayed within their target limits.`,
      });
    } else {
      highlights.push({
        type: "warning",
        title: `${overBudgetCount} Budget${overBudgetCount > 1 ? "s" : ""} Over Target`,
        description: `${overBudgetCount} of ${budgets.length} budgets exceeded 100% capacity. Check category breakdowns to make adjustments.`,
      });
    }
  }

  // Highlight 5: Goals contribution
  if (totalContributedInMonth.greaterThan(0)) {
    highlights.push({
      type: "positive",
      title: "Goal Contributions Active",
      description: `You allocated ${totalContributedInMonth.toFixed(2)} ${currency} toward your savings targets this month.`,
    });
  }

  return {
    periodMonth: month,
    priorMonth: bounds.priorMonth,
    monthLabel,
    priorMonthLabel,
    currency,
    daysInMonth: bounds.daysInMonth,
    totals: {
      income: currentIncome.toFixed(2),
      expenses: currentExpenses.toFixed(2),
      net: currentNet.toFixed(2),
      savingsRate: currentSavingsRate,
      avgDailySpend: currentAvgDailySpend,
    },
    priorTotals: {
      income: priorIncome.toFixed(2),
      expenses: priorExpenses.toFixed(2),
      net: priorNet.toFixed(2),
      savingsRate: priorSavingsRate,
      avgDailySpend: priorAvgDailySpend,
    },
    comparison: {
      incomeDelta,
      expenseDelta,
      netDelta,
      savingsRateDelta,
      expenseDifference,
    },
    categoryAnalysis: {
      expenses: expenseCategories,
      income: incomeCategories,
      topExpenseCategory,
    },
    velocitySeries,
    budgetPerformance: {
      budgets: budgetItems,
      totalBudgeted: totalBudgeted.toFixed(2),
      totalSpent: totalBudgetSpent.toFixed(2),
      adherenceRate,
      overBudgetCount,
    },
    goalsProgress: {
      totalContributedInMonth: totalContributedInMonth.toFixed(2),
      goals: goalItems,
    },
    topTransactions,
    merchantInsights,
    financialHealth,
    highlights,
  };
}
