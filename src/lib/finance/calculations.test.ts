import assert from "node:assert/strict";
import test from "node:test";
import { calculateCashFlow } from "./calculations";

test("calculates empty and negative cash flow without float conversion", () => {
  assert.deepEqual(calculateCashFlow([], "INR"), {
    income: "0.00",
    expenses: "0.00",
    net: "0.00",
  });
  assert.deepEqual(
    calculateCashFlow(
      [
        { amount: "0.10", kind: "income", currency: "INR" },
        { amount: "0.20", kind: "income", currency: "INR" },
        { amount: "0.03", kind: "expense", currency: "INR" },
        { amount: "0.04", kind: "expense", currency: "INR" },
      ],
      "INR",
    ),
    { income: "0.30", expenses: "0.07", net: "0.23" },
  );
  assert.deepEqual(
    calculateCashFlow(
      [
        { amount: "12.3456", kind: "income", currency: "INR" },
        { amount: "120.0001", kind: "expense", currency: "INR" },
      ],
      "INR",
    ),
    { income: "12.35", expenses: "120.00", net: "-107.65" },
  );
});

test("calculates exact cash flow without combining currencies", () => {
  assert.deepEqual(
    calculateCashFlow(
      [
        { amount: "0.10", kind: "income", currency: "INR" },
        { amount: "0.20", kind: "income", currency: "INR" },
        { amount: "0.05", kind: "expense", currency: "INR" },
        { amount: "100.00", kind: "income", currency: "USD" },
      ],
      "INR",
    ),
    { income: "0.30", expenses: "0.05", net: "0.25" },
  );
});
