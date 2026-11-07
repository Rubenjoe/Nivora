import { expect, test, type Page } from "@playwright/test";
import { addExpense, rowFor, uniqueMerchant } from "./helpers";

const UNDO_MS = 5000;

async function expectToastGone(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: /transaction deleted/i }),
  ).toBeHidden({ timeout: UNDO_MS + 3000 });
}

test.describe("transactions: add, delete and undo", () => {
  test("add a transaction and see it in the list", async ({ page }) => {
    const merchant = uniqueMerchant("Add");
    await addExpense(page, merchant);
    await page.reload();
    await expect(rowFor(page, merchant)).toBeVisible();

    // Clean up through the UI, letting the undo window run out.
    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    await expect(rowFor(page, merchant)).toHaveCount(0);
    await expectToastGone(page);
  });

  test("delete shows an undo toast and Undo restores the row", async ({
    page,
  }) => {
    const merchant = uniqueMerchant("Undo");
    await addExpense(page, merchant);

    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    await expect(rowFor(page, merchant)).toHaveCount(0);
    const toast = page
      .getByRole("status")
      .filter({ hasText: /transaction deleted/i });
    await expect(toast).toBeVisible();

    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(rowFor(page, merchant)).toBeVisible();

    // It must still exist on the server after the undo window would have ended.
    await page.waitForTimeout(UNDO_MS + 1000);
    await page.reload();
    await expect(rowFor(page, merchant)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    await expectToastGone(page);
  });

  test("without Undo the delete is permanent after 5 seconds", async ({
    page,
  }) => {
    const merchant = uniqueMerchant("Gone");
    await addExpense(page, merchant);

    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    const toast = page
      .getByRole("status")
      .filter({ hasText: /transaction deleted/i });
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: UNDO_MS + 3000 });

    await page.reload();
    await expect(rowFor(page, merchant)).toHaveCount(0);
  });

  test("leaving the page mid-undo still completes the delete", async ({
    page,
  }) => {
    const merchant = uniqueMerchant("Leave");
    await addExpense(page, merchant);

    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    await expect(rowFor(page, merchant)).toHaveCount(0);

    // Navigate away well inside the 5 second window.
    await page.goto("/budgets");

    await expect
      .poll(
        async () => {
          await page.goto("/transactions");
          return rowFor(page, merchant).count();
        },
        { timeout: 15_000, intervals: [500, 1000, 2000] },
      )
      .toBe(0);
  });

  test("deleting is not blocked by a browser confirm dialog", async ({
    page,
  }) => {
    const merchant = uniqueMerchant("NoDialog");
    page.on("dialog", () => {
      throw new Error("A native confirm dialog appeared.");
    });
    await addExpense(page, merchant);
    await page.getByRole("button", { name: `Delete ${merchant}` }).click();
    await expect(rowFor(page, merchant)).toHaveCount(0);
  });
});
