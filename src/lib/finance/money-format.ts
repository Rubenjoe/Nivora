import Decimal from "decimal.js";

export type MoneyFormatOptions = {
  /** Minimum fraction digits. Defaults to 2 for consistent money display. */
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Force a display sign even when the stored amount is positive. */
  sign?: "positive" | "negative";
  /** Prefix positive values with a plus sign. */
  signDisplay?: "auto" | "always";
  currencyDisplay?: "symbol" | "narrowSymbol" | "code";
};

type CurrencyAffixes = {
  prefix: string;
  suffix: string;
};

const affixCache = new Map<string, CurrencyAffixes>();

function currencyAffixes(
  currency: string,
  currencyDisplay: NonNullable<MoneyFormatOptions["currencyDisplay"]>,
): CurrencyAffixes {
  const cacheKey = `${currency}:${currencyDisplay}`;
  const cached = affixCache.get(cacheKey);
  if (cached) return cached;

  const parts = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    currencyDisplay,
  }).formatToParts(0);
  const currencyIndex = parts.findIndex((part) => part.type === "currency");
  const numberIndex = parts.findIndex((part) => part.type === "integer");
  const symbol = parts[currencyIndex]?.value ?? currency;
  const between = parts
    .slice(
      Math.min(currencyIndex, numberIndex),
      Math.max(currencyIndex, numberIndex),
    )
    .filter((part) => part.type === "literal")
    .map((part) => part.value)
    .join("");
  const affixes: CurrencyAffixes =
    currencyIndex < numberIndex
      ? { prefix: `${symbol}${between}`, suffix: "" }
      : { prefix: "", suffix: `${between}${symbol}` };
  affixCache.set(cacheKey, affixes);
  return affixes;
}

/**
 * Formats a stored decimal money string without converting it to a JS number.
 *
 * Grouping and the currency symbol come from Intl, while the digits are
 * formatted from Decimal so totals never lose precision or drift.
 */
export function formatMoney(
  amount: string | number | Decimal,
  currency = "INR",
  options: MoneyFormatOptions = {},
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    sign,
    signDisplay = "auto",
    currencyDisplay = "symbol",
  } = options;

  const value = new Decimal(amount);
  const isNegative =
    sign === "negative" || (sign === undefined && value.isNegative());
  const isPositive = !isNegative && value.greaterThan(0);
  const valueSign = isNegative
    ? "−"
    : isPositive && signDisplay === "always"
      ? "+"
      : "";

  const fixed = value.abs().toFixed(maximumFractionDigits);
  const [whole = "0", fraction = ""] = fixed.split(".");
  const groupedWhole = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(whole));
  const fractionDigits = Math.max(
    0,
    Math.min(maximumFractionDigits, minimumFractionDigits),
  );
  const fractionPart =
    maximumFractionDigits > 0 && fractionDigits > 0
      ? `.${fraction.padEnd(maximumFractionDigits, "0").slice(0, fractionDigits)}`
      : "";

  const affixes = currencyAffixes(currency, currencyDisplay);
  return `${valueSign}${affixes.prefix}${groupedWhole}${fractionPart}${affixes.suffix}`;
}

/** Locale-aware plain number formatting for chart axes (no currency prefix). */
export function formatCompactAmount(
  amount: string | number | Decimal,
  maximumFractionDigits = 0,
): string {
  const value = new Decimal(amount);
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(BigInt(value.abs().toFixed(0)));
}
