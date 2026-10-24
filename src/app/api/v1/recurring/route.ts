import { NextResponse } from "next/server";
import { and, asc, eq, lte } from "drizzle-orm";
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
import { nextDueOnOrAfter, isDue } from "@/lib/finance/recurrence";
import { addRecurrenceDue, toISODate } from "@/lib/finance/periods";

const scheduleInput = z.object({
  categoryId: z.string().uuid(),
  kind: z.enum(["income", "expense"]),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  merchant: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().optional(),
});

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

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const rows = await current.db
      .select({
        schedule: recurringSchedules,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(recurringSchedules)
      .innerJoin(categories, eq(recurringSchedules.categoryId, categories.id))
      .where(eq(recurringSchedules.profileId, current.profile.id))
      .orderBy(asc(recurringSchedules.nextDueDate));
    const today = toISODate(new Date());
    const upcoming = rows.filter((row) => row.schedule.nextDueDate >= today);
    const overdue = rows.filter(
      (row) =>
        row.schedule.status === "active" && row.schedule.nextDueDate < today,
    );
    return NextResponse.json({
      currency: current.profile.currency,
      schedules: rows,
      overdueCount: overdue.length,
      upcomingCount: upcoming.filter((r) => r.schedule.status === "active")
        .length,
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
    const parsed = scheduleInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid schedule details." },
        { status: 400 },
      );
    const data = parsed.data;
    const [category] = await current.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, data.categoryId),
          eq(categories.profileId, current.profile.id),
          eq(categories.kind, data.kind),
        ),
      )
      .limit(1);
    if (!category)
      return NextResponse.json(
        { error: "Choose a valid category for this schedule type." },
        { status: 400 },
      );
    if (data.endDate && data.endDate < data.startDate)
      return NextResponse.json(
        { error: "End date cannot be before the start date." },
        { status: 400 },
      );
    const nextDueDate = nextDueOnOrAfter(
      data.startDate,
      data.frequency,
      toISODate(new Date()),
    );
    if (data.endDate && nextDueDate > data.endDate)
      return NextResponse.json(
        { error: "This schedule has already ended." },
        { status: 400 },
      );
    const [created] = await current.db
      .insert(recurringSchedules)
      .values({
        profileId: current.profile.id,
        ...data,
        merchant: data.merchant ?? null,
        description: data.description ?? null,
        endDate: data.endDate ?? null,
        nextDueDate,
      })
      .returning();
    return NextResponse.json({ schedule: created }, { status: 201 });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
