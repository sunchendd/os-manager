import { test, expect } from "@playwright/test";
import { buildE2EIdentity, createTestApi, loginAsDefault } from "./helpers";
import type { TestApiClient } from "./fixtures";

test.describe("Comments", () => {
  let api: TestApiClient;
  let workspaceSlug: string;
  let issueId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    const identity = buildE2EIdentity(testInfo);
    api = await createTestApi(identity);
    const issue = await api.createIssue("E2E Comment Test " + Date.now());
    issueId = issue.id;
    workspaceSlug = await loginAsDefault(page, identity, api);
  });

  test.afterEach(async () => {
    if (api) {
      await api.cleanup();
    }
  });

  test("can add a comment on an issue", async ({ page }) => {
    await page.goto(`/${workspaceSlug}/issues/${issueId}`);
    await page.waitForURL(new RegExp(`/${workspaceSlug}/issues/${issueId}$`));
    await expect(page.getByText("Properties")).toBeVisible({ timeout: 10000 });

    const commentText = "E2E comment " + Date.now();
    const commentInput = page
      .locator('.rich-text-editor.ProseMirror[contenteditable="true"]')
      .filter({ has: page.locator('[data-placeholder="Leave a comment..."]') })
      .first();

    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.click();
    await commentInput.fill(commentText);
    await page.keyboard.press("Meta+Enter");

    await expect(page.locator(`text=${commentText}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("comment submit button is disabled when empty", async ({ page }) => {
    await page.goto(`/${workspaceSlug}/issues/${issueId}`);
    await page.waitForURL(new RegExp(`/${workspaceSlug}/issues/${issueId}$`));
    await expect(page.getByText("Properties")).toBeVisible({ timeout: 10000 });

    const commentInput = page
      .locator('.rich-text-editor.ProseMirror[contenteditable="true"]')
      .filter({ has: page.locator('[data-placeholder="Leave a comment..."]') })
      .first();
    const commentBox = page
      .locator("div.relative.flex.flex-col.rounded-lg.bg-card")
      .filter({ has: commentInput })
      .first();
    const submitButton = commentBox.getByRole("button").last();

    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeDisabled();
  });
});
