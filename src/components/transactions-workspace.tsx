"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SmokeType } from "@/components/ui/smoke-type";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/finance/money-format";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string;
};
type Transaction = {
  transaction: {
    id: string;
    kind: "income" | "expense";
    amount: string;
    currency: string;
    occurredOn: string;
    merchant: string | null;
    description: string | null;
    categoryId: string;
  };
  categoryName: string;
};
type Draft = {
  kind: "income" | "expense";
  amount: string;
  categoryId: string;
  occurredOn: string;
  merchant: string;
  description: string;
};

export type TransactionFilters = {
  from?: string;
  to?: string;
  kind?: "income" | "expense";
  categoryId?: string;
  merchant?: string;
};

function queryFromFilters(filters: TransactionFilters) {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.merchant) query.set("merchant", filters.merchant);
  return query.size ? `?${query}` : "";
}

const initialDraft = (): Draft => ({
  kind: "expense",
  amount: "",
  categoryId: "",
  occurredOn: "",
  merchant: "",
  description: "",
});

/** How long a deleted transaction can be restored before it is removed. */
const UNDO_WINDOW_MS = 5000;

function localDateToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function transactionPageUrl(filters: string, page: number) {
  const query = new URLSearchParams(filters.replace(/^\?/, ""));
  if (page > 1) query.set("page", String(page));
  else query.delete("page");
  const search = query.toString();
  return `/api/v1/transactions${search ? `?${search}` : ""}`;
}

export function TransactionsWorkspace({
  initialFilters = {},
}: {
  initialFilters?: TransactionFilters;
}) {
  const initialQuery = queryFromFilters(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [activeFilters, setActiveFilters] = useState(initialQuery);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [from, setFrom] = useState(initialFilters.from ?? "");
  const [to, setTo] = useState(initialFilters.to ?? "");
  const [categoryFilter, setCategoryFilter] = useState(
    initialFilters.categoryId ?? "",
  );
  const [kindFilter, setKindFilter] = useState(initialFilters.kind ?? "");
  const [merchantFilter, setMerchantFilter] = useState(
    initialFilters.merchant ?? "",
  );
  const [search, setSearch] = useState(initialFilters.merchant ?? "");
  const [currency, setCurrency] = useState("INR");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const { toast, dismiss } = useToast();
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const pendingDeletes = useRef(
    new Map<string, { timer: number; toastId: string }>(),
  );

  const load = useCallback(
    async (filters = "", page = 1, includeCategories = true) => {
      const [categoryResponse, transactionResponse] = await Promise.all([
        includeCategories
          ? fetch("/api/v1/categories", { cache: "no-store" })
          : Promise.resolve(null),
        fetch(transactionPageUrl(filters, page), { cache: "no-store" }),
      ]);
      const categoryResult = categoryResponse
        ? await categoryResponse.json()
        : null;
      const transactionResult = await transactionResponse.json();
      if (
        (categoryResponse && !categoryResponse.ok) ||
        !transactionResponse.ok
      ) {
        if (
          categoryResponse?.status === 401 ||
          transactionResponse.status === 401
        ) {
          throw new Error("Sign in to view and record your transactions.");
        }
        throw new Error(
          categoryResult?.error ??
            transactionResult.error ??
            "Unable to load transactions.",
        );
      }
      return {
        categories: categoryResult?.categories as Category[] | undefined,
        currency: categoryResult?.currency as string | undefined,
        transactions: transactionResult.transactions as Transaction[],
        hasMore: transactionResult.hasMore === true,
      };
    },
    [],
  );

  const refresh = useCallback(
    async (filters = activeFilters) => {
      try {
        const result = await load(filters);
        setActiveFilters(filters);
        setError(null);
        if (result.categories) setCategories(result.categories);
        if (result.currency) setCurrency(result.currency);
        setEntries(result.transactions);
        setHasMore(result.hasMore);
        setDraft((current) => ({
          ...current,
          occurredOn: current.occurredOn || localDateToday(),
          categoryId:
            current.categoryId ||
            result.categories?.find((item) => item.kind === current.kind)?.id ||
            "",
        }));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load transactions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [activeFilters, load],
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let active = true;
    load(initialQuery)
      .then((result) => {
        if (!active) return;
        setError(null);
        setCategories(result.categories ?? []);
        if (result.currency) setCurrency(result.currency);
        setEntries(result.transactions);
        setHasMore(result.hasMore);
        setDraft((current) => ({
          ...current,
          occurredOn: current.occurredOn || localDateToday(),
          categoryId:
            current.categoryId ||
            result.categories?.find((item) => item.kind === current.kind)?.id ||
            "",
        }));
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load transactions.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialQuery, load]);

  async function loadNextPage() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(entries.length / 100) + 1;
      const result = await load(activeFilters, nextPage, false);
      setEntries((current) => [...current, ...result.transactions]);
      setHasMore(result.hasMore);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load more transactions.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const availableCategories = categories.filter(
    (category) => category.kind === draft.kind,
  );

  const visibleEntries = useMemo(
    () => entries.filter((item) => !pendingDeleteIds.has(item.transaction.id)),
    [entries, pendingDeleteIds],
  );

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return visibleEntries;
    return visibleEntries.filter((item) => {
      const target = `${item.transaction.merchant ?? ""} ${item.categoryName} ${
        item.transaction.description ?? ""
      }`.toLowerCase();
      return target.includes(needle);
    });
  }, [visibleEntries, search]);

  function changeKind(kind: Draft["kind"]) {
    setDraft((current) => ({
      ...current,
      kind,
      categoryId:
        categories.find((category) => category.kind === kind)?.id ?? "",
    }));
  }

  function beginEdit(item: Transaction) {
    const transaction = item.transaction;
    setEditingId(transaction.id);
    setDraft({
      kind: transaction.kind,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      occurredOn: transaction.occurredOn,
      merchant: transaction.merchant ?? "",
      description: transaction.description ?? "",
    });
    setNotice(null);
    setError(null);
    document.getElementById("transaction-amount")?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(initialDraft());
    setNotice(null);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/v1/transactions/${editingId}`
          : "/api/v1/transactions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            merchant: draft.merchant.trim() || null,
            description: draft.description.trim() || null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save this transaction.");
      setNotice(
        editingId
          ? "Transaction updated."
          : `${draft.kind === "expense" ? "Expense" : "Income"} recorded.`,
      );
      setEditingId(null);
      setDraft(initialDraft());
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save this transaction.",
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const sendDelete = useCallback(async (id: string, keepalive = false) => {
    const response = await fetch(`/api/v1/transactions/${id}`, {
      method: "DELETE",
      keepalive,
    });
    // 404 means it is already gone, which is the outcome we want.
    if (!response.ok && response.status !== 404) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error ?? "Could not delete this transaction.");
    }
  }, []);

  function setPending(id: string, pending: boolean) {
    setPendingDeleteIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Hides the row now, deletes after the undo window unless restored. */
  function remove(id: string) {
    if (pendingDeletes.current.has(id)) return;
    setError(null);
    setNotice(null);
    if (editingId === id) cancelEdit();
    setPending(id, true);

    const timer = window.setTimeout(async () => {
      pendingDeletes.current.delete(id);
      try {
        await sendDelete(id);
        await refreshRef.current();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not delete this transaction.",
        );
      } finally {
        setPending(id, false);
      }
    }, UNDO_WINDOW_MS);

    const toastId = toast({
      message: "Transaction deleted.",
      actionLabel: "Undo",
      duration: UNDO_WINDOW_MS,
      onAction: () => {
        window.clearTimeout(timer);
        pendingDeletes.current.delete(id);
        setPending(id, false);
      },
    });
    pendingDeletes.current.set(id, { timer, toastId });
  }

  /* Never lose a delete the user already saw confirmed: if they leave the
     page or close the tab inside the undo window, finish it right away. */
  useEffect(() => {
    const pending = pendingDeletes.current;
    const flush = () => {
      pending.forEach(({ timer, toastId }, id) => {
        window.clearTimeout(timer);
        dismiss(toastId);
        void sendDelete(id, true).catch(() => undefined);
      });
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [dismiss, sendDelete]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (kindFilter) query.set("kind", kindFilter);
    if (categoryFilter) query.set("categoryId", categoryFilter);
    if (merchantFilter.trim()) query.set("merchant", merchantFilter.trim());
    void refresh(query.size ? `?${query}` : "");
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setKindFilter("");
    setCategoryFilter("");
    setMerchantFilter("");
    setSearch("");
    setLoading(true);
    void refresh("");
  }

  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">YOUR FINANCIAL RECORD</p>
        <h1>
          <SmokeType text="Transactions" />
        </h1>
        <p>
          Record what came in and what went out. Every entry below is real,
          saved data — nothing is filled in for you.
        </p>
      </div>

      <div className="transactions-grid">
        <section
          className="premium-card transaction-form-card"
          aria-labelledby="entry-title"
        >
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="transaction-card-heading">
            <div className="entry-mark">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="entry-title">
                {editingId ? "Edit transaction" : "Add a transaction"}
              </h2>
              <p>Only the essentials. Add the details you want.</p>
            </div>
          </div>
          <form className="transaction-form" onSubmit={save}>
            <div className="kind-switch" aria-label="Transaction type">
              <button
                type="button"
                aria-pressed={draft.kind === "expense"}
                className={draft.kind === "expense" ? "selected" : ""}
                onClick={() => changeKind("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                aria-pressed={draft.kind === "income"}
                className={draft.kind === "income" ? "selected" : ""}
                onClick={() => changeKind("income")}
              >
                Income
              </button>
            </div>
            <label htmlFor="transaction-amount" className="premium-label">
              Amount <span>({currency})</span>
            </label>
            <div className="amount-field premium-input-wrap">
              <span aria-hidden="true">{currency}</span>
              <input
                id="transaction-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                required
                maxLength={20}
                value={draft.amount}
                onChange={(event) =>
                  setDraft({ ...draft, amount: event.target.value })
                }
                className="premium-input"
              />
            </div>
            <label htmlFor="transaction-category" className="premium-label">
              Category
            </label>
            <select
              id="transaction-category"
              name="categoryId"
              required
              value={draft.categoryId}
              onChange={(event) =>
                setDraft({ ...draft, categoryId: event.target.value })
              }
              className="premium-select"
            >
              <option value="" disabled>
                Choose a category
              </option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <label htmlFor="transaction-date" className="premium-label">
              Date
            </label>
            <input
              id="transaction-date"
              name="occurredOn"
              type="date"
              required
              value={draft.occurredOn}
              onChange={(event) =>
                setDraft({ ...draft, occurredOn: event.target.value })
              }
              className="premium-input"
            />
            <label htmlFor="transaction-merchant" className="premium-label">
              Merchant <span>· optional</span>
            </label>
            <input
              id="transaction-merchant"
              name="merchant"
              type="text"
              autoComplete="off"
              maxLength={120}
              placeholder="e.g. Local market"
              value={draft.merchant}
              onChange={(event) =>
                setDraft({ ...draft, merchant: event.target.value })
              }
              className="premium-input"
            />
            <label htmlFor="transaction-description" className="premium-label">
              Note <span>· optional</span>
            </label>
            <textarea
              id="transaction-description"
              name="description"
              rows={2}
              maxLength={500}
              placeholder="Add a note…"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              className="premium-input"
            />
            {error && (
              <p className="transaction-message error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p
                className="transaction-message success"
                role="status"
                aria-live="polite"
              >
                {notice}
              </p>
            )}
            <div className="transaction-form-actions">
              {editingId && (
                <button
                  className="premium-btn-secondary secondary-action"
                  type="button"
                  onClick={cancelEdit}
                >
                  Cancel edit
                </button>
              )}
              <button
                className="premium-btn-primary primary-action"
                type="submit"
                disabled={busy || !availableCategories.length}
              >
                {busy && (
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                )}
                {busy
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Record transaction"}
              </button>
            </div>
            {!availableCategories.length && !loading && (
              <p className="category-hint">
                No {draft.kind} categories yet — add one below.
              </p>
            )}
          </form>
        </section>

        <section
          className="premium-card transaction-history-card"
          id="transaction-list"
          aria-labelledby="history-title"
        >
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="history-heading">
            <div>
              <h2 id="history-title">History</h2>
              <p>Your latest recorded transactions.</p>
            </div>
            <span className="record-count">
              {filteredEntries.length} matching · {visibleEntries.length} loaded
            </span>
          </div>
          <div className="transaction-filter-row">
            <label className="search-field">
              <span className="visually-hidden">Search transactions</span>
              <input
                type="search"
                placeholder="Search merchant, note, category…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="premium-input"
              />
            </label>
          </div>
          <form className="transaction-filters" onSubmit={applyFilters}>
            <label>
              <span className="premium-label">From</span>
              <input
                aria-label="Filter transactions from date"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="premium-input"
              />
            </label>
            <label>
              <span className="premium-label">To</span>
              <input
                aria-label="Filter transactions to date"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="premium-input"
              />
            </label>
            <label>
              <span className="premium-label">Type</span>
              <select
                aria-label="Filter by transaction type"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value)}
                className="premium-select"
              >
                <option value="">Any</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              <span className="premium-label">Category</span>
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="premium-select"
              >
                <option value="">Any</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="premium-label">Merchant</span>
              <input
                aria-label="Filter by merchant"
                type="text"
                placeholder="Any merchant"
                maxLength={120}
                value={merchantFilter}
                onChange={(event) => setMerchantFilter(event.target.value)}
                className="premium-input"
              />
            </label>
            <button type="submit" className="premium-btn-primary">
              Apply filters
            </button>
            {(from ||
              to ||
              kindFilter ||
              categoryFilter ||
              merchantFilter ||
              search) && (
              <button
                type="button"
                className="premium-btn-secondary small"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
            <a
              className="premium-btn-secondary export-link"
              href={`/api/v1/export/transactions${(() => {
                const query = new URLSearchParams();
                if (from) query.set("from", from);
                if (to) query.set("to", to);
                if (kindFilter) query.set("kind", kindFilter);
                if (categoryFilter) query.set("categoryId", categoryFilter);
                if (merchantFilter.trim())
                  query.set("merchant", merchantFilter.trim());
                const value = query.toString();
                return value ? `?${value}` : "";
              })()}`}
            >
              Export CSV
            </a>
          </form>
          {loading ? (
            <p className="history-empty" role="status">
              Loading transactions…
            </p>
          ) : filteredEntries.length === 0 ? (
            <div className="premium-empty premium-empty-compact">
              <span className="premium-empty-symbol">—</span>
              <h3>No transactions in this view</h3>
              <p>
                Your saved entries will appear here. Nothing is added until you
                record it.
              </p>
            </div>
          ) : (
            <div className="premium-transaction-list">
              {filteredEntries.map((item) => {
                const transaction = item.transaction;
                return (
                  <article
                    className="premium-transaction-row"
                    key={transaction.id}
                  >
                    <div
                      className={`premium-transaction-sign ${transaction.kind}`}
                      aria-hidden="true"
                    >
                      {transaction.kind === "expense" ? "−" : "+"}
                    </div>
                    <div className="premium-transaction-desc">
                      <strong>
                        {transaction.merchant || item.categoryName}
                      </strong>
                      <span>
                        {item.categoryName}
                        {transaction.description
                          ? ` · ${transaction.description}`
                          : ""}
                      </span>
                    </div>
                    <time
                      className="premium-transaction-date"
                      dateTime={transaction.occurredOn}
                    >
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(`${transaction.occurredOn}T12:00:00`))}
                    </time>
                    <strong
                      className={`premium-transaction-amount ${transaction.kind}`}
                    >
                      {formatMoney(transaction.amount, transaction.currency, {
                        sign:
                          transaction.kind === "expense"
                            ? "negative"
                            : "positive",
                      })}
                    </strong>
                    <div className="premium-transaction-actions">
                      <button
                        className="premium-transaction-icon-btn icon-action"
                        type="button"
                        aria-label={`Edit ${transaction.merchant || item.categoryName}`}
                        onClick={() => beginEdit(item)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="premium-transaction-icon-btn icon-action delete-action"
                        type="button"
                        aria-label={`Delete ${transaction.merchant || item.categoryName}`}
                        onClick={() => remove(transaction.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {hasMore && !loading && (
            <button
              type="button"
              className="premium-btn-secondary transaction-load-more"
              onClick={() => void loadNextPage()}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading more…" : "Load more transactions"}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
