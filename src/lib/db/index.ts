import "server-only";
import fs from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  resolveCaCertificatePath,
  validateDatabaseConfiguration,
} from "@/lib/db/configuration";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDatabase() {
  validateDatabaseConfiguration();
  const runtimeUrl = process.env.DATABASE_URL!.trim();
  if (!pool) {
    const sslConfig: { ca?: string; rejectUnauthorized: boolean } = {
      rejectUnauthorized: true,
    };
    const resolvedCaPath = resolveCaCertificatePath();
    if (resolvedCaPath) {
      sslConfig.ca = fs.readFileSync(resolvedCaPath, "utf8");
    }
    pool = new Pool({
      connectionString: runtimeUrl,
      max: 5,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig,
    });
  }
  return drizzle(pool, { schema });
}
