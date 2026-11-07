import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * DESTRUCTIVE: permanently deletes the account it signs in with.
 * Runs only when a dedicated, disposable user is provided.
 */
const email = process.env.E2E_DELETE_EMAIL;
const password = process.env.E2E_DELETE_PASSWORD;

test.skip(
  !email || !password || process.env.E2E_ALLOW_ACCOUNT_DELETE !== "1",
  "Set E2E_ALLOW_ACCOUNT_DELETE=1 with E2E_DELETE_EMAIL / E2E_DELETE_PASSWORD (a disposable user).",
);

test("deleting the account erases data and signs the user out", async ({
  page,
}) => {
  await signIn(page, email!, password!);
  await page.goto("/settings");

  await page.getByRole("button", { name: /delete my account/i }).click();
  await page.getByLabel(/type delete to confirm/i).fill("DELETE");
  await page
    .getByRole("button", { name: /permanently delete everything/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /your data has been deleted/i }),
  ).toBeVisible({ timeout: 20_000 });

  const response = await page.request.get("/api/v1/transactions");
  expect(response.status()).toBe(401);
});
