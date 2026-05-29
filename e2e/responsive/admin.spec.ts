import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { assertNoHorizontalOverflow, waitForAppShell } from "../fixtures/responsive";

const adminRoutes = [
  "/admin",
  "/admin/clients",
  "/admin/requests",
  "/admin/outreach/search",
  "/admin/billing",
];

test.describe("Admin responsive smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of adminRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForAppShell(page);
      await assertNoHorizontalOverflow(page);
    });
  }

  test("mobile admin menu exposes clients link", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Only applies to mobile viewport.");
    await page.goto("/admin");
    await page.getByRole("button", { name: "Open admin menu" }).click();
    await expect(page.getByRole("link", { name: "Clients" })).toBeVisible();
  });
});
