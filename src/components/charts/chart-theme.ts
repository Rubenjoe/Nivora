"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useThemePreference } from "@/components/theme-toggle";

export type ChartPalette = {
  theme: "dark" | "light";
  income: string;
  expense: string;
  compare: string;
  violet: string;
  gold: string;
  text: string;
  muted: string;
  grid: string;
  border: string;
  surface: string;
  card: string;
  series: string[];
};

const SERIES_TOKENS = [
  "--chart-cat-1",
  "--chart-cat-2",
  "--chart-cat-3",
  "--chart-cat-4",
  "--chart-cat-5",
  "--chart-cat-6",
] as const;

const FALLBACK_SERIES = [
  "#a995ff",
  "#88b9ec",
  "#7ed7b2",
  "#d6b779",
  "#f18782",
  "#7fc8c8",
];

function readToken(
  style: CSSStyleDeclaration,
  token: string,
  fallback: string,
) {
  const value = style.getPropertyValue(token).trim();
  return value || fallback;
}

function subscribeToHydration() {
  return () => {};
}

function getHydrated() {
  return true;
}

function getServerHydrated() {
  return false;
}

/**
 * CSS tokens are only available after hydration. useSyncExternalStore gives
 * the server and the hydration pass one stable answer, then switches to the
 * live palette without a cascading setState inside an effect.
 */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    getHydrated,
    getServerHydrated,
  );
}

export function useChartPalette(): ChartPalette | null {
  const theme = useThemePreference();
  const hydrated = useHydrated();

  return useMemo(() => {
    if (!hydrated || typeof document === "undefined") return null;
    const style = getComputedStyle(document.documentElement);
    return {
      theme,
      income: readToken(style, "--color-chart-income", "#7ed7b2"),
      expense: readToken(style, "--color-chart-expense", "#f18782"),
      compare: readToken(style, "--color-chart-compare", "#88b9ec"),
      violet: readToken(style, "--color-primary", "#a995ff"),
      gold: readToken(style, "--color-gold", "#d6b779"),
      text: readToken(style, "--color-text", "#f4f1ec"),
      muted: readToken(style, "--color-chart-axis", "#9a9fab"),
      grid: readToken(style, "--color-chart-grid", "rgba(244,241,236,0.07)"),
      border: readToken(style, "--color-border", "#2b3039"),
      surface: readToken(style, "--color-elevated", "#22262e"),
      card: readToken(style, "--color-card", "#191d23"),
      series: SERIES_TOKENS.map((token, index) =>
        readToken(style, token, FALLBACK_SERIES[index] ?? "#a995ff"),
      ),
    };
  }, [hydrated, theme]);
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotion() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    getReducedMotion,
    getServerReducedMotion,
  );
}

const COMPACT_CHART_QUERY = "(max-width: 720px)";

function subscribeToCompactChart(callback: () => void) {
  const query = window.matchMedia(COMPACT_CHART_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getCompactChart() {
  return window.matchMedia(COMPACT_CHART_QUERY).matches;
}

function getServerCompactChart() {
  return false;
}

/**
 * Matches the advanced-analytics responsive breakpoint in studio.css. Used for
 * SVG text that cannot be resized with CSS without breaking ECharts wrapping.
 */
export function useCompactChartViewport(): boolean {
  return useSyncExternalStore(
    subscribeToCompactChart,
    getCompactChart,
    getServerCompactChart,
  );
}

export function escapeMarkup(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Compact ISO bucket labels used by axes and tooltips. */
export function formatBucketLabel(label: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (day) {
    return `${MONTHS[Number(day[2]) - 1] ?? day[2]} ${Number(day[3])}`;
  }
  const month = /^(\d{4})-(\d{2})$/.exec(label);
  if (month) {
    return `${MONTHS[Number(month[2]) - 1] ?? month[2]} ${month[1]}`;
  }
  return label;
}

export function compactMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
