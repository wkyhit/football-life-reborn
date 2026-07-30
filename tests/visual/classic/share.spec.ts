import { expect, test } from "@playwright/test";

test("matches the frozen Classic share overlay", async ({ page }) => {
  await page.goto("/visual.html?fixture=share");
  await page.evaluate(() => document.fonts.ready);

  const overlay = page.locator("[data-classic-share-overlay]");
  const preview = page.getByRole("img", { name: "生涯战绩卡" });
  const viewportHeight = test.info().project.use.viewport?.height;

  await expect(overlay).toHaveCSS("height", `${viewportHeight}px`);
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => ({
        height: image.naturalHeight,
        width: image.naturalWidth,
      })),
    )
    .toEqual({ height: 1720, width: 1080 });
  await expect(
    page.getByRole("button", { name: "下载图片" }),
  ).toHaveCSS("height", "48px");

  if (test.info().project.name === "chromium-390x844") {
    await expect(page).toHaveScreenshot("share-overlay.png");
  }
});
