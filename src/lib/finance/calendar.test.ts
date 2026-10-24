import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarDayCount,
  calendarDaysBetween,
  previousCalendarRange,
  weekStartISO,
} from "./calendar";

test("date ranges and previous periods use inclusive calendar days", () => {
  assert.equal(calendarDaysBetween("2024-02-28", "2024-03-01"), 2);
  assert.equal(calendarDayCount("2024-02-28", "2024-03-01"), 3);
  assert.deepEqual(previousCalendarRange("2024-03-01", "2024-03-03"), {
    from: "2024-02-27",
    to: "2024-02-29",
  });
});

test("weekly buckets begin Monday across year boundaries", () => {
  assert.equal(weekStartISO("2024-01-01"), "2024-01-01");
  assert.equal(weekStartISO("2024-01-07"), "2024-01-01");
  assert.equal(weekStartISO("2024-01-08"), "2024-01-08");
});
