import type { Metadata } from "next";
import { TransactionsWorkspace } from "@/components/transactions-workspace";
import { transactionQuery } from "@/lib/finance/validation";

export const metadata: Metadata = {
  title: "Transactions | Nivora",
  description:
    "Record and review income and expenses. Every entry is private to your account.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = transactionQuery.safeParse({
    from: first(params.from),
    to: first(params.to),
    kind: first(params.kind),
    categoryId: first(params.categoryId),
    merchant: first(params.merchant),
  });
  const initialFilters = parsed.success ? parsed.data : {};

  return (
    <TransactionsWorkspace
      key={JSON.stringify(initialFilters)}
      initialFilters={initialFilters}
    />
  );
}
