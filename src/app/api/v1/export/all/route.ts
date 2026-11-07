import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  budgets,
  categories,
  goalContributions,
  recurringOccurrences,
  recurringSchedules,
  savingsGoals,
  transactions,
} from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { getLocalTodayISO } from "@/lib/finance/monthly-report";

/** Full, portable copy of everything stored for the signed-in user. */
export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { db, profile } = current;
    const owned = <T extends { profileId: Parameters<typeof eq>[0] }>(
      table: T,
    ) => eq(table.profileId, profile.id);

    const [
      categoryRows,
      transactionRows,
      budgetRows,
      goalRows,
      contributionRows,
      scheduleRows,
      occurrenceRows,
    ] = await Promise.all([
      db.select().from(categories).where(owned(categories)),
      db.select().from(transactions).where(owned(transactions)),
      db.select().from(budgets).where(owned(budgets)),
      db.select().from(savingsGoals).where(owned(savingsGoals)),
      db.select().from(goalContributions).where(owned(goalContributions)),
      db.select().from(recurringSchedules).where(owned(recurringSchedules)),
      db.select().from(recurringOccurrences).where(owned(recurringOccurrences)),
    ]);

    const strip = <T extends { profileId?: unknown }>(rows: T[]) =>
      rows.map((row) => {
        const rest = { ...row };
        delete rest.profileId;
        return rest;
      });

    const payload = {
      app: "Nivora",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: profile.displayName,
        currency: profile.currency,
        timezone: profile.timezone,
        dateFormat: profile.dateFormat,
        appearance: profile.appearance,
        mode: profile.mode,
        budgetAlertsEnabled: profile.budgetAlertsEnabled,
        goalAlertsEnabled: profile.goalAlertsEnabled,
        createdAt: profile.createdAt,
      },
      categories: strip(categoryRows),
      transactions: strip(transactionRows),
      budgets: strip(budgetRows),
      savingsGoals: strip(goalRows),
      goalContributions: strip(contributionRows),
      recurringSchedules: strip(scheduleRows),
      recurringOccurrences: strip(occurrenceRows),
    };

    const stamp = getLocalTodayISO(profile.timezone);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="nivora-data-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
