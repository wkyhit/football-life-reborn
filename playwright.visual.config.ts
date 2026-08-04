import { defineConfig } from "@playwright/test";

const viewports = [
  { height: 667, width: 390 },
  { height: 844, width: 390 },
  { height: 1024, width: 768 },
  { height: 830, width: 1280 },
  { height: 900, width: 1440 },
] as const;

const enhancedBoundaryViewports = [
  { height: 415, width: 195 },
  { height: 320, width: 568 },
] as const;

function visualProject(
  viewport: (typeof viewports)[number] |
    (typeof enhancedBoundaryViewports)[number],
) {
  return {
    name: `chromium-${viewport.width}x${viewport.height}`,
    use: {
      browserName: "chromium" as const,
      deviceScaleFactor: 1,
      viewport,
    },
  };
}

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "output/playwright/visual-results",
  projects: [
    ...viewports.map(visualProject),
    ...enhancedBoundaryViewports.map((viewport) => ({
      ...visualProject(viewport),
      testMatch: /enhanced\/layout\.spec\.ts/,
    })),
  ],
  reporter: [["list"]],
  retries: 0,
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/reference/{projectName}/{arg}{ext}",
  testDir: "./tests/visual",
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4173",
  },
  workers: 1,
});
