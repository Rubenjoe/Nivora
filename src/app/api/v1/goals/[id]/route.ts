import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { goalContributions, savingsGoals } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { hasTrustedOrigin } from "@/lib/security/origin";
import type { getDatabase } from "@/lib/db";

type Database = ReturnType<typeof getDatabase>;
type Context = { params: Promise<{ id: string }> };

const goalPatch = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  targetAmount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0)
    .optional(),
  targetDate: z.iso.date().nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
});

async function goalProgress(
  db: Database,
  row: typeof savingsGoals.$inferSelect,
) {
  const rows = await db
    .select({ amount: goalContributions.amount })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, row.id));
  const saved = rows.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  const target = new Decimal(row.targetAmount);
  const percent = target.isZero()
    ? 0
    : Number(saved.div(target).mul(100).toFixed(1));
  return {
    goal: row,
    saved: saved.toFixed(2),
    remaining: target.minus(saved).toFixed(2),
    percent,
    complete: saved.greaterThanOrEqualTo(target),
  };
}

export async function GET(_request: Request, context: Context) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const [row] = await current.db
      .select()
      .from(savingsGoals)
      .where(
        and(
          eq(savingsGoals.id, id),
          eq(savingsGoals.profileId, current.profile.id),
        ),
      )
      .limit(1);
    if (!row)
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    const contributions = await current.db
      .select()
      .from(goalContributions)
      .where(
        and(
          eq(goalContributions.goalId, id),
          eq(goalContributions.profileId, current.profile.id),
        ),
      )
      .orderBy(goalContributions.contributedOn);
    const enriched = await goalProgress(current.db, row);
    return NextResponse.json({ ...enriched, contributions });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const parsed = goalPatch.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid goal changes." },
        { status: 400 },
      );
    const [updated] = await current.db
      .update(savingsGoals)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(savingsGoals.id, id),
          eq(savingsGoals.profileId, current.profile.id),
        ),
      )
      .returning();
    if (!updated)
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    const enriched = await goalProgress(current.db, updated);
    return NextResponse.json(enriched);
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const [deleted] = await current.db
      .delete(savingsGoals)
      .where(
        and(
          eq(savingsGoals.id, id),
          eq(savingsGoals.profileId, current.profile.id),
        ),
      )
      .returning({ id: savingsGoals.id });
    if (!deleted)
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
