import assert from "node:assert/strict";
import test from "node:test";
import { resolveThemePreference } from "../lib/theme-preferences";

test("an explicit saved theme overrides the current system preference", () => {
  assert.equal(resolveThemePreference("light", "dark"), "light");
  assert.equal(resolveThemePreference("dark", "light"), "dark");
});

test("an absent or invalid saved theme defaults to graphite dark mode", () => {
  assert.equal(resolveThemePreference(null, "dark"), "dark");
  assert.equal(resolveThemePreference("sepia", "dark"), "dark");
});
