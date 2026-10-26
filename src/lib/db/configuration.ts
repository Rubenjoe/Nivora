import fs from "node:fs";
import path from "node:path";

export type DatabaseConfigurationIssue =
  | "missing_runtime_url"
  | "invalid_runtime_url"
  | "missing_ca_file"
  | "invalid_ca_certificate"
  | "invalid_direct_url";

export class DatabaseConfigurationError extends Error {
  readonly issue: DatabaseConfigurationIssue;

  constructor(issue: DatabaseConfigurationIssue, message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
    this.issue = issue;
  }
}

export function resolveCaCertificatePath(): string | undefined {
  const configured = process.env.DATABASE_SSL_CA_PATH?.trim();
  if (!configured) return undefined;
  const candidates = [
    path.resolve(configured),
    path.resolve(process.cwd(), configured),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new DatabaseConfigurationError(
    "missing_ca_file",
    "DATABASE_SSL_CA_PATH is set but the CA certificate file could not be read. Download the Supabase database CA certificate, save it locally, and point DATABASE_SSL_CA_PATH to that file.",
  );
}

export function resolveCaCertificate(): string | undefined {
  const configuredCertificate = process.env.DATABASE_SSL_CA;
  if (configuredCertificate !== undefined)
    return validateCaCertificate(configuredCertificate);
  const certificatePath = resolveCaCertificatePath();
  if (!certificatePath) {
    throw new DatabaseConfigurationError(
      "missing_ca_file",
      "A Supabase CA certificate is required. Set DATABASE_SSL_CA or point DATABASE_SSL_CA_PATH to a readable PEM certificate file.",
    );
  }
  return validateCaCertificate(fs.readFileSync(certificatePath, "utf8"));
}

function validateCaCertificate(certificate: string): string {
  const normalized = certificate.trim();
  if (
    !normalized ||
    !/^-----BEGIN CERTIFICATE-----\s+[\s\S]+?\s+-----END CERTIFICATE-----$/.test(
      normalized,
    )
  ) {
    throw new DatabaseConfigurationError(
      "invalid_ca_certificate",
      "The configured Supabase CA certificate must contain a PEM BEGIN CERTIFICATE and END CERTIFICATE block.",
    );
  }
  return normalized;
}

export function validateDatabaseConfiguration() {
  const runtimeUrl = process.env.DATABASE_URL?.trim();
  if (!runtimeUrl) {
    throw new DatabaseConfigurationError(
      "missing_runtime_url",
      "DATABASE_URL is required for financial storage.",
    );
  }
  try {
    const parsed = new URL(runtimeUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new DatabaseConfigurationError(
        "invalid_runtime_url",
        "DATABASE_URL must use the PostgreSQL protocol.",
      );
    }
  } catch (cause) {
    if (cause instanceof DatabaseConfigurationError) throw cause;
    throw new DatabaseConfigurationError(
      "invalid_runtime_url",
      "DATABASE_URL must be a valid PostgreSQL connection URL.",
    );
  }
  const directUrl = process.env.DIRECT_URL?.trim();
  if (directUrl) {
    try {
      const parsed = new URL(directUrl);
      if (
        parsed.protocol !== "postgres:" &&
        parsed.protocol !== "postgresql:"
      ) {
        throw new DatabaseConfigurationError(
          "invalid_direct_url",
          "DIRECT_URL must use the PostgreSQL protocol.",
        );
      }
    } catch (cause) {
      if (cause instanceof DatabaseConfigurationError) throw cause;
      throw new DatabaseConfigurationError(
        "invalid_direct_url",
        "DIRECT_URL must be a valid PostgreSQL connection URL.",
      );
    }
  }
  resolveCaCertificate();
}

export function userFacingStorageMessage(issue: DatabaseConfigurationIssue) {
  switch (issue) {
    case "missing_runtime_url":
      return "Financial storage is not configured. Set DATABASE_URL in your local environment.";
    case "invalid_runtime_url":
      return "Financial storage is misconfigured. DATABASE_URL must be a valid PostgreSQL URL from your Supabase project.";
    case "missing_ca_file":
      return "Financial storage needs a TLS certificate. Set DATABASE_SSL_CA to the Supabase CA PEM contents, or DATABASE_SSL_CA_PATH to a readable PEM file.";
    case "invalid_ca_certificate":
      return "Financial storage has an invalid TLS certificate. Set DATABASE_SSL_CA to the complete Supabase CA PEM contents, or use a valid PEM file with DATABASE_SSL_CA_PATH.";
    case "invalid_direct_url":
      return "Migration settings are misconfigured. DIRECT_URL must be a valid PostgreSQL URL.";
  }
}
