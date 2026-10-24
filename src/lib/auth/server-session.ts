import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/lib/db";
import { resolveProfile } from "@/lib/db/ownership";
import { DatabaseConfigurationError } from "@/lib/db/configuration";

export type NavSessionProfile = {
  id: string;
  displayName: string;
  currency: string;
  mode: "simple" | "pro";
  timezone: string;
  dateFormat: string;
  appearance: string;
  budgetAlertsEnabled: boolean;
  goalAlertsEnabled: boolean;
};

export type NavSession =
  | { status: "anonymous" }
  | {
      status: "authenticated";
      user: {
        id: string;
        email: string | undefined;
        name: string;
      };
      profile: NavSessionProfile | null;
      storageReady: boolean;
      storageIssue?: string;
    };

export const getNavSession = cache(async (): Promise<NavSession> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };
  const user = data.user;
  const baseUser = {
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "",
  };
  try {
    const db = getDatabase();
    const profile = await resolveProfile(db, {
      id: user.id,
      name: baseUser.name,
    });
    return {
      status: "authenticated",
      user: baseUser,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        currency: profile.currency,
        mode: profile.mode,
        timezone: profile.timezone,
        dateFormat: profile.dateFormat,
        appearance: profile.appearance,
        budgetAlertsEnabled: profile.budgetAlertsEnabled,
        goalAlertsEnabled: profile.goalAlertsEnabled,
      },
      storageReady: true,
    };
  } catch (cause) {
    const storageIssue =
      cause instanceof DatabaseConfigurationError ? cause.issue : undefined;
    return {
      status: "authenticated",
      user: baseUser,
      profile: null,
      storageReady: false,
      storageIssue,
    };
  }
});

export function sessionInitials(
  session: Extract<NavSession, { status: "authenticated" }>,
) {
  const label =
    session.profile?.displayName?.trim() ||
    session.user.name.trim() ||
    session.user.email?.split("@")[0] ||
    "You";
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}
