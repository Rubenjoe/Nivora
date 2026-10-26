import assert from "node:assert/strict";
import test from "node:test";
import { nearestChartPointIndex } from "./chart-interaction";

test("nearestChartPointIndex maps and clamps pointer positions to data points", () => {
  assert.equal(nearestChartPointIndex(40, 40, 400, 5), 0);
  assert.equal(nearestChartPointIndex(240, 40, 400, 5), 2);
  assert.equal(nearestChartPointIndex(440, 40, 400, 5), 4);
  assert.equal(nearestChartPointIndex(-20, 40, 400, 5), 0);
  assert.equal(nearestChartPointIndex(500, 40, 400, 5), 4);
});

test("nearestChartPointIndex handles a single point and invalid plot geometry", () => {
  assert.equal(nearestChartPointIndex(120, 40, 400, 1), 0);
  assert.equal(nearestChartPointIndex(120, 40, 0, 5), null);
  assert.equal(nearestChartPointIndex(Number.NaN, 40, 400, 5), null);
  assert.equal(nearestChartPointIndex(120, 40, 400, 0), null);
});
