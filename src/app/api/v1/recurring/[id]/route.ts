import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  categories,
  recurringOccurrences,
  recurringSchedules,
  transactions,
} from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { isDue } from "@/lib/finance/recurrence";
import { addRecurrenceDue, toISODate } from "@/lib/finance/periods";

type Context = { params: Promise<{ id: string }> };

const schedulePatch = z.object({
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0)
    .optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  frequency: z.enum(["weekly", "monthly", "yearly"]).optional(),
  endDate: z.iso.date().nullable().optional(),
  nextDueDate: z.iso.date().optional(),
  status: z.enum(["active", "paused", "cancelled"]).optional(),
});

export async function PATCH(request: Request, context: Context) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const parsed = schedulePatch.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid schedule changes." },
        { status: 400 },
      );
    const data = parsed.data;
    const [existing] = await current.db
      .select()
      .from(recurringSchedules)
      .where(
        and(
          eq(recurringSchedules.id, id),
          eq(recurringSchedules.profileId, current.profile.id),
        ),
      )
      .limit(1);
    if (!existing)
      return NextResponse.json(
        { error: "Schedule not found." },
        { status: 404 },
      );
    if (data.categoryId) {
      const [category] = await current.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.profileId, current.profile.id),
            eq(categories.kind, existing.kind),
          ),
        )
        .limit(1);
      if (!category)
        return NextResponse.json(
          { error: "Choose a valid category for this schedule type." },
          { status: 400 },
        );
    }
    const [updated] = await current.db
      .update(recurringSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(recurringSchedules.id, id),
          eq(recurringSchedules.profileId, current.profile.id),
        ),
      )
      .returning();
    return NextResponse.json({ schedule: updated });
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
      .delete(recurringSchedules)
      .where(
        and(
          eq(recurringSchedules.id, id),
          eq(recurringSchedules.profileId, current.profile.id),
        ),
      )
      .returning({ id: recurringSchedules.id });
    if (!deleted)
      return NextResponse.json(
        { error: "Schedule not found." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function POST(request: Request, context: Context) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const [schedule] = await current.db
      .select()
      .from(recurringSchedules)
      .where(
        and(
          eq(recurringSchedules.id, id),
          eq(recurringSchedules.profileId, current.profile.id),
        ),
      )
      .limit(1);
    if (!schedule)
      return NextResponse.json(
        { error: "Schedule not found." },
        { status: 404 },
      );
    const today = toISODate(new Date());
    if (!isDue({ ...schedule, endDate: schedule.endDate }, today)) {
      return NextResponse.json(
        {
          error:
            "This schedule is not due yet, is paused, cancelled, or has ended.",
        },
        { status: 400 },
      );
    }
    const result = await current.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: recurringOccurrences.id })
        .from(recurringOccurrences)
        .where(
          and(
            eq(recurringOccurrences.scheduleId, schedule.id),
            eq(recurringOccurrences.dueDate, schedule.nextDueDate),
          ),
        )
        .limit(1);
      if (existing) return { duplicate: true as const };
      const [transaction] = await tx
        .insert(transactions)
        .values({
          profileId: current.profile.id,
          categoryId: schedule.categoryId,
          kind: schedule.kind,
          amount: schedule.amount,
          currency: current.profile.currency,
          occurredOn: schedule.nextDueDate,
          merchant: schedule.merchant,
          description:
            schedule.description ??
            `Recurring ${schedule.frequency} ${schedule.kind}`,
        })
        .returning();
      await tx.insert(recurringOccurrences).values({
        scheduleId: schedule.id,
        profileId: current.profile.id,
        transactionId: transaction.id,
        dueDate: schedule.nextDueDate,
      });
      const nextDue = addRecurrenceDue(
        schedule.nextDueDate,
        schedule.frequency,
        schedule.startDate,
      );
      await tx
        .update(recurringSchedules)
        .set({ nextDueDate: nextDue, updatedAt: new Date() })
        .where(
          and(
            eq(recurringSchedules.id, schedule.id),
            eq(recurringSchedules.profileId, current.profile.id),
          ),
        );
      return { duplicate: false as const, transaction };
    });
    if (result.duplicate) {
      return NextResponse.json(
        { error: "This occurrence was already recorded." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { transaction: result.transaction },
      { status: 201 },
    );
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
