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
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) =>
      meta.setAttribute(
        "content",
        currentTheme === "dark" ? "#070709" : "#f7f7f4",
      ),
    );
  document.documentElement.style.colorScheme = currentTheme;
}

function applyTheme(theme: Theme, persist = false) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) =>
      meta.setAttribute("content", theme === "dark" ? "#070709" : "#f7f7f4"),
    );
  if (persist) {
    try {
      window.localStorage.setItem("nivora-theme", theme);
    } catch {
      // The selected theme still applies for this session if storage is blocked.
    }
  }
  subscribers.forEach((subscriber) => subscriber());
}

/** Shared so the ⌘K command palette can switch themes too. */
export function toggleTheme(origin?: { x: number; y: number }) {
  const next = currentTheme === "dark" ? "light" : "dark";
  const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  const startTransition = document as Document & {
    startViewTransition?: (callback: () => void) => { ready: Promise<void> };
  };
  if (!motionAllowed || !startTransition.startViewTransition) {
    applyTheme(next, true);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  document.documentElement.style.setProperty("--theme-reveal-x", `${x}px`);
  document.documentElement.style.setProperty("--theme-reveal-y", `${y}px`);
  const transition = startTransition.startViewTransition(() =>
    applyTheme(next, true),
  );
  void transition.ready
    .then(() => {
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          {
            clipPath: `circle(${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px at ${x}px ${y}px)`,
          },
        ],
        {
          duration: 520,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
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

export function useThemePreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ThemeToggle() {
  const theme = useThemePreference();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Use light theme" : "Use dark theme"}
    >
      {/* Keyed by theme so the swap replays the nv-icon-in spin (motion §6). */}
      <span key={theme} className="nv-theme-icon" aria-hidden="true">
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </span>
    </button>
  );
}
