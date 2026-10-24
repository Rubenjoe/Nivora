import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/security/origin";

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

  try {
    const supabase = await createClient();
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email: input.data.email,
      password: input.data.password,
      options: {
        data: { name: input.data.name },
        emailRedirectTo: new URL("/auth/confirm", appUrl).toString(),
      },
    });
    if (error) {
      return NextResponse.json(
        {
          error:
            "Unable to create an account. Check your details or try signing in.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: true, confirmationRequired: !data.session },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 },
    );
  }
}
