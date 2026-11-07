import "server-only";

export type AuthDeletionResult = "removed" | "not-configured" | "failed";

/**
 * Removes the Supabase Auth user. This needs the server-only
 * SUPABASE_SERVICE_ROLE_KEY. Never expose that key to the browser or put it
 * in a NEXT_PUBLIC_ variable.
 */
export async function deleteAuthUser(
  userId: string,
): Promise<AuthDeletionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return "not-configured";
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      },
    );
    // 404 means the user is already gone, which is the outcome we want.
    return response.ok || response.status === 404 ? "removed" : "failed";
  } catch {
    return "failed";
  }
}
