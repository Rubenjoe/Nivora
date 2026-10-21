import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDatabaseEnvironment } from "@/lib/env";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDatabase() {
  const { runtimeUrl } = getDatabaseEnvironment();
  if (!pool) {
    pool = new Pool({
      connectionString: runtimeUrl,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  }
  return drizzle(pool, { schema });
}
