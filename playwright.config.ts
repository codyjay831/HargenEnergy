import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e/responsive",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad (gen 7)"],
        browserName: "chromium",
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
