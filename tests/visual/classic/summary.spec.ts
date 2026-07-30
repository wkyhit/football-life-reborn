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
    await waitForCrests(page);

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

async function waitForCrests(
  page: import("@playwright/test").Page,
) {
  const crests = page.locator("[data-classic-club-mark] img");
  await crests.evaluateAll((images) => {
    for (const image of images) {
      (image as HTMLImageElement).loading = "eager";
    }
  });
  await expect
    .poll(() =>
      crests.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
}
