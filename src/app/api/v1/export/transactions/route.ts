import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { categories, transactions } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { transactionQuery } from "@/lib/finance/validation";
import { buildCsv } from "@/lib/finance/csv";

const MAX_EXPORT_ROWS = 5000;

export async function GET(request: Request) {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const query = transactionQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success)
      return NextResponse.json(
        { error: "Invalid export filters." },
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
    if (query.data.categoryId)
      filters.push(eq(transactions.categoryId, query.data.categoryId));
    const rows = await current.db
      .select({
        id: transactions.id,
        occurredOn: transactions.occurredOn,
        kind: transactions.kind,
        amount: transactions.amount,
        currency: transactions.currency,
        category: categories.name,
        merchant: transactions.merchant,
        description: transactions.description,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      .limit(MAX_EXPORT_ROWS + 1);
    if (rows.length > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error: `Exports are limited to ${MAX_EXPORT_ROWS} rows. Narrow the date range.`,
        },
        { status: 400 },
      );
    }
    const csv = buildCsv(
      [
        "Date",
        "Type",
        "Category",
        "Merchant",
        "Description",
        "Amount",
        "Currency",
      ],
      rows.map((row) => [
        row.occurredOn,
        row.kind,
        row.category,
        row.merchant ?? "",
        row.description ?? "",
        row.amount,
        row.currency,
      ]),
    );
    const stamp = toExportStamp(new Date());
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nivora-transactions-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

function toExportStamp(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}
