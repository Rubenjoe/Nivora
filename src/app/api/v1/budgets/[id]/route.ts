import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { budgets, categories } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { expenseTotalForBudget } from "@/lib/finance/budget-spent";

type Context = { params: Promise<{ id: string }> };

const budgetPatch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0)
    .optional(),
  categoryId: z.string().uuid().nullable().optional(),
  warningThresholdPercent: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

async function enrich(
  db: Parameters<typeof expenseTotalForBudget>[0],
  profileId: string,
  currency: string,
  row: typeof budgets.$inferSelect,
) {
  const spent = await expenseTotalForBudget(
    db,
    profileId,
    currency,
    row.periodMonth,
    row.categoryId,
  );
  const amount = new Decimal(row.amount);
  const percent = amount.isZero()
    ? 0
    : Number(spent.div(amount).mul(100).toFixed(1));
  return {
    budget: row,
    spent: spent.toFixed(2),
    remaining: amount.minus(spent).toFixed(2),
    percent,
    overBudget: spent.greaterThan(amount),
    thresholdAlert: percent >= row.warningThresholdPercent,
  };
}

export async function PATCH(request: Request, context: Context) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const parsed = budgetPatch.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid budget changes." },
        { status: 400 },
      );
    const data = parsed.data;
    if (data.categoryId) {
      const [category] = await current.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.profileId, current.profile.id),
            eq(categories.kind, "expense"),
          ),
        )
        .limit(1);
      if (!category)
        return NextResponse.json(
          { error: "Choose a valid expense category." },
          { status: 400 },
        );
    }
    const [updated] = await current.db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.profileId, current.profile.id)))
      .returning();
    if (!updated)
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    const enriched = await enrich(
      current.db,
      current.profile.id,
      current.profile.currency,
      updated,
    );
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
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.profileId, current.profile.id)))
      .returning({ id: budgets.id });
    if (!deleted)
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
