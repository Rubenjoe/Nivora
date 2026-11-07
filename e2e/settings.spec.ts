import { expect, test } from "@playwright/test";

test.describe("settings: data export and account deletion guard", () => {
  test("downloads all data as valid JSON without internal identifiers", async ({
    page,
  }) => {
    await page.goto("/settings");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download all my data/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^nivora-data.*\.json$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    expect(data.app).toBe("Nivora");
    expect(data.schemaVersion).toBe(1);
    for (const key of [
      "profile",
      "categories",
      "transactions",
      "budgets",
      "savingsGoals",
      "goalContributions",
      "recurringSchedules",
      "recurringOccurrences",
    ]) {
      expect(data, key).toHaveProperty(key);
    }
    expect(JSON.stringify(data)).not.toContain("supabaseUserId");
  });

  test("CSV export still downloads", async ({ page }) => {
    await page.goto("/settings");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export my transactions/i }).click();
    expect((await downloadPromise).suggestedFilename()).toMatch(/\.csv$/);
  });

  test("delete account needs the exact word DELETE", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /delete my account/i }).click();

    const confirm = page.getByRole("button", {
      name: /permanently delete everything/i,
    });
    const input = page.getByLabel(/type delete to confirm/i);

    await expect(confirm).toBeDisabled();
    await input.fill("delete");
    await expect(confirm).toBeDisabled();
    await input.fill("DELETE");
    await expect(confirm).toBeEnabled();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(input).toHaveCount(0);
  });

  test("the account API refuses deletion without confirmation", async ({
    page,
  }) => {
    await page.goto("/settings");
    const response = await page.request.delete("/api/v1/profile", {
      data: { confirm: "nope" },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(response.status()).toBe(400);
  });
});
