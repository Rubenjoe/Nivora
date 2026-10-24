import { DashboardOverview } from "@/components/dashboard-overview";
import { getNavSession } from "@/lib/auth/server-session";

export default async function OverviewPage() {
  const session = await getNavSession();
  const mode =
    session.status === "authenticated"
      ? (session.profile?.mode ?? "simple")
      : "simple";
  return <DashboardOverview mode={mode} />;
}
