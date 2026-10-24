import assert from "node:assert/strict";
import test from "node:test";
import { buildCsv, escapeCsvCell } from "./csv";
import { addRecurrenceDue } from "./periods";
import { nextDueOnOrAfter, isDue } from "./recurrence";

test("CSV cells neutralize formula injection and quote correctly", () => {
  assert.equal(escapeCsvCell("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(escapeCsvCell("+cmd"), "'+cmd");
  assert.equal(escapeCsvCell("-1"), "'-1");
  assert.equal(escapeCsvCell("@import"), "'@import");
  assert.equal(escapeCsvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(escapeCsvCell("line\nbreak"), "line break");
  assert.equal(escapeCsvCell("plain"), "plain");
});

test("CSV documents are built with a header and CRLF rows", () => {
  const csv = buildCsv(
    ["Date", "Merchant"],
    [
      ["2026-10-21", "Local market"],
      ["2026-10-22", "=dangerous"],
    ],
  );
  assert.equal(
    csv,
    "Date,Merchant\r\n2026-10-21,Local market\r\n2026-10-22,'=dangerous",
  );
});

test("recurrence advances weekly, monthly, and yearly with month-end clamping", () => {
  assert.equal(addRecurrenceDue("2026-10-21", "weekly"), "2026-10-28");
  assert.equal(addRecurrenceDue("2026-10-21", "monthly"), "2026-11-21");
  assert.equal(addRecurrenceDue("2024-02-29", "monthly"), "2024-03-29");
  assert.equal(addRecurrenceDue("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(addRecurrenceDue("2026-03-31", "monthly"), "2026-04-30");
  assert.equal(addRecurrenceDue("2026-10-21", "yearly"), "2027-10-21");
  assert.equal(addRecurrenceDue("2024-02-29", "yearly"), "2025-02-28");
  assert.equal(
    addRecurrenceDue("2026-02-28", "monthly", "2026-01-31"),
    "2026-03-31",
  );
});

test("next due date lands on or after today without overshooting", () => {
  assert.equal(
    nextDueOnOrAfter("2026-10-01", "monthly", "2026-10-21"),
    "2026-11-01",
  );
  assert.equal(
    nextDueOnOrAfter("2026-10-21", "monthly", "2026-10-21"),
    "2026-10-21",
  );
  assert.equal(
    nextDueOnOrAfter("2026-10-25", "monthly", "2026-10-21"),
    "2026-10-25",
  );
});

test("monthly due dates retain their original day after month-end clamping", () => {
  assert.equal(
    nextDueOnOrAfter("2026-01-31", "monthly", "2026-03-15"),
    "2026-03-31",
  );
});

test("a schedule is due only when active, within its end date, and on time", () => {
  const base = { nextDueDate: "2026-10-21", endDate: null, status: "active" };
  assert.equal(isDue(base, "2026-10-21"), true);
  assert.equal(isDue(base, "2026-10-20"), false);
  assert.equal(isDue({ ...base, status: "paused" }, "2026-10-21"), false);
  assert.equal(isDue({ ...base, endDate: "2026-10-20" }, "2026-10-21"), false);
});
