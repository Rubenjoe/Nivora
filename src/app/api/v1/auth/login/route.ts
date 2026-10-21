import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminAccount, hasTrustedOrigin } from "@/lib/appwrite/server";

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = credentials.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Enter a valid email and password (at least 8 characters)." },
      { status: 400 },
    );

  let account: ReturnType<typeof createAdminAccount>["account"];
  let projectId: string;
  try {
    ({ account, projectId } = createAdminAccount());
  } catch {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 },
    );
  }

  try {
    const session = await account.createEmailPasswordSession(input.data);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(`a_session_${projectId}`, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expire),
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in with those details." },
      { status: 401 },
    );
  }
}
