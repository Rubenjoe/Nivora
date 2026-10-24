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

const contributionInput = z.object({
  goalId: z.string().uuid(),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  contributedOn: z.iso.date(),
  note: z.string().trim().max(280).nullable().optional(),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const parsed = contributionInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid contribution details." },
        { status: 400 },
      );
    const { goalId, amount, contributedOn, note } = parsed.data;
    const [goal] = await current.db
      .select({ id: savingsGoals.id, status: savingsGoals.status })
      .from(savingsGoals)
      .where(
        and(
          eq(savingsGoals.id, goalId),
          eq(savingsGoals.profileId, current.profile.id),
        ),
      )
      .limit(1);
    if (!goal)
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    if (goal.status === "archived")
      return NextResponse.json(
        { error: "Archived goals cannot receive contributions." },
        { status: 400 },
      );
    const [created] = await current.db
      .insert(goalContributions)
      .values({
        goalId,
        profileId: current.profile.id,
        amount,
        contributedOn,
        note: note ?? null,
      })
      .returning();
    return NextResponse.json({ contribution: created }, { status: 201 });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      return NextResponse.json(
        { error: "Invalid contribution id." },
        { status: 400 },
      );
    const [deleted] = await current.db
      .delete(goalContributions)
      .where(
        and(
          eq(goalContributions.id, id),
          eq(goalContributions.profileId, current.profile.id),
        ),
      )
      .returning({ id: goalContributions.id });
    if (!deleted)
      return NextResponse.json(
        { error: "Contribution not found." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
