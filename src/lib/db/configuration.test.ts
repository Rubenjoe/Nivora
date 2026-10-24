import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveCaCertificate } from "./configuration";

test("inline deployment CA certificate takes precedence over a file path", (t) => {
  const originalCertificate = process.env.DATABASE_SSL_CA_CERT;
  const originalPath = process.env.DATABASE_SSL_CA_PATH;
  t.after(() => {
    if (originalCertificate === undefined)
      delete process.env.DATABASE_SSL_CA_CERT;
    else process.env.DATABASE_SSL_CA_CERT = originalCertificate;
    if (originalPath === undefined) delete process.env.DATABASE_SSL_CA_PATH;
    else process.env.DATABASE_SSL_CA_PATH = originalPath;
  });

  process.env.DATABASE_SSL_CA_CERT = "  PEM certificate  ";
  process.env.DATABASE_SSL_CA_PATH = "missing-local-certificate.pem";

  assert.equal(resolveCaCertificate(), "PEM certificate");
});

test("CA file path remains supported for local development", (t) => {
  const originalCertificate = process.env.DATABASE_SSL_CA_CERT;
  const originalPath = process.env.DATABASE_SSL_CA_PATH;
  const directory = mkdtempSync(path.join(tmpdir(), "nivora-ca-test-"));
  const certificatePath = path.join(directory, "ca.pem");
  const certificate = "local CA fixture";
  writeFileSync(certificatePath, certificate);
  t.after(() => {
    if (originalCertificate === undefined)
      delete process.env.DATABASE_SSL_CA_CERT;
    else process.env.DATABASE_SSL_CA_CERT = originalCertificate;
    if (originalPath === undefined) delete process.env.DATABASE_SSL_CA_PATH;
    else process.env.DATABASE_SSL_CA_PATH = originalPath;
    rmSync(directory, { recursive: true, force: true });
  });

  delete process.env.DATABASE_SSL_CA_CERT;
  process.env.DATABASE_SSL_CA_PATH = certificatePath;

  assert.equal(resolveCaCertificate(), readFileSync(certificatePath, "utf8"));
});
