import { NextResponse } from "next/server";
import { createSessionAccount } from "@/lib/appwrite/server";

export async function GET() {
  try {
    const session = await createSessionAccount();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await session.account.get();
    return NextResponse.json({
      user: {
        id: user.$id,
        name: user.name,
        email: user.email,
        emailVerification: user.emailVerification,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
