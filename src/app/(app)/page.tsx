import { DashboardOverview } from "@/components/dashboard-overview";
import { getNavSession } from "@/lib/auth/server-session";
import { buildGreeting } from "@/lib/finance/greeting";

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
      ? (session.profile?.timezone ?? null)
      : null;
  const initialGreeting = buildGreeting(new Date(), displayName, timezone);

  return (
    <DashboardOverview
      mode={mode}
      displayName={displayName}
      timezone={timezone}
      initialGreeting={initialGreeting}
    />
  );
}
