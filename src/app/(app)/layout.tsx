import { AppShell } from "@/components/app-shell";
import { getNavSession } from "@/lib/auth/server-session";
import type { ClientNavSession } from "@/components/use-nav-session";

function toClientSession(
  session: Awaited<ReturnType<typeof getNavSession>>,
): ClientNavSession {
  if (session.status === "anonymous") return { status: "anonymous" };
  return {
    status: "authenticated",
    user: session.user,
    profile: session.profile,
    storageReady: session.storageReady,
    storageIssue: session.storageIssue,
  };
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getNavSession();
  return (
    <AppShell initialSession={toClientSession(session)}>{children}</AppShell>
  );
}
