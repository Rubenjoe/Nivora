import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnTo } from "./return-to";

test("allows a local finance path and preserves its query", () => {
  assert.equal(
    safeReturnTo("/transactions?kind=expense"),
    "/transactions?kind=expense",
  );
});

test("rejects external, protocol-relative, and auth-loop return paths", () => {
  assert.equal(safeReturnTo("https://attacker.invalid"), "/");
  assert.equal(safeReturnTo("//attacker.invalid"), "/");
  assert.equal(safeReturnTo("/sign-in?next=/"), "/");
  assert.equal(safeReturnTo(null), "/");
});
