export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.APP_URL;
  if (!origin || !appUrl) return false;
  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
