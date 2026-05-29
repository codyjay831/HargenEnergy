import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, waitForAppShell } from "../fixtures/responsive";

const authRoutes = ["/login", "/forgot-password", "/reset-password"];

test.describe("Auth responsive smoke", () => {
  for (const route of authRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForAppShell(page);
      await assertNoHorizontalOverflow(page);
    });
  }

  test("login form is interactive", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
