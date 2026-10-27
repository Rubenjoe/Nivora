import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { transactions } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import {
  evaluateMonthlyNotification,
  getPreviousMonthISO,
} from "@/lib/finance/monthly-notification";
import { getLocalTodayISO, getMonthBounds } from "@/lib/finance/monthly-report";

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();

    const todayISO = getLocalTodayISO(current.profile.timezone);
    const previousMonth = getPreviousMonthISO(todayISO);
    const bounds = getMonthBounds(previousMonth);

    // Check if user has any transactions in that previous month
    const priorTransactions = await current.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.profileId, current.profile.id),
          eq(transactions.currency, current.profile.currency),
          gte(transactions.occurredOn, bounds.from),
          lte(transactions.occurredOn, bounds.to),
        ),
      )
      .limit(1);

    const status = evaluateMonthlyNotification({
      timeZone: current.profile.timezone,
      userCreatedAt: current.profile.createdAt,
      hasTransactionsInPriorMonth: priorTransactions.length > 0,
    });

    return NextResponse.json(status);
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
