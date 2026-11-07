import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./helpers";

const authFile = "e2e/.auth/user.json";

setup("sign in the test user", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  setup.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD (a throwaway test user) to run signed-in tests.",
  );
  await signIn(page, email!, password!);
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
