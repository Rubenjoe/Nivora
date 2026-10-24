"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, LogOut } from "lucide-react";

type Profile = {
  displayName: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  mode: "simple" | "pro";
  appearance: string;
  budgetAlertsEnabled: boolean;
  goalAlertsEnabled: boolean;
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function SettingsWorkspace({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    const timer = window.setTimeout(() => setSavedAt(null), 2500);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName.trim(),
          currency: profile.currency,
          timezone: profile.timezone,
          dateFormat: profile.dateFormat,
          mode: profile.mode,
          appearance: profile.appearance,
          budgetAlertsEnabled: profile.budgetAlertsEnabled,
          goalAlertsEnabled: profile.goalAlertsEnabled,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save settings.");
      setProfile(result.profile);
      setNotice("Settings saved.");
      setSavedAt(new Date().toISOString());
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save settings.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/export/transactions");
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "nivora-transactions.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="feature-workspace">
      <div className="feature-intro">
        <p className="eyebrow">YOUR PREFERENCES</p>
        <h1>Settings</h1>
        <p>Preferences persist to your profile and apply across Nivora.</p>
      </div>

      <form className="settings-form" onSubmit={save}>
        <section className="feature-form-card settings-card">
          <h2>Profile</h2>
          <label htmlFor="settings-name">Display name</label>
          <input
            id="settings-name"
            required
            maxLength={100}
            value={profile.displayName}
            onChange={(event) =>
              setProfile({ ...profile, displayName: event.target.value })
            }
          />
          <label htmlFor="settings-currency">Preferred currency</label>
          <select
            id="settings-currency"
            value={profile.currency}
            onChange={(event) =>
              setProfile({ ...profile, currency: event.target.value })
            }
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <label htmlFor="settings-timezone">Timezone</label>
          <select
            id="settings-timezone"
            value={profile.timezone}
            onChange={(event) =>
              setProfile({ ...profile, timezone: event.target.value })
            }
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <label htmlFor="settings-date-format">Date format</label>
          <select
            id="settings-date-format"
            value={profile.dateFormat}
            onChange={(event) =>
              setProfile({ ...profile, dateFormat: event.target.value })
            }
          >
            <option value="en-IN">DD MMM YYYY (en-IN)</option>
            <option value="en-GB">DD MMM YYYY (en-GB)</option>
            <option value="en-US">MMM DD, YYYY (en-US)</option>
          </select>
        </section>

        <section className="feature-form-card settings-card">
          <h2>Experience</h2>
          <div
            className="settings-mode-row"
            role="radiogroup"
            aria-label="Interface mode"
          >
            {(["simple", "pro"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={profile.mode === mode}
                className={`mode-choice ${profile.mode === mode ? "selected" : ""}`}
                onClick={() => setProfile({ ...profile, mode })}
              >
                <strong>
                  {mode === "simple" ? "Simple Mode" : "Pro Mode"}
                </strong>
                <span>
                  {mode === "simple"
                    ? "Essential metrics, quick entry, calm pacing."
                    : "Advanced filters, comparisons, and deeper analysis."}
                </span>
              </button>
            ))}
          </div>
          <label htmlFor="settings-appearance">Appearance</label>
          <select
            id="settings-appearance"
            value={profile.appearance}
            onChange={(event) =>
              setProfile({ ...profile, appearance: event.target.value })
            }
          >
            <option value="system">Follow system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <h3 className="settings-subheading">Notifications</h3>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={profile.budgetAlertsEnabled}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  budgetAlertsEnabled: event.target.checked,
                })
              }
            />
            Show in-app budget threshold alerts
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={profile.goalAlertsEnabled}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  goalAlertsEnabled: event.target.checked,
                })
              }
            />
            Show in-app savings goal signals
          </label>
        </section>

        {error && (
          <p className="transaction-message error standalone" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p
            className="transaction-message success standalone"
            role="status"
            aria-live="polite"
          >
            {notice}
          </p>
        )}

        <div className="settings-actions">
          <button type="submit" className="primary-action" disabled={busy}>
            {busy && (
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
            )}
            {busy ? "Saving…" : "Save settings"}
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => void exportData()}
            disabled={exporting}
          >
            <Download size={15} aria-hidden="true" />
            {exporting ? "Exporting…" : "Export my transactions (CSV)"}
          </button>
          <button
            type="button"
            className="secondary-action danger"
            onClick={() => void signOut()}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}
