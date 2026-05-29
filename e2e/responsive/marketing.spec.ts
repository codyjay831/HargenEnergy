import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, waitForAppShell } from "../fixtures/responsive";

const marketingRoutes = ["/", "/how-it-works", "/services", "/pricing", "/about"];

test.describe("Marketing responsive smoke", () => {
  for (const route of marketingRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForAppShell(page);
      await assertNoHorizontalOverflow(page);
    });
  }

  test("mobile menu opens", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Only applies to mobile viewport.");
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Login" })
    ).toBeVisible();
  });
});
