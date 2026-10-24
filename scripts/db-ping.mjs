import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const runtimeUrl = process.env.DATABASE_URL;
const sslCaPath = process.env.DATABASE_SSL_CA_PATH;
if (!runtimeUrl) {
  console.log("DATABASE_URL missing");
  process.exit(1);
}
const ssl = { rejectUnauthorized: true };
if (sslCaPath) {
  const resolved = path.resolve(sslCaPath);
  if (!fs.existsSync(resolved)) {
    console.log("CA file missing at resolved path");
    process.exit(2);
  }
  ssl.ca = fs.readFileSync(resolved, "utf8");
}
const pool = new pg.Pool({
  connectionString: runtimeUrl,
  ssl,
  connectionTimeoutMillis: 8000,
});
try {
  const client = await pool.connect();
  await client.query("select 1 as ok");
  client.release();
  console.log("connection: ok");
} catch (cause) {
  const code =
    cause && typeof cause === "object" && "code" in cause &&
    typeof cause.code === "string"
      ? cause.code
      : "unknown";
  console.log(`connection: failed (${code})`);
  process.exit(3);
} finally {
  await pool.end();
}
