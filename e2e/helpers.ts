import { expect, type Page, type TestInfo } from "@playwright/test";
import { TestApiClient } from "./fixtures";

const APP_ORIGIN = new URL(
  process.env.PLAYWRIGHT_BASE_URL ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:3000",
).origin;

export interface E2EIdentity {
  email: string;
  name: string;
  workspaceName: string;
  workspaceSlug: string;
}

function hashString(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash.toString(36);
}

export function buildE2EIdentity(testInfo: TestInfo): E2EIdentity {
  const key = [...testInfo.titlePath, String(testInfo.workerIndex)].join("|");
  const suffix = hashString(key).slice(0, 8);

  return {
    email: `e2e+${suffix}@multica.ai`,
    name: `E2E User ${suffix}`,
    workspaceName: `E2E Workspace ${suffix}`,
    workspaceSlug: `e2e-${suffix}`,
  };
}

/**
 * Log in as the default E2E user and ensure the workspace exists first.
 * Authenticates via API (send-code → DB read → verify-code), then injects
 * the token into localStorage so the browser session is authenticated.
 *
 * Returns the E2E workspace slug so callers can build workspace-scoped URLs.
 */
export async function loginAsDefault(
  page: Page,
  identity: E2EIdentity,
  api = new TestApiClient(),
): Promise<string> {
  if (!api.getToken()) {
    await api.login(identity.email, identity.name);
  }
  const workspace = await api.ensureWorkspace(
    identity.workspaceName,
    identity.workspaceSlug,
  );

  const token = api.getToken();
  await page.context().addCookies([
    {
      name: "multica_logged_in",
      value: "1",
      url: APP_ORIGIN,
      sameSite: "Lax",
    },
    {
      name: "last_workspace_slug",
      value: workspace.slug,
      url: APP_ORIGIN,
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript((t) => {
    window.localStorage.setItem("multica_token", t);
  }, token);
  await page.goto(`/${workspace.slug}/issues`);
  await expect(page).toHaveURL(new RegExp(`/${workspace.slug}/issues`), {
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: "New Issue" })).toBeVisible({
    timeout: 10000,
  });
  return workspace.slug;
}

/**
 * Create a TestApiClient logged in as the default E2E user.
 * Call api.cleanup() in afterEach to remove test data created during the test.
 */
export async function createTestApi(identity: E2EIdentity): Promise<TestApiClient> {
  const api = new TestApiClient();
  await api.login(identity.email, identity.name);
  await api.ensureWorkspace(identity.workspaceName, identity.workspaceSlug);
  return api;
}

export async function openWorkspaceMenu(page: Page) {
  const trigger = page.locator("button").filter({ hasText: /Workspace|Multica/i }).first();
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();
  await expect(page.getByText("Log out")).toBeVisible({ timeout: 10000 });
}
