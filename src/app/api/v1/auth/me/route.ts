import { NextResponse } from "next/server";
import { getNavSession } from "@/lib/auth/server-session";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";

export async function GET() {
  try {
    const session = await getNavSession();
    if (session.status === "anonymous") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      user: session.user,
      profile: session.profile,
      storageReady: session.storageReady,
      storageIssue: session.storageIssue,
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
