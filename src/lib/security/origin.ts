function parseOrigin(value: string | null | undefined, hostnameOnly = false) {
  if (!value) return null;
  const candidate =
    hostnameOnly && !value.includes("://") ? `https://${value}` : value;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function hasTrustedOrigin(request: Request) {
  const origin = parseOrigin(request.headers.get("origin"));
  if (!origin) return false;

  const trustedOrigins = [
    parseOrigin(process.env.APP_URL),
    parseOrigin(process.env.VERCEL_URL, true),
    parseOrigin(process.env.VERCEL_BRANCH_URL, true),
    parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL, true),
    // This active project alias is not included in Vercel's system URL variables.
    parseOrigin("https://nivora-ruben-6e63.vercel.app"),
  ];

  return trustedOrigins.includes(origin);
}
