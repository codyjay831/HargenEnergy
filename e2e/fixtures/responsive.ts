import { expect, type Page } from "@playwright/test";

export async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });

  expect(hasOverflow).toBeFalsy();
}

export async function waitForAppShell(page: Page) {
  await expect(page.locator("body")).toBeVisible();
}
