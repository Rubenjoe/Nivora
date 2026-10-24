import assert from "node:assert/strict";
import test from "node:test";
import { canChangeProfileCurrency } from "./currency-change";

test("currency preference can change when no financial records exist", () => {
  assert.equal(canChangeProfileCurrency("INR", "USD", false), true);
});

test("currency preference may be re-saved unchanged with existing records", () => {
  assert.equal(canChangeProfileCurrency("INR", "INR", true), true);
});

test("currency preference cannot silently re-denominate existing financial data", () => {
  assert.equal(canChangeProfileCurrency("INR", "USD", true), false);
});
