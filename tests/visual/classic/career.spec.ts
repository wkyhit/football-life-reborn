import { expect, test } from "@playwright/test";

const fixtures = [
  "career-empty",
  "career-simulating",
  "career-populated",
  "career-deciding",
] as const;

test("matches the frozen Classic career states", async ({ page }) => {
  for (const fixture of fixtures) {
    await page.goto(`/visual.html?fixture=${fixture}`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator("[data-classic-career-shell]");
    const timeline = page.locator("[data-classic-timeline-scroll]");
    const panel = page.locator("[data-classic-career-panel]");
    const viewportHeight = test.info().project.use.viewport?.height;

    await expect(shell).toHaveCSS("height", `${viewportHeight}px`);
    await expect(timeline).toHaveCSS("overflow-y", "auto");
    await expect(panel).toHaveCSS("flex-shrink", "0");

    if (test.info().project.name === "chromium-390x844") {
      await expect(page).toHaveScreenshot(`${fixture}.png`);
    }
  }
});
