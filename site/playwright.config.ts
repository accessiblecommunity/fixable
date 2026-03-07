import { defineConfig, devices } from "@playwright/test";

// Base configuration for Playwright tests, including test directory, parallelism, retries, and browser settings.
// Based on configuration from docs: https://playwright.dev/docs/test-configuration

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: "./tests",

  // Run all tests in parallel.
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use for test results.
  reporter: "html",
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: "http://localhost:4323/fixable/",

    // Collect trace when retrying the failed test.
    trace: "on-first-retry",
  },
  // Configure projects for major browsers.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Run your local dev server before starting the tests.
    command: "npm run dev",
    url: "http://localhost:4323/fixable/",
    reuseExistingServer: !process.env.CI,
  },
});
