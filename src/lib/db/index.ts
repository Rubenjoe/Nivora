import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  resolveCaCertificate,
  validateDatabaseConfiguration,
} from "@/lib/db/configuration";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDatabase() {
  validateDatabaseConfiguration();
  const runtimeUrl = process.env.DATABASE_URL!.trim();
  if (!pool) {
    const caCertificate = resolveCaCertificate();
    const sslConfig: { ca?: string; rejectUnauthorized: boolean } = {
      ...(caCertificate ? { ca: caCertificate } : {}),
      rejectUnauthorized: true,
    };
    pool = new Pool({
      connectionString: runtimeUrl,
      max: 5,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig,
    });
  }
  return drizzle(pool, { schema });
}
