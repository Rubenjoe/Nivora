import { SettingsWorkspace } from "@/components/settings-workspace";
import { getNavSession } from "@/lib/auth/server-session";

export default async function SettingsPage() {
  const session = await getNavSession();
  const profile =
    session.status === "authenticated" && session.profile
      ? {
          displayName: session.profile.displayName,
          currency: session.profile.currency,
          timezone: session.profile.timezone ?? "Asia/Kolkata",
          dateFormat: session.profile.dateFormat ?? "en-IN",
          mode: session.profile.mode,
          appearance: session.profile.appearance ?? "system",
          budgetAlertsEnabled: session.profile.budgetAlertsEnabled ?? true,
          goalAlertsEnabled: session.profile.goalAlertsEnabled ?? true,
        }
      : {
          displayName: "Nivora member",
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "en-IN",
          mode: "simple" as const,
          appearance: "system",
          budgetAlertsEnabled: true,
          goalAlertsEnabled: true,
        };
  return <SettingsWorkspace initialProfile={profile} />;
}
