import { defineConfig } from "drizzle-kit";
import { resolveCaCertificate } from "./src/lib/db/configuration";
import { createMigrationCredentials } from "./src/lib/db/migration-connection";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: process.env.DIRECT_URL
    ? createMigrationCredentials(process.env.DIRECT_URL, resolveCaCertificate())
    : undefined,
  strict: true,
  verbose: true,
});
