"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

const initialDraft = (): Draft => ({
  kind: "expense",
  amount: "",
  categoryId: "",
  occurredOn: "",
  merchant: "",
  description: "",
});

function localDateToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function TransactionsWorkspace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (filters = "") => {
    const [categoryResponse, transactionResponse] = await Promise.all([
      fetch("/api/v1/categories", { cache: "no-store" }),
      fetch(`/api/v1/transactions${filters}`, { cache: "no-store" }),
    ]);
    const categoryResult = await categoryResponse.json();
    const transactionResult = await transactionResponse.json();
    if (!categoryResponse.ok || !transactionResponse.ok) {
      if (
        categoryResponse.status === 401 ||
        transactionResponse.status === 401
      ) {
        throw new Error("Sign in to view and record your transactions.");
      }
      throw new Error(
        categoryResult.error ??
          transactionResult.error ??
          "Unable to load transactions.",
      );
    }
    return {
      categories: categoryResult.categories as Category[],
      currency: categoryResult.currency as string,
      transactions: transactionResult.transactions as Transaction[],
    };
  }, []);

  const refresh = useCallback(
    async (filters = "") => {
      try {
        const result = await load(filters);
        setError(null);
        setCategories(result.categories);
        setCurrency(result.currency);
        setEntries(result.transactions);
        setDraft((current) => ({
          ...current,
          occurredOn: current.occurredOn || localDateToday(),
          categoryId:
            current.categoryId ||
            result.categories.find((item) => item.kind === current.kind)?.id ||
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
    [load],
  );

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setError(null);
        setCategories(result.categories);
        setCurrency(result.currency);
        setEntries(result.transactions);
        setDraft((current) => ({
          ...current,
          occurredOn: current.occurredOn || localDateToday(),
          categoryId:
            current.categoryId ||
            result.categories.find((item) => item.kind === current.kind)?.id ||
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
  }, [load]);

  const availableCategories = categories.filter(
    (category) => category.kind === draft.kind,
  );
  const formatMoney = (amount: string, code: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
    }).format(amount as unknown as number);

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
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this transaction? This cannot be undone."))
      return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/transactions/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not delete this transaction.");
      setNotice("Transaction deleted.");
      if (editingId === id) cancelEdit();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this transaction.",
      );
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    void refresh(query.size ? `?${query}` : "");
  }

  return (
    <main className="transactions-page">
      <a className="skip-link" href="#transaction-list">
        Skip to transaction history
      </a>
      <header className="transactions-header">
        <Link className="transactions-back" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Overview
        </Link>
        <span className="transactions-brand">nivora</span>
        <ThemeToggle />
      </header>
      <div className="transactions-content">
        <p className="eyebrow">YOUR FINANCIAL RECORD</p>
        <h1>Transactions</h1>
        <p className="transactions-intro">
          Record what came in and what went out. Your entries stay private to
          your account.
        </p>

        <div className="transactions-grid">
          <section
            className="transaction-form-card"
            aria-labelledby="entry-title"
          >
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
              <label htmlFor="transaction-amount">
                Amount <span>({currency})</span>
              </label>
              <div className="amount-field">
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
                />
              </div>
              <label htmlFor="transaction-category">Category</label>
              <select
                id="transaction-category"
                name="categoryId"
                required
                value={draft.categoryId}
                onChange={(event) =>
                  setDraft({ ...draft, categoryId: event.target.value })
                }
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
              <label htmlFor="transaction-date">Date</label>
              <input
                id="transaction-date"
                name="occurredOn"
                type="date"
                required
                value={draft.occurredOn}
                onChange={(event) =>
                  setDraft({ ...draft, occurredOn: event.target.value })
                }
              />
              <label htmlFor="transaction-merchant">
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
              />
              <label htmlFor="transaction-description">
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
                    className="secondary-action"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  className="primary-action"
                  type="submit"
                  disabled={busy || !availableCategories.length}
                >
                  {busy && (
                    <LoaderCircle
                      className="spin"
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                  {busy
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Record transaction"}
                </button>
              </div>
            </form>
          </section>

          <section
            className="transaction-history-card"
            id="transaction-list"
            aria-labelledby="history-title"
          >
            <div className="history-heading">
              <div>
                <h2 id="history-title">Recent activity</h2>
                <p>Your latest recorded transactions.</p>
              </div>
              <span className="record-count">{entries.length} shown</span>
            </div>
            <form className="transaction-filters" onSubmit={applyFilters}>
              <label>
                From
                <input
                  aria-label="Filter transactions from date"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  aria-label="Filter transactions to date"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
              <button type="submit" className="filter-button">
                Apply dates
              </button>
            </form>
            {loading ? (
              <p className="history-empty" role="status">
                Loading transactions…
              </p>
            ) : entries.length === 0 ? (
              <div className="history-empty">
                <span className="empty-ledger" aria-hidden="true">
                  —
                </span>
                <h3>No transactions in this view</h3>
                <p>
                  Your saved entries will appear here. Nothing is added until
                  you record it.
                </p>
              </div>
            ) : (
              <div className="transaction-list">
                {entries.map((item) => {
                  const transaction = item.transaction;
                  return (
                    <article className="transaction-row" key={transaction.id}>
                      <div
                        className={`transaction-type-mark ${transaction.kind}`}
                        aria-hidden="true"
                      >
                        {transaction.kind === "expense" ? "−" : "+"}
                      </div>
                      <div className="transaction-description">
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
                        className="transaction-date"
                        dateTime={transaction.occurredOn}
                      >
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(
                          new Date(`${transaction.occurredOn}T12:00:00`),
                        )}
                      </time>
                      <strong
                        className={`transaction-amount ${transaction.kind}`}
                      >
                        {transaction.kind === "expense" ? "−" : "+"}
                        {formatMoney(transaction.amount, transaction.currency)}
                      </strong>
                      <div className="row-actions">
                        <button
                          className="icon-action"
                          type="button"
                          aria-label={`Edit ${transaction.merchant || item.categoryName}`}
                          onClick={() => beginEdit(item)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="icon-action delete-action"
                          type="button"
                          aria-label={`Delete ${transaction.merchant || item.categoryName}`}
                          onClick={() => void remove(transaction.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
