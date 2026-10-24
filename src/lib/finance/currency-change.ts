import { eq } from "drizzle-orm";
import {
  budgets,
  goalContributions,
  recurringSchedules,
  savingsGoals,
  transactions,
} from "@/lib/db/schema";
import type { getDatabase } from "@/lib/db";

type Database = ReturnType<typeof getDatabase>;

export function canChangeProfileCurrency(
  currentCurrency: string,
  requestedCurrency: string,
  hasFinancialRecords: boolean,
): boolean {
  return currentCurrency === requestedCurrency || !hasFinancialRecords;
}

/** A currency preference is a ledger denomination, not a conversion rate. */
export async function profileHasFinancialRecords(
  db: Database,
  profileId: string,
): Promise<boolean> {
  const [
    transactionRows,
    budgetRows,
    goalRows,
    contributionRows,
    scheduleRows,
  ] = await Promise.all([
    db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.profileId, profileId))
      .limit(1),
    db
      .select({ id: budgets.id })
      .from(budgets)
      .where(eq(budgets.profileId, profileId))
      .limit(1),
    db
      .select({ id: savingsGoals.id })
      .from(savingsGoals)
      .where(eq(savingsGoals.profileId, profileId))
      .limit(1),
    db
      .select({ id: goalContributions.id })
      .from(goalContributions)
      .where(eq(goalContributions.profileId, profileId))
      .limit(1),
    db
      .select({ id: recurringSchedules.id })
      .from(recurringSchedules)
      .where(eq(recurringSchedules.profileId, profileId))
      .limit(1),
  ]);
  return [
    transactionRows,
    budgetRows,
    goalRows,
    contributionRows,
    scheduleRows,
  ].some((rows) => rows.length > 0);
}
