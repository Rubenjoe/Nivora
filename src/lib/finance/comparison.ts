import Decimal from "decimal.js";

/**
 * Percent change with a signed direction. A prior net value may be negative;
 * its absolute magnitude is the baseline so the direction still follows the
 * numeric change, rather than reversing solely because the baseline is below
 * zero.
 */
export function formatPercentageDelta(
  currentValue: string,
  priorValue: string,
): string | null {
  const current = new Decimal(currentValue);
  const prior = new Decimal(priorValue);
  if (prior.isZero()) return current.isZero() ? null : "new";

  const change = current.minus(prior);
  if (change.isZero()) return "0.0%";

  const percentage = change.abs().div(prior.abs()).mul(100).toFixed(1);
  return `${change.isPositive() ? "+" : "-"}${percentage}%`;
}
