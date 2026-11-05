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
const fractionDigitsCache = new Map<string, number>();

/**
 * The currency's real minor-unit count (2 for INR/USD/EUR, 0 for JPY,
 * 3 for KWD/BHD), resolved from Intl with a safe fallback for unknown codes.
 */
export function currencyFractionDigits(currency: string): number {
  const cached = fractionDigitsCache.get(currency);
  if (cached !== undefined) return cached;
  let digits: number;
  try {
    const options = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions();
    digits =
      options.maximumFractionDigits ?? options.minimumFractionDigits ?? 2;
    if (!Number.isFinite(digits) || digits < 0 || digits > 20) digits = 2;
  } catch {
    digits = 2;
  }
  fractionDigitsCache.set(currency, digits);
  return digits;
}

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
    minimumFractionDigits = currencyFractionDigits(currency),
    maximumFractionDigits = currencyFractionDigits(currency),
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
