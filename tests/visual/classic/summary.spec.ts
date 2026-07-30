import { expect, test } from "@playwright/test";

const fixtures = [
  "summary-attacker",
  "summary-goalkeeper",
  "summary-national-team",
  "summary-title",
  "summary-no-title",
] as const;

test("matches the frozen Classic summary matrix", async ({ page }) => {
  for (const fixture of fixtures) {
    await page.goto(`/visual.html?fixture=${fixture}`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator("[data-classic-summary-shell]");
    const scroll = page.locator("[data-classic-summary-scroll]");
    const footer = page.locator("[data-classic-summary-footer]");
    const viewportHeight = test.info().project.use.viewport?.height;

    await expect(shell).toHaveCSS("height", `${viewportHeight}px`);
    await expect(scroll).toHaveCSS("overflow-y", "auto");
    await expect(footer).toHaveCSS("flex-shrink", "0");

    if (test.info().project.name === "chromium-390x844") {
      await expect(page).toHaveScreenshot(`${fixture}.png`);
    }
  }
});
