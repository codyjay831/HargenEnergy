import { expect, test } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";
import { assertNoHorizontalOverflow, waitForAppShell } from "../fixtures/responsive";

const portalRoutes = [
  "/portal",
  "/portal/requests",
  "/portal/requests/new",
  "/portal/access",
  "/portal/account",
];

test.describe("Portal responsive smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  for (const route of portalRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForAppShell(page);
      await assertNoHorizontalOverflow(page);
    });
  }

  test("mobile portal menu exposes requests link", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Only applies to mobile viewport.");
    await page.goto("/portal");
    await page.getByRole("button", { name: "Open portal menu" }).click();
    await expect(page.getByRole("link", { name: /Work Requests/i })).toBeVisible();
  });
});
