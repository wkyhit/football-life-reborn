import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const referenceRoot = `${root}/tests/visual/classic/reference`;
const referenceUrl =
  "https://football-life.pages.dev/?seed=phase-3-visual-baseline";
const viewports = [
  { height: 667, width: 390 },
  { height: 844, width: 390 },
  { height: 1024, width: 768 },
  { height: 830, width: 1280 },
  { height: 900, width: 1440 },
];
const browser = await chromium.launch();

try {
  for (const viewport of viewports) {
    const projectName = `chromium-${viewport.width}x${viewport.height}`;
    const outputDirectory = `${referenceRoot}/${projectName}`;
    const context = await browser.newContext({
      colorScheme: "dark",
      deviceScaleFactor: 1,
      locale: "zh-CN",
      viewport,
    });
    const page = await context.newPage();
    await page.goto(referenceUrl, { waitUntil: "networkidle" });
    await freezePresentation(page);
    await mkdir(outputDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      caret: "hide",
      path: `${outputDirectory}/landing.png`,
    });
    await context.close();
    process.stdout.write(`Captured ${projectName}/landing.png\n`);
  }
} finally {
  await browser.close();
}

async function freezePresentation(page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(50);
}
