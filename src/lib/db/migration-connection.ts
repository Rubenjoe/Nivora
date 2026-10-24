export type MigrationPostgresCredentials = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: { ca?: string; rejectUnauthorized: true };
};

export function createMigrationCredentials(
  connectionString: string,
  caCertificate?: string,
): MigrationPostgresCredentials {
  let parsed: URL;
  try {
    parsed = new URL(connectionString.trim());
  } catch {
    throw new Error("DIRECT_URL must be a valid PostgreSQL connection URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DIRECT_URL must use the PostgreSQL protocol.");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) {
    throw new Error("DIRECT_URL must include a database name.");
  }

  const ca = caCertificate?.trim();
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
  };
}
