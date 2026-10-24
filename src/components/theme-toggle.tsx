"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { resolveThemePreference, type Theme } from "@/lib/theme-preferences";

const subscribers = new Set<() => void>();

function preferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return resolveThemePreference(
      window.localStorage.getItem("nivora-theme"),
      "dark",
    );
  } catch {
    return "dark";
  }
}

let currentTheme: Theme = preferredTheme();
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = currentTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", currentTheme === "dark" ? "#070709" : "#f7f7f4");
}

function applyTheme(theme: Theme, persist = false) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#070709" : "#f7f7f4");
  if (persist) {
    try {
      window.localStorage.setItem("nivora-theme", theme);
    } catch {
      // The selected theme still applies for this session if storage is blocked.
    }
  }
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === "nivora-theme" || event.key === null) {
      applyTheme(preferredTheme());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark", true)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Use light theme" : "Use dark theme"}
    >
      {isDark ? (
        <Sun size={17} aria-hidden="true" />
      ) : (
        <Moon size={17} aria-hidden="true" />
      )}
    </button>
  );
}
