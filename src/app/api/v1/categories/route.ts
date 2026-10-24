import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { categories } from "@/lib/db/schema";
import { z } from "zod";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(64),
  kind: z.enum(["income", "expense"]),
});

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const rows = await current.db
      .select()
      .from(categories)
      .where(eq(categories.profileId, current.profile.id))
      .orderBy(asc(categories.kind), asc(categories.name));
    return NextResponse.json({
      categories: rows,
      currency: current.profile.currency,
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const parsed = categorySchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    const [created] = await current.db
      .insert(categories)
      .values({
        profileId: current.profile.id,
        ...parsed.data,
        icon: "circle-help",
      })
      .onConflictDoNothing()
      .returning();
    if (!created)
      return NextResponse.json(
        { error: "That category already exists." },
        { status: 409 },
      );
    return NextResponse.json({ category: created }, { status: 201 });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
