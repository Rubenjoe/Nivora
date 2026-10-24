import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    return NextResponse.json(
      { error: "Unable to sign out. Please try again." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
