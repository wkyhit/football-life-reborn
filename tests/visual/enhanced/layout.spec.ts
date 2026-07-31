import { expect, test } from "@playwright/test";

test("keeps the timeline and decision rail stable at every viewport", async ({
  page,
}) => {
  await page.goto(
    "/visual.html?fixture=career-deciding&ui=enhanced",
  );
  await page.evaluate(() => document.fonts.ready);
  await waitForCrests(page);

  const shell = page.locator("[data-enhanced-career-shell]");
  const layout = page.locator("[data-enhanced-career-layout]");
  const timeline = page.locator("[data-enhanced-timeline]");
  const rail = page.locator("[data-enhanced-decision-rail]");
  const viewport = test.info().project.use.viewport;

  expect(viewport).toBeDefined();
  await expect(shell).toHaveCSS(
    "height",
    `${viewport!.height}px`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
            window.innerWidth &&
          document.documentElement.scrollHeight <=
            window.innerHeight,
      ),
    )
    .toBe(true);

  const timelineBox = await timeline.boundingBox();
  const railBox = await rail.boundingBox();

  expect(timelineBox).not.toBeNull();
  expect(railBox).not.toBeNull();

  if (viewport!.width >= 1024) {
    expect(Math.round(railBox!.width)).toBe(380);
    expect(railBox!.x).toBeGreaterThan(
      timelineBox!.x + timelineBox!.width,
    );
    await expect(layout).toHaveCSS(
      "grid-template-columns",
      /.+ 380px/,
    );
  } else {
    expect(railBox!.y).toBeGreaterThanOrEqual(
      timelineBox!.y + timelineBox!.height,
    );
    expect(Math.round(railBox!.width)).toBe(viewport!.width);
    await expect(layout).toHaveCSS(
      "grid-template-columns",
      `${viewport!.width}px`,
    );
  }

  await expect(
    page.getByRole("heading", { name: "生涯时间线" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "外租" }),
  ).toBeVisible();
  await expect(
    page.locator(
      "[data-enhanced-season-row='current'][data-career-season-row='18']",
    ),
  ).toHaveCount(1);
  await expect(
    rail.getByRole("button", { name: /^租借去/ }),
  ).toHaveCount(3);

  // Baselines come from the required ego-browser runner; geometry
  // assertions above protect layout while this allows rasterizer drift.
  await expect(page).toHaveScreenshot(
    "enhanced-career-deciding.png",
    { maxDiffPixelRatio: 0.03 },
  );
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
