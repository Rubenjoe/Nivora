import { DashboardOverview } from "@/components/dashboard-overview";
import { getNavSession } from "@/lib/auth/server-session";
import { buildGreeting } from "@/lib/finance/greeting";
import { DEFAULT_TIMEZONE } from "@/lib/finance/periods";

export default async function OverviewPage() {
  const session = await getNavSession();
  const mode =
    session.status === "authenticated"
      ? (session.profile?.mode ?? "simple")
      : "simple";
  const displayName =
    session.status === "authenticated"
      ? session.profile?.displayName?.trim() || session.user.name.trim() || null
      : null;
  const timezone =
    session.status === "authenticated"
      ? (session.profile?.timezone ?? DEFAULT_TIMEZONE)
      : null;
  const currency =
    session.status === "authenticated"
      ? (session.profile?.currency ?? null)
      : null;
  const initialGreeting = buildGreeting(new Date(), displayName, timezone);

  return (
    <DashboardOverview
      authenticated={session.status === "authenticated"}
      mode={mode}
      currency={currency}
      displayName={displayName}
      timezone={timezone}
      initialGreeting={initialGreeting}
    />
  );
}
