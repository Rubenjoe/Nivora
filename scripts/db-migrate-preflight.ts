import { exit } from "node:process";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error(
    "DIRECT_URL is required to run migrations. Set it in .env.local before running db:migrate.",
  );
  exit(1);
}

let host: string;
try {
  host = new URL(directUrl).hostname;
} catch {
  console.error("DIRECT_URL is not a valid PostgreSQL connection URL.");
  exit(1);
}

// Supabase connection hosts embed the project reference, e.g. db.<ref>.supabase.co.
// Print only the reference — never the connection string or credentials.
const refMatch = host.match(/^(?:db\.)?([a-z0-9-]+)\.supabase\.co(?:m)?$/);
console.log(refMatch ? refMatch[1] : "supabase project ref not derivable from DIRECT_URL host");
