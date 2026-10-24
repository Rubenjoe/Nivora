"use client";

import { useCallback, useEffect, useState } from "react";

export type ClientNavSessionProfile = {
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

export type ClientNavSession =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      user: {
        id: string;
        email?: string;
        name: string;
      };
      profile: ClientNavSessionProfile | null;
      storageReady: boolean;
      storageIssue?: string;
    };

type MeResponse =
  | { ok: false }
  | {
      ok: true;
      user: { id: string; email?: string; name: string };
      profile: ClientNavSessionProfile | null;
      storageReady: boolean;
      storageIssue?: string;
    };

/** Pure fetcher: resolves the current nav session from /api/v1/auth/me. */
export async function readNavSession(): Promise<MeResponse> {
  try {
    const response = await fetch("/api/v1/auth/me", { cache: "no-store" });
    if (!response.ok) return { ok: false };
    const payload = await response.json();
    return {
      ok: true,
      user: payload.user,
      profile: payload.profile ?? null,
      storageReady: Boolean(payload.storageReady),
      storageIssue: payload.storageIssue,
    };
  } catch {
    return { ok: false };
  }
}

export function useNavSession(initial: ClientNavSession) {
  const [session, setSession] = useState<ClientNavSession>(initial);

  const refresh = useCallback(async () => {
    const result = await readNavSession();
    if (!result.ok) {
      setSession({ status: "anonymous" });
      return;
    }
    setSession({
      status: "authenticated",
      user: result.user,
      profile: result.profile,
      storageReady: result.storageReady,
      storageIssue: result.storageIssue,
    });
  }, []);

  useEffect(() => {
    let active = true;
    readNavSession().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setSession({ status: "anonymous" });
        return;
      }
      setSession({
        status: "authenticated",
        user: result.user,
        profile: result.profile,
        storageReady: result.storageReady,
        storageIssue: result.storageIssue,
      });
    });
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { session, refresh };
}

export function sessionInitials(
  session: Extract<ClientNavSession, { status: "authenticated" }>,
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
