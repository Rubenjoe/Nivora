import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/lib/db";
import { resolveProfile } from "@/lib/db/ownership";
import { DatabaseConfigurationError } from "@/lib/db/configuration";
import type { SessionProfile } from "@/lib/auth/session-contract";

export type NavSessionProfile = SessionProfile;

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
