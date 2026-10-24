import assert from "node:assert/strict";
import test from "node:test";
import { createMigrationCredentials } from "./migration-connection";

test("migration credentials require TLS and verify the supplied CA", () => {
  const ca =
    "-----BEGIN CERTIFICATE-----\nlocal-test-cert\n-----END CERTIFICATE-----";
  const credentials = createMigrationCredentials(
    "postgresql://finance-user:secret%40value@db.example.test:5432/finance",
    ca,
  );

  assert.deepEqual(credentials, {
    host: "db.example.test",
    port: 5432,
    user: "finance-user",
    password: "secret@value",
    database: "finance",
    ssl: { ca, rejectUnauthorized: true },
  });
});

test("migration credentials require TLS with system certificate verification when no CA is supplied", () => {
  const credentials = createMigrationCredentials(
    "postgres://finance-user:pass@db.example.test/finance",
  );

  assert.deepEqual(credentials.ssl, { rejectUnauthorized: true });
  assert.equal(credentials.port, 5432);
});

test("migration credentials reject non-PostgreSQL URLs", () => {
  assert.throws(
    () => createMigrationCredentials("https://db.example.test/finance"),
    /PostgreSQL/,
  );
});
