import assert from "node:assert/strict";
import test from "node:test";
import {
  monthStartDate,
  transactionInput,
  transactionQuery,
} from "./validation";

test("transaction filters reject reversed date boundaries", () => {
  assert.equal(
    transactionQuery.safeParse({ from: "2026-10-22", to: "2026-10-21" })
      .success,
    false,
  );
  assert.equal(
    transactionQuery.safeParse({ from: "2026-10-21", to: "2026-10-21" })
      .success,
    true,
  );
});

test("budget period dates must be valid first-of-month dates", () => {
  assert.equal(monthStartDate.safeParse("2026-02-01").success, true);
  assert.equal(monthStartDate.safeParse("2026-02-02").success, false);
  assert.equal(monthStartDate.safeParse("2026-13-01").success, false);
});

test("transaction input rejects empty, nonpositive, over-precision, and invalid-date records", () => {
  const valid = {
    kind: "expense",
    amount: "1.20",
    categoryId: "11111111-1111-4111-8111-111111111111",
    occurredOn: "2026-10-24",
  };
  assert.equal(transactionInput.safeParse(valid).success, true);
  assert.equal(
    transactionInput.safeParse({ ...valid, amount: "0" }).success,
    false,
  );
  assert.equal(
    transactionInput.safeParse({ ...valid, amount: "" }).success,
    false,
  );
  assert.equal(
    transactionInput.safeParse({ ...valid, amount: "1.23456" }).success,
    false,
  );
  assert.equal(
    transactionInput.safeParse({ ...valid, occurredOn: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    transactionInput.safeParse({ ...valid, categoryId: undefined }).success,
    false,
  );
});
