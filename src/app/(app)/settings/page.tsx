import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { getNavSession } from "@/lib/auth/server-session";
import { DEFAULT_TIMEZONE } from "@/lib/finance/periods";

export default async function SettingsPage() {
  const session = await getNavSession();
  if (session.status === "anonymous") {
    redirect("/sign-in?next=/settings");
  }
  if (!session.profile) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">
          Account storage unavailable
        </h1>
        <p className="text-sm text-neutral-400">
          Your profile could not be loaded from storage. Check your database
          connection and try again.
        </p>
      </div>
    );
  }
  const profile = {
    displayName: session.profile.displayName,
    currency: session.profile.currency,
    timezone: session.profile.timezone ?? DEFAULT_TIMEZONE,
    dateFormat: session.profile.dateFormat ?? "en-IN",
    mode: session.profile.mode,
    appearance: session.profile.appearance ?? "system",
    budgetAlertsEnabled: session.profile.budgetAlertsEnabled ?? true,
    goalAlertsEnabled: session.profile.goalAlertsEnabled ?? true,
  };
  return <SettingsWorkspace initialProfile={profile} />;
}
