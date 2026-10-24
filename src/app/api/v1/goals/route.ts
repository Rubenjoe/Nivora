import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
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
type GoalRow = typeof savingsGoals.$inferSelect;

const goalInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  targetAmount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0, "Target must be greater than zero."),
  targetDate: z.iso.date().nullable().optional(),
});

async function goalProgress(db: Database, row: GoalRow) {
  const [aggregate] = await db
    .select({
      saved: sql<string>`coalesce(sum(${goalContributions.amount}), 0)::text`,
    })
    .from(goalContributions)
    .where(
      and(
        eq(goalContributions.goalId, row.id),
        eq(goalContributions.profileId, row.profileId),
      ),
    );
  return goalProgressFromAmount(row, aggregate?.saved ?? "0");
}

function goalProgressFromAmount(row: GoalRow, savedAmount: string) {
  const saved = new Decimal(savedAmount);
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

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const [rows, contributionRows] = await Promise.all([
      current.db
        .select()
        .from(savingsGoals)
        .where(eq(savingsGoals.profileId, current.profile.id))
        .orderBy(desc(savingsGoals.createdAt)),
      current.db
        .select({
          goalId: goalContributions.goalId,
          saved: sql<string>`sum(${goalContributions.amount})::text`,
        })
        .from(goalContributions)
        .where(eq(goalContributions.profileId, current.profile.id))
        .groupBy(goalContributions.goalId),
    ]);
    const savedByGoal = new Map(
      contributionRows.map((row) => [row.goalId, row.saved]),
    );
    const enriched = rows.map((row) =>
      goalProgressFromAmount(row, savedByGoal.get(row.id) ?? "0"),
    );
    return NextResponse.json({
      currency: current.profile.currency,
      goals: enriched,
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
    const parsed = goalInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid goal details." },
        { status: 400 },
      );
    const [created] = await current.db
      .insert(savingsGoals)
      .values({
        profileId: current.profile.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        targetAmount: parsed.data.targetAmount,
        targetDate: parsed.data.targetDate ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (!created)
      return NextResponse.json(
        { error: "A goal with this name already exists." },
        { status: 409 },
      );
    const enriched = await goalProgress(current.db, created);
    return NextResponse.json(enriched, { status: 201 });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
