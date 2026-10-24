import fs from "node:fs";
import path from "node:path";

const envPath = ".env.local";
if (!fs.existsSync(envPath)) {
  console.log("missing .env.local");
  process.exit(0);
}
const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
for (const line of lines) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  if (
    k === "DATABASE_URL" ||
    k === "DIRECT_URL" ||
    k === "DATABASE_SSL_CA_PATH" ||
    k.startsWith("NEXT_PUBLIC_")
  ) {
    let status = "set";
    if (k === "DATABASE_URL" || k === "DIRECT_URL") {
      try {
        const u = new URL(v);
        status =
          u.protocol === "postgres:" || u.protocol === "postgresql:"
            ? "valid-postgres-url"
            : "invalid-protocol";
        if (v.includes("placeholder") || v.includes("YOUR_"))
          status = "placeholder";
      } catch {
        status = "invalid-url";
      }
    } else if (k === "DATABASE_SSL_CA_PATH") {
      const resolved = path.resolve(process.cwd(), v);
      status = fs.existsSync(resolved) ? "file-exists" : "file-missing";
    }
    console.log(`${k}: ${status}`);
  }
}
