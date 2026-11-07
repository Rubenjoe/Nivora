import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#lp-form button[type=submit]").click();
  await page.waitForURL(
    (url) => url.pathname === "/" || url.pathname === "/dashboard",
    { timeout: 20_000 },
  );
  await expect(page.locator("#main-content")).toBeVisible();
}

export function uniqueMerchant(label = "E2E") {
  return `${label} ${Date.now().toString(36)}`;
}

/** Records an expense through the real form and waits for it to appear. */
export async function addExpense(
  page: Page,
  merchant: string,
  amount = "123.45",
) {
  await page.goto("/transactions");
  await page.locator("#transaction-amount").fill(amount);
  await page.locator("#transaction-merchant").fill(merchant);
  await page.getByRole("button", { name: /record transaction/i }).click();
  await expect(rowFor(page, merchant)).toBeVisible();
}

export function rowFor(page: Page, merchant: string) {
  return page.locator("article", { hasText: merchant });
}
