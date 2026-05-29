import { test } from "@playwright/test";
import { assertNoHorizontalOverflow, waitForAppShell } from "../fixtures/responsive";

test.describe("Public flow responsive smoke", () => {
  test("request-help renders and is usable", async ({ page }) => {
    await page.goto("/request-help");
    await waitForAppShell(page);
    await assertNoHorizontalOverflow(page);
  });

  test("discovery route renders when token is provided", async ({ page }) => {
    const token = process.env.E2E_DISCOVERY_TOKEN;
    test.skip(!token, "E2E_DISCOVERY_TOKEN is not set.");
    await page.goto(`/schedule/discovery/${token}`);
    await waitForAppShell(page);
    await assertNoHorizontalOverflow(page);
  });
});
