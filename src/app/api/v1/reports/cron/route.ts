import { NextResponse } from "next/server";
import { getPreviousMonthISO } from "@/lib/finance/monthly-notification";
import { getLocalTodayISO } from "@/lib/finance/monthly-report";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron secret is not configured on server." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const xSecret = request.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearerToken !== cronSecret && xSecret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized cron execution." },
      { status: 401 },
    );
  }

  const today = getLocalTodayISO();
  const previousMonth = getPreviousMonthISO(today);

  // Ready entry point for scheduled reporting jobs
  return NextResponse.json({
    ok: true,
    message: `Monthly report generation cycle validated for ${previousMonth}.`,
    cycle: previousMonth,
    timestamp: new Date().toISOString(),
  });
}
