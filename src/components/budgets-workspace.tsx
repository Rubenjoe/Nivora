"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Archive,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";

type Budget = {
  budget: {
    id: string;
    name: string;
    amount: string;
    categoryId: string | null;
    periodMonth: string;
    warningThresholdPercent: number;
    status: "active" | "archived";
  };
  spent: string;
  remaining: string;
  percent: number;
  overBudget: boolean;
  thresholdAlert: boolean;
};

type Category = { id: string; name: string; kind: "income" | "expense" };

type Draft = {
  name: string;
  amount: string;
  categoryId: string;
  periodMonth: string;
  warningThresholdPercent: string;
};

const initialDraft = (): Draft => ({
  name: "",
  amount: "",
  categoryId: "",
  periodMonth: currentMonth(),
  warningThresholdPercent: "80",
});

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(periodMonth: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${periodMonth}T12:00:00`));
}

export function BudgetsWorkspace() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [budgetResponse, categoryResponse] = await Promise.all([
      fetch("/api/v1/budgets", { cache: "no-store" }),
      fetch("/api/v1/categories", { cache: "no-store" }),
    ]);
    const budgetResult = await budgetResponse.json();
    const categoryResult = await categoryResponse.json();
    if (!budgetResponse.ok)
      throw new Error(budgetResult.error ?? "Unable to load budgets.");
    if (!categoryResponse.ok)
      throw new Error(categoryResult.error ?? "Unable to load categories.");
    return {
      budgets: budgetResult.budgets as Budget[],
      categories: (categoryResult.categories as Category[]).filter(
        (category) => category.kind === "expense",
      ),
      currency: (categoryResult.currency ?? "INR") as string,
    };
  }, []);

  const applyLoaded = useCallback(
    (result: Awaited<ReturnType<typeof load>>) => {
      setBudgets(result.budgets);
      setCategories(result.categories);
      setCurrency(result.currency);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const result = await load();
    applyLoaded(result);
  }, [load, applyLoaded]);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setError(null);
        applyLoaded(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Unable to load budgets.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, applyLoaded]);

  const formatMoney = useMemo(
    () => (amount: string) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
      }).format(Number(amount)),
    [currency],
  );

  const visible = showArchived
    ? budgets
    : budgets.filter((item) => item.budget.status === "active");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        name: draft.name.trim(),
        amount: draft.amount,
        categoryId: draft.categoryId || null,
        periodMonth: draft.periodMonth,
        warningThresholdPercent: Number(draft.warningThresholdPercent),
      };
      const response = await fetch(
        editingId ? `/api/v1/budgets/${editingId}` : "/api/v1/budgets",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save this budget.");
      setNotice(editingId ? "Budget updated." : "Budget created.");
      setEditingId(null);
      setDraft(initialDraft());
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this budget.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchBudget(id: string, changes: Record<string, unknown>) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not update this budget.");
      setNotice("Budget updated.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update this budget.",
      );
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this budget? This cannot be undone.")) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/budgets/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not delete this budget.");
      setNotice("Budget deleted.");
      if (editingId === id) {
        setEditingId(null);
        setDraft(initialDraft());
      }
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this budget.",
      );
    }
  }

  function beginEdit(item: Budget) {
    setEditingId(item.budget.id);
    setDraft({
      name: item.budget.name,
      amount: item.budget.amount,
      categoryId: item.budget.categoryId ?? "",
      periodMonth: item.budget.periodMonth,
      warningThresholdPercent: String(item.budget.warningThresholdPercent),
    });
    setNotice(null);
    setError(null);
  }

  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">PLAN YOUR MONTH</p>
        <h1>Budgets</h1>
        <p>
          Set a monthly spending plan, optionally for one category, and watch
          your real expenses fill it.
        </p>
      </div>

      <div className="feature-grid">
        <section
          className="feature-form-card"
          aria-labelledby="budget-form-title"
        >
          <div className="feature-card-heading">
            <div className="entry-mark">
              <Wallet size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="budget-form-title">
                {editingId ? "Edit budget" : "Create a budget"}
              </h2>
              <p>Budgets apply to one calendar month.</p>
            </div>
          </div>
          <form className="feature-form" onSubmit={save}>
            <label htmlFor="budget-name">Name</label>
            <input
              id="budget-name"
              required
              maxLength={80}
              value={draft.name}
              placeholder="e.g. Monthly groceries"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            <label htmlFor="budget-amount">Amount ({currency})</label>
            <input
              id="budget-amount"
              required
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(event) =>
                setDraft({ ...draft, amount: event.target.value })
              }
            />
            <label htmlFor="budget-month">Month</label>
            <input
              id="budget-month"
              type="month"
              required
              value={draft.periodMonth.slice(0, 7)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  periodMonth: `${event.target.value}-01`,
                })
              }
            />
            <label htmlFor="budget-category">
              Category <span>· optional</span>
            </label>
            <select
              id="budget-category"
              value={draft.categoryId}
              onChange={(event) =>
                setDraft({ ...draft, categoryId: event.target.value })
              }
            >
              <option value="">All spending</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <label htmlFor="budget-threshold">Alert at (%)</label>
            <input
              id="budget-threshold"
              type="number"
              min={1}
              max={100}
              required
              value={draft.warningThresholdPercent}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  warningThresholdPercent: event.target.value,
                })
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
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(initialDraft());
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button type="submit" className="primary-action" disabled={busy}>
                {busy && (
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                )}
                {busy
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create budget"}
              </button>
            </div>
          </form>
        </section>

        <section
          className="feature-list-card"
          aria-labelledby="budget-list-title"
        >
          <div className="history-heading">
            <div>
              <h2 id="budget-list-title">Your budgets</h2>
              <p>Progress is calculated from real recorded expenses.</p>
            </div>
            <button
              type="button"
              className="secondary-action small"
              onClick={() => setShowArchived((value) => !value)}
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          </div>
          {loading ? (
            <p className="history-empty" role="status">
              Loading budgets…
            </p>
          ) : error && !budgets.length ? (
            <p className="history-empty" role="status">
              {error}
            </p>
          ) : !visible.length ? (
            <div className="history-empty">
              <span className="empty-ledger" aria-hidden="true">
                —
              </span>
              <h3>No budgets yet</h3>
              <p>Create your first monthly budget to start tracking.</p>
            </div>
          ) : (
            <ul className="budget-list">
              {visible.map((item) => {
                const category = categories.find(
                  (category) => category.id === item.budget.categoryId,
                );
                return (
                  <li key={item.budget.id} className="budget-item">
                    <div className="budget-item-head">
                      <div>
                        <strong>{item.budget.name}</strong>
                        <span>
                          {monthLabel(item.budget.periodMonth)}
                          {category ? ` · ${category.name}` : " · All spending"}
                          {item.budget.status === "archived"
                            ? " · Archived"
                            : ""}
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={`Edit ${item.budget.name}`}
                          onClick={() => beginEdit(item)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={
                            item.budget.status === "archived"
                              ? `Restore ${item.budget.name}`
                              : `Archive ${item.budget.name}`
                          }
                          onClick={() =>
                            void patchBudget(item.budget.id, {
                              status:
                                item.budget.status === "archived"
                                  ? "active"
                                  : "archived",
                            })
                          }
                        >
                          <Archive size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-action delete-action"
                          aria-label={`Delete ${item.budget.name}`}
                          onClick={() => void remove(item.budget.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="budget-item-body">
                      <span>
                        {formatMoney(item.spent)} spent of{" "}
                        {formatMoney(item.budget.amount)}
                      </span>
                      <span
                        className={`budget-percent ${
                          item.overBudget
                            ? "over"
                            : item.thresholdAlert
                              ? "warn"
                              : ""
                        }`}
                      >
                        {item.percent}%
                      </span>
                    </div>
                    <div
                      className={`budget-progress ${
                        item.overBudget
                          ? "over"
                          : item.thresholdAlert
                            ? "warn"
                            : ""
                      }`}
                      role="progressbar"
                      aria-valuenow={Math.round(item.percent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.budget.name} budget usage`}
                    >
                      <span
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                    {(item.overBudget || item.thresholdAlert) &&
                      item.budget.status === "active" && (
                        <p className="budget-alert-note">
                          <AlertTriangle size={13} aria-hidden="true" />
                          {item.overBudget
                            ? `Over budget by ${formatMoney(
                                String(Math.abs(Number(item.remaining))),
                              )}`
                            : `Past ${item.budget.warningThresholdPercent}% of this budget`}
                        </p>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
