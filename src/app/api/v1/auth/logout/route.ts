import { NextResponse } from "next/server";
import { createSessionAccount, hasTrustedOrigin } from "@/lib/appwrite/server";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const session = await createSessionAccount();
    if (session) await session.account.deleteSession("current");
  } catch {
    // Clearing the local cookie is still required if the remote session is expired or unavailable.
  }
  const response = NextResponse.json({ ok: true });
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (projectId) response.cookies.delete(`a_session_${projectId}`);
  return response;
}
