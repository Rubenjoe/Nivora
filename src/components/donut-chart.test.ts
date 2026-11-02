import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { DonutChart } from "./donut-chart";

test("donut chart renders category arcs and a readable total", () => {
  const html = renderToStaticMarkup(
    createElement(DonutChart, {
      categories: [
        { name: "Food", amount: "50.00" },
        { name: "Transport", amount: "30.00" },
        { name: "Utilities", amount: "20.00" },
      ],
      total: "100.00",
      currency: "USD",
    }),
  );

  assert.equal((html.match(/class="premium-donut-segment"/g) ?? []).length, 3);
  assert.equal((html.match(/stroke-linecap="butt"/g) ?? []).length, 3);
  assert.equal((html.match(/transform="rotate\(-90\)"/g) ?? []).length, 3);
  assert.match(html, /Total expenses/);
  assert.match(html, /Food/);
  assert.match(html, /Transport/);
  assert.match(html, /Utilities/);
});

test("donut segment CSS overrides the broad round-cap rule", () => {
  const cssPath = fileURLToPath(new URL("../app/reports.css", import.meta.url));
  const css = readFileSync(cssPath, "utf8");

  assert.match(
    css,
    /\.premium-donut-chart\s+\.premium-donut-segment\s*\{[^}]*stroke-linecap:\s*butt\s*;/,
  );
});
