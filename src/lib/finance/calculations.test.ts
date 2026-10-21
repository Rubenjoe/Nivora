import assert from "node:assert/strict";
import test from "node:test";
import { calculateCashFlow } from "./calculations";

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
