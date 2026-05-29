import { expect, type Page } from "@playwright/test";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for e2e auth tests.`);
  }
  return value;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function loginAsAdmin(page: Page) {
  const email = getRequiredEnv("E2E_ADMIN_EMAIL");
  const password = getRequiredEnv("E2E_ADMIN_PASSWORD");
  await login(page, email, password);
  await expect(page).toHaveURL(/\/admin/);
}

export async function loginAsClient(page: Page) {
  const email = getRequiredEnv("E2E_CLIENT_EMAIL");
  const password = getRequiredEnv("E2E_CLIENT_PASSWORD");
  await login(page, email, password);
  await expect(page).toHaveURL(/\/portal/);
}
