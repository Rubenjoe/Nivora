"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

const CONFIRM_WORD = "DELETE";

/** Typed-confirmation flow for permanently deleting the account and data. */
export function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { authUserRemoved: boolean }>(null);

  const confirmed = typed.trim() === CONFIRM_WORD;

  async function deleteAccount() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Could not delete your account.");
      setDone({ authUserRemoved: result.authUserRemoved === true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete your account.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="danger-zone" aria-live="polite">
        <h2>Your data has been deleted</h2>
        <p>
          {done.authUserRemoved
            ? "Your account and everything in it were permanently removed."
            : "All of your financial data was permanently removed and you were signed out. Your sign-in itself was not removed because account removal is not enabled on this server."}
        </p>
        <div className="danger-zone-row">
          <button
            type="button"
            className="secondary-action"
            onClick={() => router.push("/")}
          >
            Continue
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="danger-zone" aria-labelledby="danger-zone-title">
      <h2 id="danger-zone-title">Delete account</h2>
      <p>
        This permanently deletes your transactions, budgets, goals, recurring
        schedules and settings. It cannot be undone. Download your data first if
        you want to keep a copy.
      </p>

      {!open ? (
        <div className="danger-zone-row">
          <button
            type="button"
            className="secondary-action danger"
            onClick={() => setOpen(true)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete my account…
          </button>
        </div>
      ) : (
        <div className="danger-zone-confirm">
          <label htmlFor="delete-confirm">
            Type <strong>{CONFIRM_WORD}</strong> to confirm
          </label>
          <input
            id="delete-confirm"
            className="premium-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="danger-zone-row">
            <button
              type="button"
              className="secondary-action danger-solid"
              disabled={!confirmed || busy}
              onClick={() => void deleteAccount()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} aria-hidden="true" />
              ) : (
                <Trash2 size={15} aria-hidden="true" />
              )}
              {busy ? "Deleting…" : "Permanently delete everything"}
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
