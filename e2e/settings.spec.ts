import { test, expect } from "@playwright/test";
import { buildE2EIdentity, loginAsDefault } from "./helpers";

test.describe("Settings", () => {
  test("updating workspace name reflects in sidebar immediately", async ({
    page,
  }, testInfo) => {
    const identity = buildE2EIdentity(testInfo);
    await loginAsDefault(page, identity);

    const sidebarName = page.locator("button").first();
    const originalName = identity.workspaceName;
    await expect(sidebarName).toContainText(originalName);

    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("**/settings");
    await page.getByRole("tab", { name: "General" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    const newName = "Renamed WS " + Date.now();
    await nameInput.fill(newName);

    await page.locator("button", { hasText: "Save" }).click();
      await expect(page.getByText("Workspace settings saved").first()).toBeVisible({ timeout: 5000 });
    await expect(sidebarName).toContainText(newName);

    await nameInput.clear();
    await nameInput.fill(originalName);
    await page.locator("button", { hasText: "Save" }).click();
      await expect(page.getByText("Workspace settings saved").first()).toBeVisible({ timeout: 5000 });
    await expect(sidebarName).toContainText(originalName);
  });
});
