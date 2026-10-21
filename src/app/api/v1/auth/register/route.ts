import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { z } from "zod";
import { createAdminAccount, hasTrustedOrigin } from "@/lib/appwrite/server";

const registration = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = registration.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      {
        error:
          "Enter your name, a valid email, and a password of at least 8 characters.",
      },
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
    await account.create({ userId: ID.unique(), ...input.data });
    const session = await account.createEmailPasswordSession({
      email: input.data.email,
      password: input.data.password,
    });
    const response = NextResponse.json({ ok: true }, { status: 201 });
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
      {
        error:
          "Unable to create an account. Check your details or try signing in.",
      },
      { status: 400 },
    );
  }
}
