import { test, expect } from "@playwright/test";
import { buildE2EIdentity, loginAsDefault } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsDefault(page, buildE2EIdentity(testInfo));
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.getByRole("link", { name: "Inbox", exact: true }).click();
    await page.waitForURL("**/inbox");
    await expect(page).toHaveURL(/\/inbox/);

    await page.getByRole("link", { name: "Agents", exact: true }).click();
    await page.waitForURL("**/agents");
    await expect(page).toHaveURL(/\/agents/);
    await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();

    await page.getByRole("link", { name: "Issues", exact: true }).click();
    await page.waitForURL("**/issues");
    await expect(page).toHaveURL(/\/issues/);
    await expect(page.getByText("Issues").first()).toBeVisible();
  });

  test("settings page loads via sidebar link", async ({ page }) => {
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.waitForURL("**/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "General" })).toBeVisible();
  });

  test("agents page shows agent list", async ({ page }) => {
    await page.getByRole("link", { name: "Agents", exact: true }).click();
    await page.waitForURL("**/agents");

    await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
    await expect(page.getByText("No agents yet")).toBeVisible();
  });
});
