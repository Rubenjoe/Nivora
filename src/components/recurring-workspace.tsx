"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  CalendarClock,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { formatMoney as formatCurrency } from "@/lib/finance/money-format";

type ScheduleRow = {
  schedule: {
    id: string;
    categoryId: string;
    kind: "income" | "expense";
    amount: string;
    merchant: string | null;
    description: string | null;
    frequency: "weekly" | "monthly" | "yearly";
    startDate: string;
    endDate: string | null;
    nextDueDate: string;
    status: "active" | "paused" | "cancelled";
  };
  categoryName: string;
};

type Category = { id: string; name: string; kind: "income" | "expense" };

const initialDraft = () => ({
  kind: "expense" as "expense" | "income",
  categoryId: "",
  amount: "",
  merchant: "",
  frequency: "monthly" as "weekly" | "monthly" | "yearly",
  startDate: todayISO(),
  endDate: "",
});

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function RecurringWorkspace() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [recurringResponse, categoryResponse] = await Promise.all([
      fetch("/api/v1/recurring", { cache: "no-store" }),
      fetch("/api/v1/categories", { cache: "no-store" }),
    ]);
    const recurringResult = await recurringResponse.json();
    const categoryResult = await categoryResponse.json();
    if (!recurringResponse.ok)
      throw new Error(recurringResult.error ?? "Unable to load schedules.");
    if (!categoryResponse.ok)
      throw new Error(categoryResult.error ?? "Unable to load categories.");
    return {
      schedules: recurringResult.schedules as ScheduleRow[],
      categories: categoryResult.categories as Category[],
      currency: (categoryResult.currency ?? "INR") as string,
    };
  }, []);

  const applyLoaded = useCallback(
    (result: Awaited<ReturnType<typeof load>>) => {
      setSchedules(result.schedules);
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
          cause instanceof Error ? cause.message : "Unable to load schedules.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, applyLoaded]);

  const formatAmount = (amount: string) => formatCurrency(amount, currency);

  const today = todayISO();
  const availableCategories = categories.filter(
    (category) => category.kind === draft.kind,
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          merchant: draft.merchant.trim() || null,
          endDate: draft.endDate || null,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save this schedule.");
      setNotice("Schedule created.");
      setDraft(initialDraft());
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save this schedule.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchSchedule(id: string, changes: Record<string, unknown>) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not update this schedule.");
      setNotice("Schedule updated.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update this schedule.",
      );
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this schedule? Existing transactions remain."))
      return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/recurring/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not delete this schedule.");
      setNotice("Schedule deleted.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this schedule.",
      );
    }
  }

  async function recordNow(id: string) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/recurring/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not record this occurrence.");
      setNotice("Transaction recorded from schedule.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not record this occurrence.",
      );
    }
  }

  const overdue = schedules.filter(
    (row) =>
      row.schedule.status === "active" && row.schedule.nextDueDate < today,
  );

  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">MONEY ON A SCHEDULE</p>
        <h1>Recurring transactions</h1>
        <p>
          Set up income and expenses that repeat. Recording is always explicit —
          Nivora never silently creates transactions.
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="overdue-banner" role="status">
          <CalendarClock size={16} aria-hidden="true" />
          <span>
            {overdue.length} schedule{overdue.length === 1 ? "" : "s"} overdue —
            review and record them below.
          </span>
        </div>
      )}

      <div className="feature-grid">
        <section
          className="feature-form-card"
          aria-labelledby="recurring-form-title"
        >
          <GlowingEffect
            glow
            disabled={false}
            spread={30}
            proximity={56}
            inactiveZone={0.12}
          />
          <div className="feature-card-heading">
            <div className="entry-mark">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="recurring-form-title">New schedule</h2>
              <p>Choose what repeats and how often.</p>
            </div>
          </div>
          <form className="feature-form" onSubmit={save}>
            <div className="kind-switch" aria-label="Schedule type">
              <button
                type="button"
                aria-pressed={draft.kind === "expense"}
                className={draft.kind === "expense" ? "selected" : ""}
                onClick={() =>
                  setDraft({ ...draft, kind: "expense", categoryId: "" })
                }
              >
                Expense
              </button>
              <button
                type="button"
                aria-pressed={draft.kind === "income"}
                className={draft.kind === "income" ? "selected" : ""}
                onClick={() =>
                  setDraft({ ...draft, kind: "income", categoryId: "" })
                }
              >
                Income
              </button>
            </div>
            <label htmlFor="schedule-category">Category</label>
            <select
              id="schedule-category"
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
            <label htmlFor="schedule-amount">Amount ({currency})</label>
            <input
              id="schedule-amount"
              required
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(event) =>
                setDraft({ ...draft, amount: event.target.value })
              }
            />
            <label htmlFor="schedule-merchant">
              Merchant <span>· optional</span>
            </label>
            <input
              id="schedule-merchant"
              maxLength={120}
              value={draft.merchant}
              onChange={(event) =>
                setDraft({ ...draft, merchant: event.target.value })
              }
            />
            <label htmlFor="schedule-frequency">Frequency</label>
            <select
              id="schedule-frequency"
              value={draft.frequency}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  frequency: event.target.value as
                    "weekly" | "monthly" | "yearly",
                })
              }
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <label htmlFor="schedule-start">Start date</label>
            <input
              id="schedule-start"
              type="date"
              required
              value={draft.startDate}
              onChange={(event) =>
                setDraft({ ...draft, startDate: event.target.value })
              }
            />
            <label htmlFor="schedule-end">
              End date <span>· optional</span>
            </label>
            <input
              id="schedule-end"
              type="date"
              value={draft.endDate}
              onChange={(event) =>
                setDraft({ ...draft, endDate: event.target.value })
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
              <button type="submit" className="primary-action" disabled={busy}>
                {busy && (
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                )}
                {busy ? "Saving…" : "Create schedule"}
              </button>
            </div>
          </form>
        </section>

        <section
          className="feature-list-card"
          aria-labelledby="recurring-list-title"
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
              <h2 id="recurring-list-title">Your schedules</h2>
              <p>
                Recording a due occurrence creates exactly one transaction —
                duplicates are rejected.
              </p>
            </div>
          </div>
          {loading ? (
            <p className="history-empty" role="status">
              Loading schedules…
            </p>
          ) : error && !schedules.length ? (
            <p className="history-empty" role="status">
              {error}
            </p>
          ) : !schedules.length ? (
            <div className="history-empty">
              <span className="empty-ledger" aria-hidden="true">
                —
              </span>
              <h3>No schedules yet</h3>
              <p>Create a schedule for your rent, salary, or subscriptions.</p>
            </div>
          ) : (
            <ul className="budget-list">
              {schedules.map((row) => {
                const { schedule } = row;
                const due =
                  schedule.status === "active" && schedule.nextDueDate <= today;
                return (
                  <li key={schedule.id} className="budget-item">
                    <div className="budget-item-head">
                      <div>
                        <strong>{schedule.merchant ?? row.categoryName}</strong>
                        <span>
                          {row.categoryName} · {schedule.frequency} ·{" "}
                          {formatAmount(schedule.amount)} ·{" "}
                          {schedule.status === "active"
                            ? due
                              ? `Due ${schedule.nextDueDate} (overdue)`
                              : `Next ${schedule.nextDueDate}`
                            : schedule.status}
                        </span>
                      </div>
                      <div className="row-actions">
                        {schedule.status === "active" && (
                          <button
                            type="button"
                            className="icon-action record-action"
                            aria-label={`Record ${row.categoryName} occurrence now`}
                            onClick={() => void recordNow(schedule.id)}
                          >
                            <Zap size={16} aria-hidden="true" />
                          </button>
                        )}
                        {schedule.status === "active" ? (
                          <button
                            type="button"
                            className="icon-action"
                            aria-label={`Pause schedule`}
                            onClick={() =>
                              void patchSchedule(schedule.id, {
                                status: "paused",
                              })
                            }
                          >
                            <PauseCircle size={16} aria-hidden="true" />
                          </button>
                        ) : schedule.status === "paused" ? (
                          <button
                            type="button"
                            className="icon-action"
                            aria-label={`Resume schedule`}
                            onClick={() =>
                              void patchSchedule(schedule.id, {
                                status: "active",
                              })
                            }
                          >
                            <PlayCircle size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={`Cancel schedule`}
                          onClick={() =>
                            void patchSchedule(schedule.id, {
                              status: "cancelled",
                            })
                          }
                        >
                          <XCircle size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-action delete-action"
                          aria-label={`Delete schedule`}
                          onClick={() => void remove(schedule.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="budget-item-body">
                      <span>
                        Started {schedule.startDate}
                        {schedule.endDate ? ` · Ends ${schedule.endDate}` : ""}
                      </span>
                    </div>
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
