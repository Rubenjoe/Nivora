import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/security/origin";

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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(input.data);
    if (error) {
      return NextResponse.json(
        { error: "Unable to sign in with those details." },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 },
    );
  }
}
