import assert from "node:assert/strict";
import test from "node:test";
import {
  DatabaseConfigurationError,
  userFacingStorageMessage,
} from "../db/configuration";
import { storageFailureMessage } from "./api-errors";

test("database configuration errors carry a user-facing, actionable message", () => {
  for (const issue of [
    "missing_runtime_url",
    "invalid_runtime_url",
    "missing_ca_file",
    "invalid_direct_url",
  ] as const) {
    const error = new DatabaseConfigurationError(issue, "detail");
    assert.ok(userFacingStorageMessage(error.issue).length > 20);
  }
});

test("storage failure messages classify DNS, timeout, and TLS causes", () => {
  assert.match(
    storageFailureMessage("getaddrinfo ENOTFOUND db.x.supabase.co"),
    /pooler host/,
  );
  assert.match(
    storageFailureMessage("connect ETIMEDOUT 1.2.3.4:5432"),
    /timed out/,
  );
  assert.match(
    storageFailureMessage("unable to verify the first certificate"),
    /TLS certificate/,
  );
  assert.match(
    storageFailureMessage("something else entirely"),
    /not available right now/,
  );
});
