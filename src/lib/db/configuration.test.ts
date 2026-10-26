import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DatabaseConfigurationError,
  resolveCaCertificate,
} from "./configuration";

const validPem =
  "-----BEGIN CERTIFICATE-----\nYWJjZA==\n-----END CERTIFICATE-----";

function preserveCaEnvironment(t: test.TestContext) {
  const originalCertificate = process.env.DATABASE_SSL_CA;
  const originalPath = process.env.DATABASE_SSL_CA_PATH;
  t.after(() => {
    if (originalCertificate === undefined) delete process.env.DATABASE_SSL_CA;
    else process.env.DATABASE_SSL_CA = originalCertificate;
    if (originalPath === undefined) delete process.env.DATABASE_SSL_CA_PATH;
    else process.env.DATABASE_SSL_CA_PATH = originalPath;
  });
}

test("accepts complete PEM certificate contents", (t) => {
  preserveCaEnvironment(t);
  process.env.DATABASE_SSL_CA = validPem;
  delete process.env.DATABASE_SSL_CA_PATH;
  assert.equal(resolveCaCertificate(), validPem);
});

test("rejects missing certificate configuration with a safe configuration error", (t) => {
  preserveCaEnvironment(t);
  delete process.env.DATABASE_SSL_CA;
  delete process.env.DATABASE_SSL_CA_PATH;
  assert.throws(
    () => resolveCaCertificate(),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.issue === "missing_ca_file" &&
      !error.message.includes("DATABASE_URL"),
  );
});

test("rejects non-PEM inline certificate contents", (t) => {
  preserveCaEnvironment(t);
  process.env.DATABASE_SSL_CA = "not a certificate";
  delete process.env.DATABASE_SSL_CA_PATH;
  assert.throws(
    () => resolveCaCertificate(),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.issue === "invalid_ca_certificate",
  );
});

test("rejects an empty inline certificate even when a file path is set", (t) => {
  preserveCaEnvironment(t);
  process.env.DATABASE_SSL_CA = "  ";
  process.env.DATABASE_SSL_CA_PATH = path.join(
    tmpdir(),
    "nivora-unused-ca-test.pem",
  );
  assert.throws(
    () => resolveCaCertificate(),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.issue === "invalid_ca_certificate",
  );
});

test("rejects an unavailable certificate file", (t) => {
  preserveCaEnvironment(t);
  delete process.env.DATABASE_SSL_CA;
  process.env.DATABASE_SSL_CA_PATH = path.join(
    tmpdir(),
    "nivora-missing-ca-test.pem",
  );
  assert.throws(
    () => resolveCaCertificate(),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.issue === "missing_ca_file",
  );
});

test("inline PEM takes precedence over a stale file path", (t) => {
  preserveCaEnvironment(t);
  process.env.DATABASE_SSL_CA = validPem;
  process.env.DATABASE_SSL_CA_PATH = path.join(
    tmpdir(),
    "nivora-stale-ca-test.pem",
  );
  assert.equal(resolveCaCertificate(), validPem);
});

test("reads and validates a local CA file", (t) => {
  preserveCaEnvironment(t);
  const directory = mkdtempSync(path.join(tmpdir(), "nivora-ca-test-"));
  const certificatePath = path.join(directory, "ca.pem");
  writeFileSync(certificatePath, validPem);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  delete process.env.DATABASE_SSL_CA;
  process.env.DATABASE_SSL_CA_PATH = certificatePath;
  assert.equal(resolveCaCertificate(), readFileSync(certificatePath, "utf8"));
});
