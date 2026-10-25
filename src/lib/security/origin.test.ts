import assert from "node:assert/strict";
import test from "node:test";
import { hasTrustedOrigin } from "./origin";

test("accepts the Vercel project production origin alongside APP_URL", () => {
  const previousAppUrl = process.env.APP_URL;
  const previousProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  try {
    process.env.APP_URL = "https://nivora-git-main-ruben-6e63.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "nivora-iota.vercel.app";

    const request = new Request(
      "https://nivora-iota.vercel.app/api/v1/auth/login",
      {
        headers: { origin: "https://nivora-iota.vercel.app" },
      },
    );

    assert.equal(hasTrustedOrigin(request), true);
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousProductionUrl === undefined)
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = previousProductionUrl;
  }
});

test("accepts the active Nivora Vercel project alias", () => {
  const keys = [
    "APP_URL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
  ] as const;
  const previous = keys.map((key) => process.env[key]);

  try {
    process.env.APP_URL = "https://canonical.example";
    process.env.VERCEL_URL = "deployment.example";
    process.env.VERCEL_BRANCH_URL = "branch.example";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "production.example";

    const request = new Request(
      "https://nivora-ruben-6e63.vercel.app/api/v1/auth/login",
      { headers: { origin: "https://nivora-ruben-6e63.vercel.app" } },
    );

    assert.equal(hasTrustedOrigin(request), true);
  } finally {
    keys.forEach((key, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});

test("accepts Vercel deployment and branch hostnames as HTTPS origins", () => {
  const previousAppUrl = process.env.APP_URL;
  const previousDeploymentUrl = process.env.VERCEL_URL;
  const previousBranchUrl = process.env.VERCEL_BRANCH_URL;

  try {
    process.env.APP_URL = "https://canonical.example";
    process.env.VERCEL_URL = "nivora-abc123.vercel.app";
    process.env.VERCEL_BRANCH_URL = "nivora-git-main-ruben-6e63.vercel.app";

    for (const host of [
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
    ]) {
      const request = new Request(`https://${host}/api/v1/auth/login`, {
        headers: { origin: `https://${host}` },
      });
      assert.equal(hasTrustedOrigin(request), true);
    }
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousDeploymentUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousDeploymentUrl;
    if (previousBranchUrl === undefined) delete process.env.VERCEL_BRANCH_URL;
    else process.env.VERCEL_BRANCH_URL = previousBranchUrl;
  }
});

test("rejects origins outside APP_URL and Vercel system URLs", () => {
  const keys = [
    "APP_URL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
  ] as const;
  const previous = keys.map((key) => process.env[key]);

  try {
    process.env.APP_URL = "https://canonical.example";
    process.env.VERCEL_URL = "nivora-abc123.vercel.app";
    process.env.VERCEL_BRANCH_URL = "nivora-git-main-ruben-6e63.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "nivora-iota.vercel.app";

    const request = new Request("https://attacker.example/api/v1/auth/login", {
      headers: { origin: "https://attacker.example" },
    });

    assert.equal(hasTrustedOrigin(request), false);
  } finally {
    keys.forEach((key, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
