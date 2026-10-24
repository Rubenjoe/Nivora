"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Archive,
  CheckCircle2,
  LoaderCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { formatMoney as formatCurrency } from "@/lib/finance/money-format";

type Goal = {
  goal: {
    id: string;
    name: string;
    description: string | null;
    targetAmount: string;
    targetDate: string | null;
    status: "active" | "paused" | "completed" | "archived";
  };
  saved: string;
  remaining: string;
  percent: number;
  complete: boolean;
};

type Contribution = {
  id: string;
  goalId: string;
  amount: string;
  contributedOn: string;
  note: string | null;
};

const initialDraft = () => ({
  name: "",
  description: "",
  targetAmount: "",
  targetDate: "",
});

export function GoalsWorkspace() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [draft, setDraft] = useState(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(
    null,
  );
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributedOn, setContributedOn] = useState(todayISO());
  const [contributionNote, setContributionNote] = useState("");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function todayISO() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/goals", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Unable to load savings goals.");
    return {
      goals: result.goals as Goal[],
      currency: (result.currency ?? "INR") as string,
    };
  }, []);

  const applyLoaded = useCallback(
    (result: Awaited<ReturnType<typeof load>>) => {
      setGoals(result.goals);
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
          cause instanceof Error ? cause.message : "Unable to load goals.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, applyLoaded]);

  async function loadGoalDetail(goalId: string): Promise<Contribution[]> {
    try {
      const response = await fetch(`/api/v1/goals/${goalId}`, {
        cache: "no-store",
      });
      if (!response.ok) return [];
      const result = await response.json();
      return (result.contributions ?? []) as Contribution[];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    let active = true;
    if (!contributionGoalId) {
      Promise.resolve([] as Contribution[]).then((rows) => {
        if (active) setContributions(rows);
      });
      return () => {
        active = false;
      };
    }
    loadGoalDetail(contributionGoalId).then((rows) => {
      if (active) setContributions(rows);
    });
    return () => {
      active = false;
    };
  }, [contributionGoalId, goals]);

  const formatAmount = (amount: string) => formatCurrency(amount, currency);

  const visible = showArchived
    ? goals
    : goals.filter((item) => item.goal.status !== "archived");

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        targetAmount: draft.targetAmount,
        targetDate: draft.targetDate || null,
      };
      const response = await fetch(
        editingId ? `/api/v1/goals/${editingId}` : "/api/v1/goals",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save this goal.");
      setNotice(editingId ? "Goal updated." : "Goal created.");
      setEditingId(null);
      setDraft(initialDraft());
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this goal.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchGoal(id: string, changes: Record<string, unknown>) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not update this goal.");
      setNotice("Goal updated.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update this goal.",
      );
    }
  }

  async function removeGoal(id: string) {
    if (
      !window.confirm(
        "Delete this goal and its contribution history? This cannot be undone.",
      )
    )
      return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/goals/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not delete this goal.");
      setNotice("Goal deleted.");
      if (contributionGoalId === id) setContributionGoalId(null);
      if (editingId === id) {
        setEditingId(null);
        setDraft(initialDraft());
      }
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete this goal.",
      );
    }
  }

  async function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contributionGoalId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/goals/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: contributionGoalId,
          amount: contributionAmount,
          contributedOn,
          note: contributionNote.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not record this contribution.");
      setNotice("Contribution recorded.");
      setContributionAmount("");
      setContributionNote("");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not record this contribution.",
      );
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(item: Goal) {
    setEditingId(item.goal.id);
    setDraft({
      name: item.goal.name,
      description: item.goal.description ?? "",
      targetAmount: item.goal.targetAmount,
      targetDate: item.goal.targetDate ?? "",
    });
    setNotice(null);
    setError(null);
  }

  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">SAVE WITH INTENT</p>
        <h1>Savings goals</h1>
        <p>
          Track progress toward a target. Goals don&apos;t move money — they
          keep your intention visible.
        </p>
      </div>

      <div className="feature-grid">
        <section
          className="feature-form-card"
          aria-labelledby="goal-form-title"
        >
          <div className="feature-card-heading">
            <div className="entry-mark">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="goal-form-title">
                {editingId ? "Edit goal" : "Create a goal"}
              </h2>
              <p>A target is a plan, not a bank balance.</p>
            </div>
          </div>
          <form className="feature-form" onSubmit={saveGoal}>
            <label htmlFor="goal-name">Goal name</label>
            <input
              id="goal-name"
              required
              maxLength={100}
              value={draft.name}
              placeholder="e.g. Emergency fund"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            <label htmlFor="goal-description">
              Description <span>· optional</span>
            </label>
            <textarea
              id="goal-description"
              rows={2}
              maxLength={500}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
            <label htmlFor="goal-target">Target amount ({currency})</label>
            <input
              id="goal-target"
              required
              inputMode="decimal"
              placeholder="0.00"
              value={draft.targetAmount}
              onChange={(event) =>
                setDraft({ ...draft, targetAmount: event.target.value })
              }
            />
            <label htmlFor="goal-date">
              Target date <span>· optional</span>
            </label>
            <input
              id="goal-date"
              type="date"
              value={draft.targetDate}
              onChange={(event) =>
                setDraft({ ...draft, targetDate: event.target.value })
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
                {busy ? "Saving…" : editingId ? "Save changes" : "Create goal"}
              </button>
            </div>
          </form>
        </section>

        <section
          className="feature-list-card"
          aria-labelledby="goal-list-title"
        >
          <div className="history-heading">
            <div>
              <h2 id="goal-list-title">Your goals</h2>
              <p>Progress comes only from recorded contributions.</p>
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
              Loading goals…
            </p>
          ) : error && !goals.length ? (
            <p className="history-empty" role="status">
              {error}
            </p>
          ) : !visible.length ? (
            <div className="history-empty">
              <span className="empty-ledger" aria-hidden="true">
                —
              </span>
              <h3>No goals yet</h3>
              <p>Name a target and start contributing toward it.</p>
            </div>
          ) : (
            <ul className="budget-list">
              {visible.map((item) => {
                const selected =
                  contributionGoalId === item.goal.id ? " selected" : "";
                return (
                  <li
                    key={item.goal.id}
                    className={`budget-item goal-item${selected}`}
                  >
                    <div className="budget-item-head">
                      <div>
                        <strong>{item.goal.name}</strong>
                        <span>
                          {item.goal.targetDate
                            ? `By ${new Intl.DateTimeFormat("en", {
                                dateStyle: "medium",
                              }).format(
                                new Date(`${item.goal.targetDate}T12:00:00`),
                              )}`
                            : "No target date"}
                          {item.goal.status !== "active"
                            ? ` · ${item.goal.status}`
                            : ""}
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={`Edit ${item.goal.name}`}
                          onClick={() => beginEdit(item)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        {item.goal.status === "active" ? (
                          <button
                            type="button"
                            className="icon-action"
                            aria-label={`Pause ${item.goal.name}`}
                            onClick={() =>
                              void patchGoal(item.goal.id, { status: "paused" })
                            }
                          >
                            <PauseCircle size={16} aria-hidden="true" />
                          </button>
                        ) : item.goal.status === "paused" ? (
                          <button
                            type="button"
                            className="icon-action"
                            aria-label={`Resume ${item.goal.name}`}
                            onClick={() =>
                              void patchGoal(item.goal.id, { status: "active" })
                            }
                          >
                            <PlayCircle size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                        {item.goal.status !== "completed" && (
                          <button
                            type="button"
                            className="icon-action"
                            aria-label={`Mark ${item.goal.name} complete`}
                            onClick={() =>
                              void patchGoal(item.goal.id, {
                                status: "completed",
                              })
                            }
                          >
                            <CheckCircle2 size={16} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={`Archive ${item.goal.name}`}
                          onClick={() =>
                            void patchGoal(item.goal.id, { status: "archived" })
                          }
                        >
                          <Archive size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-action delete-action"
                          aria-label={`Delete ${item.goal.name}`}
                          onClick={() => void removeGoal(item.goal.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="budget-item-body">
                      <span>
                        {formatAmount(item.saved)} saved of{" "}
                        {formatAmount(item.goal.targetAmount)}
                      </span>
                      <span
                        className={`budget-percent ${item.complete ? "ok" : ""}`}
                      >
                        {item.percent}%
                      </span>
                    </div>
                    <div
                      className={`budget-progress ${item.complete ? "ok" : ""}`}
                      role="progressbar"
                      aria-valuenow={Math.round(item.percent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.goal.name} goal progress`}
                    >
                      <span
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                    {item.goal.status !== "archived" && (
                      <button
                        type="button"
                        className="secondary-action small contribute-toggle"
                        onClick={() =>
                          setContributionGoalId((current) =>
                            current === item.goal.id ? null : item.goal.id,
                          )
                        }
                      >
                        {contributionGoalId === item.goal.id
                          ? "Hide contributions"
                          : "Record contribution"}
                      </button>
                    )}
                    {contributionGoalId === item.goal.id && (
                      <div className="contribution-panel">
                        <form
                          className="contribution-form"
                          onSubmit={addContribution}
                        >
                          <label htmlFor="contribution-amount">
                            Amount ({currency})
                          </label>
                          <input
                            id="contribution-amount"
                            required
                            inputMode="decimal"
                            placeholder="0.00"
                            value={contributionAmount}
                            onChange={(event) =>
                              setContributionAmount(event.target.value)
                            }
                          />
                          <label htmlFor="contribution-date">Date</label>
                          <input
                            id="contribution-date"
                            type="date"
                            required
                            value={contributedOn}
                            onChange={(event) =>
                              setContributedOn(event.target.value)
                            }
                          />
                          <label htmlFor="contribution-note">
                            Note <span>· optional</span>
                          </label>
                          <input
                            id="contribution-note"
                            maxLength={280}
                            value={contributionNote}
                            onChange={(event) =>
                              setContributionNote(event.target.value)
                            }
                          />
                          <button
                            type="submit"
                            className="primary-action"
                            disabled={busy}
                          >
                            {busy && (
                              <LoaderCircle
                                className="spin"
                                size={16}
                                aria-hidden="true"
                              />
                            )}
                            Add contribution
                          </button>
                        </form>
                        {contributions.length ? (
                          <ul className="contribution-list">
                            {contributions.map((contribution) => (
                              <li key={contribution.id}>
                                <span>
                                  {new Intl.DateTimeFormat("en", {
                                    dateStyle: "medium",
                                  }).format(
                                    new Date(
                                      `${contribution.contributedOn}T12:00:00`,
                                    ),
                                  )}
                                  {contribution.note
                                    ? ` · ${contribution.note}`
                                    : ""}
                                </span>
                                <strong>
                                  {formatAmount(contribution.amount)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="history-empty">
                            No contributions recorded yet.
                          </p>
                        )}
                      </div>
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
