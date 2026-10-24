import assert from "node:assert/strict";
import test from "node:test";
import { buildGreeting, greetingForHour } from "./greeting";

test("selects morning, afternoon, and evening by local hour", () => {
  assert.equal(greetingForHour(8), "Good morning");
  assert.equal(greetingForHour(12), "Good afternoon");
  assert.equal(greetingForHour(16), "Good afternoon");
  assert.equal(greetingForHour(17), "Good evening");
  assert.equal(greetingForHour(23), "Good evening");
});

test("uses the profile timezone and display name", () => {
  const date = new Date("2026-10-24T06:30:00Z");
  assert.equal(
    buildGreeting(date, "Priya Sharma", "Asia/Kolkata"),
    "Good afternoon, Priya Sharma",
  );
  assert.equal(
    buildGreeting(new Date("2026-10-24T02:30:00Z"), "Priya", "Asia/Kolkata"),
    "Good morning, Priya",
  );
  assert.equal(
    buildGreeting(new Date("2026-10-24T14:30:00Z"), "Priya", "Asia/Kolkata"),
    "Good evening, Priya",
  );
});

test("falls back to a welcome without inventing a name", () => {
  assert.equal(buildGreeting(new Date(), null, "Asia/Kolkata"), "Welcome back");
  assert.equal(
    buildGreeting(new Date(), "   ", "Asia/Kolkata"),
    "Welcome back",
  );
});
