const DEFAULT_RETURN_TO = "/";

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const parsed = new URL(value, "https://nivora.invalid");
    if (parsed.origin !== "https://nivora.invalid") return DEFAULT_RETURN_TO;
    if (["/sign-in", "/sign-up", "/auth/confirm"].includes(parsed.pathname)) {
      return DEFAULT_RETURN_TO;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}
