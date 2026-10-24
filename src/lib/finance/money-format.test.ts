import assert from "node:assert/strict";
import test from "node:test";
import Decimal from "decimal.js";
import { formatMoney } from "./money-format";

test("formats INR with en-IN grouping and two decimals", () => {
  assert.equal(formatMoney("1234567.5"), "₹12,34,567.50");
  assert.equal(formatMoney("0"), "₹0.00");
});

test("keeps decimal precision without float conversion", () => {
  assert.equal(formatMoney("0.1"), "₹0.10");
  assert.equal(
    formatMoney(new Decimal("999999999999.99")),
    "₹9,99,99,99,99,999.99",
  );
});

test("renders explicit income and expense signs", () => {
  assert.equal(
    formatMoney("300", "INR", { signDisplay: "always" }),
    "+₹300.00",
  );
  assert.equal(formatMoney("150", "INR", { sign: "negative" }), "−₹150.00");
  assert.equal(formatMoney("-150", "INR"), "−₹150.00");
});

test("supports whole-number axis values and non-INR currencies", () => {
  assert.equal(
    formatMoney("1200", "INR", { minimumFractionDigits: 0 }),
    "₹1,200",
  );
  assert.equal(
    formatMoney("1200", "USD", { minimumFractionDigits: 0 }),
    "$1,200",
  );
});
