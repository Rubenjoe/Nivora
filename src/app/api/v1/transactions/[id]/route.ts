import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { categories, transactions } from "@/lib/db/schema";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { transactionInput } from "@/lib/finance/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const { id } = await context.params;
    const [row] = await current.db
      .select({
        transaction: transactions,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .innerJoin(
        categories,
        and(
          eq(transactions.categoryId, categories.id),
          eq(categories.profileId, current.profile.id),
        ),
      )
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.profileId, current.profile.id),
        ),
      )
      .limit(1);
    if (!row)
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 },
      );
    return NextResponse.json(row);
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
    const parsed = transactionInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the transaction details and amount." },
        { status: 400 },
      );
    const [category] = await current.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, parsed.data.categoryId),
          eq(categories.profileId, current.profile.id),
          eq(categories.kind, parsed.data.kind),
        ),
      )
      .limit(1);
    if (!category)
      return NextResponse.json(
        { error: "Choose a valid category." },
        { status: 400 },
      );
    const [updated] = await current.db
      .update(transactions)
      .set({
        ...parsed.data,
        currency: current.profile.currency,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.profileId, current.profile.id),
        ),
      )
      .returning();
    if (!updated)
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 },
      );
    return NextResponse.json({ transaction: updated });
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
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.profileId, current.profile.id),
        ),
      )
      .returning({ id: transactions.id });
    if (!deleted)
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
