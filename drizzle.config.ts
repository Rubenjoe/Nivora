import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: process.env.DIRECT_URL
    ? { url: process.env.DIRECT_URL }
    : undefined,
  strict: true,
  verbose: true,
});
