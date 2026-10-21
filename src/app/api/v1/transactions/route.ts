import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { categories, transactions } from "@/lib/db/schema";
import { hasTrustedOrigin } from "@/lib/appwrite/server";
import {
  requireFinanceUser,
  serviceUnavailable,
  unauthorized,
} from "@/lib/finance/auth";
import { transactionInput, transactionQuery } from "@/lib/finance/validation";

export async function GET(request: Request) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const query = transactionQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success)
      return NextResponse.json(
        { error: "Invalid transaction filters." },
        { status: 400 },
      );
    const filters = [
      eq(transactions.profileId, current.profile.id),
      eq(transactions.currency, current.profile.currency),
    ];
    if (query.data.from)
      filters.push(gte(transactions.occurredOn, query.data.from));
    if (query.data.to)
      filters.push(lte(transactions.occurredOn, query.data.to));
    if (query.data.kind) filters.push(eq(transactions.kind, query.data.kind));
    const rows = await current.db
      .select({
        transaction: transactions,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      .limit(100);
    return NextResponse.json({ transactions: rows });
  } catch {
    return serviceUnavailable();
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
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
    const [created] = await current.db
      .insert(transactions)
      .values({
        ...parsed.data,
        profileId: current.profile.id,
        currency: current.profile.currency,
      })
      .returning();
    return NextResponse.json({ transaction: created }, { status: 201 });
  } catch {
    return serviceUnavailable();
  }
}
