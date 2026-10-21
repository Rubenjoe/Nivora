import { NextResponse } from "next/server";
import { createSessionAccount } from "@/lib/appwrite/server";
import { getDatabase } from "@/lib/db";
import { resolveProfile } from "@/lib/db/ownership";

export async function requireFinanceUser() {
  const session = await createSessionAccount();
  if (!session) return null;
  let user;
  try {
    user = await session.account.get();
  } catch {
    return null;
  }
  const db = getDatabase();
  const profile = await resolveProfile(db, { id: user.$id, name: user.name });
  return { db, profile, user };
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Sign in to access your financial data." },
    { status: 401 },
  );
}

export function serviceUnavailable() {
  return NextResponse.json(
    { error: "Financial storage is not configured or available." },
    { status: 503 },
  );
}
