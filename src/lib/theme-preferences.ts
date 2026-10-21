export type Theme = "light" | "dark";

export function resolveThemePreference(
  storedTheme: string | null,
  systemTheme: Theme,
): Theme {
  return storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : systemTheme;
}
