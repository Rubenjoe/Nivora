import { NextResponse } from "next/server";
import {
  DatabaseConfigurationError,
  userFacingStorageMessage,
} from "@/lib/db/configuration";

export function unauthorized() {
  return NextResponse.json(
    { error: "Sign in to access your financial data." },
    { status: 401 },
  );
}

export function serviceUnavailable(message?: string, code?: string) {
  return NextResponse.json(
    {
      error: message ?? "Financial storage is not configured or available.",
      code,
    },
    { status: 503 },
  );
}

export function handleFinanceRouteError(cause: unknown) {
  if (cause instanceof DatabaseConfigurationError) {
    console.error("[finance] database configuration:", cause.issue);
    return serviceUnavailable(
      userFacingStorageMessage(cause.issue),
      cause.issue,
    );
  }
  const detail =
    cause instanceof Error ? cause.message : String(cause ?? "unknown");
  console.error("[finance] storage error:", detail);
  return serviceUnavailable(
    storageFailureMessage(detail),
    "storage_unreachable",
  );
}

export function storageFailureMessage(detail: string) {
  const lowered = detail.toLowerCase();
  if (
    lowered.includes("enotfound") ||
    lowered.includes("eai_again") ||
    lowered.includes("getaddrinfo")
  ) {
    return "Financial storage could not be reached. The database host in DATABASE_URL did not resolve from this machine — Supabase direct hosts are often IPv6-only; use the pooler host (aws-0-<region>.pooler.supabase.com) from Dashboard → Connect, or connect from a network with IPv6.";
  }
  if (
    lowered.includes("etimedout") ||
    lowered.includes("timeout") ||
    lowered.includes("econnrefused")
  ) {
    return "Financial storage could not be reached. The database connection timed out or was refused — check DATABASE_URL and your network, then try again.";
  }
  if (
    lowered.includes("self signed") ||
    lowered.includes("certificate") ||
    lowered.includes("unable to verify")
  ) {
    return "Financial storage rejected the TLS certificate. Download the Supabase CA certificate and set DATABASE_SSL_CA_PATH in .env.local.";
  }
  return "Financial storage is not available right now. Check the local database configuration (see docs/SETUP.md) and try again.";
}
