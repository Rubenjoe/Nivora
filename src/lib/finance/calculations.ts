import Decimal from "decimal.js";
import { currencyFractionDigits } from "@/lib/finance/money-format";

export type MoneyEntry = {
  amount: string;
  kind: "income" | "expense";
  currency: string;
};

export function calculateCashFlow(entries: MoneyEntry[], currency: string) {
  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.currency !== currency) return acc;
      const amount = new Decimal(entry.amount);
      if (entry.kind === "income") acc.income = acc.income.plus(amount);
      else acc.expenses = acc.expenses.plus(amount);
      return acc;
    },
    { income: new Decimal(0), expenses: new Decimal(0) },
  );
  const digits = currencyFractionDigits(currency);
  return {
    income: totals.income.toFixed(digits),
    expenses: totals.expenses.toFixed(digits),
    net: totals.income.minus(totals.expenses).toFixed(digits),
  };
}
