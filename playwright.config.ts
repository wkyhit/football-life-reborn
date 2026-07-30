import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "output/playwright/test-results",
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "output/playwright/report",
      },
    ],
  ],
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  workers: 1,
  projects: [
    {
      name: "chromium-390x667",
      use: {
        browserName: "chromium",
        viewport: { height: 667, width: 390 },
      },
    },
    {
      name: "chromium-1280x830",
      use: {
        browserName: "chromium",
        viewport: { height: 830, width: 1280 },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4173",
  },
});
