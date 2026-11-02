import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateCategoryTotals,
  aggregateDailyActivity,
  aggregateMerchantActivity,
  type AnalyticsTransactionRow,
} from "./analytics";
import {
  buildCashFlowForecast,
  buildCategoryRadar,
  buildCategoryTreemap,
  buildMerchantBubbles,
  buildSankeyAllocation,
  completeSeries,
  fillDailyActivity,
  spendingIntensity,
} from "./chart-data";

test("completeSeries keeps every day, week, and month in the range", () => {
  const daily = completeSeries(
    [
      { label: "2026-01-01", income: "10.00", expenses: "4.00" },
      { label: "2026-01-03", income: "0.00", expenses: "8.00" },
    ],
    "2026-01-01",
    "2026-01-04",
    "daily",
  );
  assert.deepEqual(
    daily.map((point) => point.label),
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
  );
  assert.equal(daily[1]?.income, "0.00");
  assert.equal(daily[3]?.expenses, "0.00");

  const weekly = completeSeries(
    [{ label: "2026-01-12", income: "1.00", expenses: "0.00" }],
    "2026-01-07",
    "2026-01-20",
    "weekly",
  );
  assert.deepEqual(
    weekly.map((point) => point.label),
    ["2026-01-05", "2026-01-12", "2026-01-19"],
  );
  assert.equal(weekly[0]?.income, "0.00");

  const monthly = completeSeries([], "2025-11-15", "2026-02-02", "monthly");
  assert.deepEqual(
    monthly.map((point) => point.label),
    ["2025-11", "2025-12", "2026-01", "2026-02"],
  );
});

test("fillDailyActivity inserts quiet days without inventing activity", () => {
  const days = fillDailyActivity(
    [
      {
        date: "2026-02-02",
        income: "0.00",
        expenses: "25.00",
        transactionCount: 2,
      },
    ],
    "2026-02-01",
    "2026-02-03",
  );
  assert.equal(days.length, 3);
  assert.deepEqual(days[0], {
    date: "2026-02-01",
    income: "0.00",
    expenses: "0.00",
    transactionCount: 0,
  });
  assert.equal(days[1]?.transactionCount, 2);
});

test("spendingIntensity maps spend to four bounded levels", () => {
  assert.equal(spendingIntensity("0.00", "100.00"), 0);
  assert.equal(spendingIntensity("10.00", "0.00"), 0);
  assert.equal(spendingIntensity("10.00", "100.00"), 1);
  assert.equal(spendingIntensity("40.00", "100.00"), 2);
  assert.equal(spendingIntensity("99.00", "100.00"), 4);
  assert.equal(spendingIntensity("200.00", "100.00"), 4);
});

test("Sankey allocation reconciles both sides and refuses negative cash flow", () => {
  const allocation = buildSankeyAllocation(
    [
      { categoryId: "salary", name: "Salary", amount: "1000.00" },
      { categoryId: "freelance", name: "Freelance", amount: "500.00" },
    ],
    [
      { categoryId: "rent", name: "Rent", amount: "600.00" },
      { categoryId: "food", name: "Food", amount: "300.00" },
      { categoryId: "travel", name: "Transport", amount: "200.00" },
    ],
  );

  assert.equal(allocation.canRender, true);
  assert.equal(allocation.balanced, true);
  assert.equal(allocation.retained, "400.00");
  assert.equal(allocation.nodes.length, 7);
  assert.equal(allocation.links.length, 6);
  const inflow = allocation.links
    .filter((link) => link.target === "pool:recorded-income")
    .reduce((sum, link) => sum + link.value, 0);
  const outflow = allocation.links
    .filter((link) => link.source === "pool:recorded-income")
    .reduce((sum, link) => sum + link.value, 0);
  assert.equal(inflow, 1500);
  assert.equal(outflow, 1500);

  const noIncome = buildSankeyAllocation(
    [],
    [{ categoryId: "food", name: "Food", amount: "10.00" }],
  );
  assert.equal(noIncome.canRender, false);
  assert.match(noIncome.reason ?? "", /No recorded income/);

  const negative = buildSankeyAllocation(
    [{ categoryId: "salary", name: "Salary", amount: "50.00" }],
    [{ categoryId: "rent", name: "Rent", amount: "80.00" }],
  );
  assert.equal(negative.canRender, false);
  assert.match(negative.reason ?? "", /cannot reconcile negative cash flow/);
  assert.equal(negative.balanced, false);
});

test("treemap attributes recorded merchants and labels the residual honestly", () => {
  const result = buildCategoryTreemap(
    [
      { categoryId: "food", name: "Food", amount: "100.00" },
      { categoryId: "rent", name: "Rent", amount: "200.00" },
    ],
    [
      {
        merchant: "Corner Cafe",
        categoryId: "food",
        categoryName: "Food",
        totalSpent: "60.00",
        transactionCount: 3,
        avgTransactionAmount: "20.00",
      },
    ],
  );

  assert.equal(result.canRender, true);
  assert.equal(result.topCategory?.name, "Rent");
  assert.equal(result.total, "300.00");
  const food = result.data.find((node) => node.name === "Food");
  assert.deepEqual(
    food?.children?.map((child) => [child.name, child.value]),
    [
      ["Corner Cafe", 60],
      ["No merchant recorded", 40],
    ],
  );
  assert.equal(
    result.data.find((node) => node.name === "Rent")?.children,
    undefined,
  );

  const overAttributed = buildCategoryTreemap(
    [{ categoryId: "food", name: "Food", amount: "50.00" }],
    [
      {
        merchant: "Odd Vendor",
        categoryId: "food",
        categoryName: "Food",
        totalSpent: "80.00",
        transactionCount: 2,
        avgTransactionAmount: "40.00",
      },
    ],
  );
  assert.equal(overAttributed.data[0]?.children, undefined);
});

test("radar joins current and prior categories and reports the largest move", () => {
  const radar = buildCategoryRadar(
    [
      { categoryId: "food", name: "Food", amount: "100.00" },
      { categoryId: "travel", name: "Transport", amount: "50.00" },
    ],
    [
      { categoryId: "food", name: "Food", amount: "80.00" },
      { categoryId: "home", name: "Home", amount: "30.00" },
    ],
  );

  assert.equal(radar.canRender, true);
  assert.deepEqual(
    radar.categories.map((category) => category.name),
    ["Food", "Transport", "Home"],
  );
  assert.deepEqual(radar.current, [100, 50, 0]);
  assert.deepEqual(radar.prior, [80, 0, 30]);
  assert.equal(radar.notableChange?.name, "Transport");
  assert.equal(radar.notableChange?.difference, "50.00");
  assert.ok(radar.indicators.every((indicator) => indicator.max >= 1));

  const tooFew = buildCategoryRadar(
    [{ categoryId: "food", name: "Food", amount: "10.00" }],
    [{ categoryId: "food", name: "Food", amount: "5.00" }],
  );
  assert.equal(tooFew.canRender, false);
});

test("merchant bubbles cap the plot and keep average-based sizing", () => {
  const merchants = [
    {
      merchant: "A",
      categoryId: "food",
      categoryName: "Food",
      totalSpent: "300.00",
      transactionCount: 3,
      avgTransactionAmount: "100.00",
    },
    {
      merchant: "B",
      categoryId: "food",
      categoryName: "Food",
      totalSpent: "200.00",
      transactionCount: 10,
      avgTransactionAmount: "20.00",
    },
    {
      merchant: "C",
      categoryId: "rent",
      categoryName: "Rent",
      totalSpent: "100.00",
      transactionCount: 1,
      avgTransactionAmount: "100.00",
    },
  ];
  const result = buildMerchantBubbles(merchants, 2);
  assert.equal(result.canRender, true);
  assert.equal(result.points.length, 2);
  assert.equal(result.hiddenCount, 1);
  assert.equal(result.topMerchant?.merchant, "A");
  assert.deepEqual(
    result.points.map((point) => [point.x, point.y]),
    [
      [3, 300],
      [10, 200],
    ],
  );
  assert.ok(result.points[0]!.size > result.points[1]!.size);
});

test("forecast repeats recent mean net cash flow and labels its assumptions", () => {
  const forecast = buildCashFlowForecast(
    [
      { label: "2026-01", income: "400.00", expenses: "300.00" },
      { label: "2026-02", income: "500.00", expenses: "300.00" },
      { label: "2026-03", income: "300.00", expenses: "350.00" },
      { label: "2026-04", income: "450.00", expenses: "300.00" },
    ],
    "monthly",
  );

  assert.equal(forecast.canRender, true);
  assert.equal(forecast.windowBuckets, 3);
  assert.equal(forecast.meanNet, "100.00");
  assert.deepEqual(
    forecast.projection.map((point) => [point.label, point.netDisplay]),
    [
      ["2026-05", "100.00"],
      ["2026-06", "100.00"],
      ["2026-07", "100.00"],
    ],
  );
  assert.match(forecast.assumptions, /not a statistical forecast/);

  const tooShort = buildCashFlowForecast(
    [
      { label: "2026-01", income: "10.00", expenses: "5.00" },
      { label: "2026-02", income: "10.00", expenses: "5.00" },
    ],
    "monthly",
  );
  assert.equal(tooShort.canRender, false);
  assert.deepEqual(tooShort.projection, []);
});

const rows: AnalyticsTransactionRow[] = [
  {
    occurredOn: "2026-02-01",
    kind: "expense",
    amount: "20.00",
    categoryId: "food",
    categoryName: "Food",
    merchant: "Cafe",
  },
  {
    occurredOn: "2026-02-01",
    kind: "expense",
    amount: "10.00",
    categoryId: "food",
    categoryName: "Food",
    merchant: "cafe",
  },
  {
    occurredOn: "2026-02-02",
    kind: "income",
    amount: "500.00",
    categoryId: "salary",
    categoryName: "Salary",
    merchant: null,
  },
  {
    occurredOn: "2026-02-02",
    kind: "expense",
    amount: "50.00",
    categoryId: "rent",
    categoryName: "Rent",
    merchant: "  ",
  },
];

test("analytics aggregation keeps Decimal totals, counts, and deterministic order", () => {
  const daily = aggregateDailyActivity(rows);
  assert.equal(daily.length, 2);
  assert.deepEqual(daily[0], {
    date: "2026-02-01",
    income: "0.00",
    expenses: "30.00",
    transactionCount: 2,
  });
  assert.equal(daily[1]?.transactionCount, 1);
  assert.equal(daily[1]?.income, "500.00");

  const expenses = aggregateCategoryTotals(rows, "expense");
  assert.deepEqual(
    expenses.map((category) => [category.name, category.amount]),
    [
      ["Rent", "50.00"],
      ["Food", "30.00"],
    ],
  );
  const income = aggregateCategoryTotals(rows, "income");
  assert.deepEqual(
    income.map((category) => [category.name, category.amount]),
    [["Salary", "500.00"]],
  );

  const merchants = aggregateMerchantActivity(rows);
  assert.equal(merchants.length, 1);
  assert.equal(merchants[0]?.merchant, "Cafe");
  assert.equal(merchants[0]?.totalSpent, "30.00");
  assert.equal(merchants[0]?.transactionCount, 2);
  assert.equal(merchants[0]?.avgTransactionAmount, "15.00");
});
