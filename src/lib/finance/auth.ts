import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/lib/db";
import { resolveProfile } from "@/lib/db/ownership";

export async function requireFinanceUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Only return null for genuine "not signed in / invalid token" session errors
    const isNoSession =
      error.status === 401 ||
      error.status === 403 ||
      error.name === "AuthSessionMissingError" ||
      /session missing|jwt expired|invalid token/i.test(error.message);
    if (isNoSession) return null;
    throw error;
  }
  if (!data?.user) return null;
  const db = getDatabase();
  const user = data.user;
  const profile = await resolveProfile(db, {
    id: user.id,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "",
  });
  return { db, profile, user };
}
