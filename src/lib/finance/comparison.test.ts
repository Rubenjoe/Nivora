import assert from "node:assert/strict";
import test from "node:test";
import { formatPercentageDelta } from "./comparison";

test("percentage delta keeps the direction for higher and lower values", () => {
  assert.equal(formatPercentageDelta("120", "100"), "+20.0%");
  assert.equal(formatPercentageDelta("80", "100"), "-20.0%");
});

test("percentage delta uses absolute prior magnitude for negative net values", () => {
  assert.equal(formatPercentageDelta("25", "-50"), "+150.0%");
  assert.equal(formatPercentageDelta("-75", "-50"), "-50.0%");
});

test("zero prior values are not divided by zero or presented as a percentage", () => {
  assert.equal(formatPercentageDelta("0", "0"), null);
  assert.equal(formatPercentageDelta("0.01", "0"), "new");
  assert.equal(formatPercentageDelta("-0.01", "0"), "new");
});
