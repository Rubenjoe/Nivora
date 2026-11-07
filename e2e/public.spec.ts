import { expect, test } from "@playwright/test";

test("landing page loads with the Nivora brand", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nivora/i);
  await expect(
    page.getByRole("link", { name: /nivora.*home/i }).first(),
  ).toBeVisible();
});

test("sign-in page shows the email and password fields", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator("#lp-form button[type=submit]")).toBeEnabled();
});

test("private pages ask anonymous visitors to sign in", async ({ page }) => {
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: /sign in to continue/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /record transaction/i }),
  ).toHaveCount(0);
});

test("private APIs reject anonymous requests", async ({ request }) => {
  for (const path of [
    "/api/v1/transactions",
    "/api/v1/export/all",
    "/api/v1/export/transactions",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
});

test("a wrong password shows an error and stays on sign-in", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.locator("#email").fill("nobody@example.com");
  await page.locator("#password").fill("definitely-wrong-password");
  await page.locator("#lp-form button[type=submit]").click();
  await expect(page.locator(".lp-auth-message-error")).toBeVisible({
    timeout: 15_000,
  });
  expect(new URL(page.url()).pathname).toBe("/sign-in");
});
