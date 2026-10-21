const nextEnv = process.env.NODE_ENV;

if (
  nextEnv !== "development" &&
  nextEnv !== "test" &&
  nextEnv !== "production"
) {
  throw new Error("NODE_ENV must be development, test, or production.");
}

/** Read server-only deployment settings without exposing secrets to the browser. */
export function getServerEnvironment() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is required.");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(appUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  return { appUrl: parsedUrl.origin };
}

export function getDatabaseEnvironment() {
  const runtimeUrl = process.env.DATABASE_URL;
  if (!runtimeUrl)
    throw new Error("DATABASE_URL is required for financial data.");
  const directUrl = process.env.DIRECT_URL;
  for (const [label, value] of [
    ["DATABASE_URL", runtimeUrl],
    ...(directUrl ? [["DIRECT_URL", directUrl]] : []),
  ] as const) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${label} must be a valid PostgreSQL URL.`);
    }
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new Error(`${label} must use the PostgreSQL protocol.`);
    }
    if (
      process.env.NODE_ENV === "production" &&
      parsed.searchParams.get("sslmode") !== "require"
    ) {
      throw new Error(`${label} must require TLS in production.`);
    }
  }
  return { runtimeUrl, directUrl };
}
