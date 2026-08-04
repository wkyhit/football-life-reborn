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
  const shortLandscape =
    viewport!.width < 1024 &&
    viewport!.height <= 500 &&
    viewport!.width > viewport!.height;

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
  } else if (shortLandscape) {
    expect(railBox!.x).toBeGreaterThanOrEqual(
      timelineBox!.x + timelineBox!.width,
    );
    expect(Math.round(railBox!.y)).toBe(
      Math.round(timelineBox!.y),
    );
    await expect(layout).toHaveCSS(
      "grid-template-columns",
      /.+ .+/,
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
      "[role='row'][aria-current='step'][data-career-season-row='18']",
    ),
  ).toHaveCount(1);
  await expect(
    rail.getByRole("button", { name: /^租借去/ }),
  ).toHaveCount(3);

  await expectResponsiveRailBoundaries({
    rail,
    timeline,
    viewport: viewport!,
  });

  if (viewport!.width === 390 && viewport!.height === 667) {
    await expectMobileComparisonAtInitialRailPosition(rail);
  }

  // Baselines come from the required ego-browser runner; geometry
  // assertions above protect layout while this allows rasterizer drift.
  await expect(page).toHaveScreenshot(
    "enhanced-career-deciding.png",
    { maxDiffPixelRatio: 0.03 },
  );
});

async function expectResponsiveRailBoundaries({
  rail,
  timeline,
  viewport,
}: {
  readonly rail: import("@playwright/test").Locator;
  readonly timeline: import("@playwright/test").Locator;
  readonly viewport: { readonly height: number; readonly width: number };
}) {
  const comparison = rail.getByRole("list", {
    name: "选项首屏比较",
  });
  const comparisonExpected =
    viewport.width >= 375 &&
    viewport.width <= 479 &&
    viewport.height >= 501 &&
    viewport.height > viewport.width;
  const targets = rail.locator("button, summary");
  const targetBoxes = await targets.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  const scrollState = await rail.evaluate((element) => {
    const documentY = window.scrollY;
    const maximum = element.scrollHeight - element.clientHeight;

    element.scrollTop = Math.min(100, maximum);
    const result = {
      documentY,
      documentYAfter: window.scrollY,
      maximum,
      overflowY: getComputedStyle(element).overflowY,
      railY: element.scrollTop,
    };
    element.scrollTop = 0;
    return result;
  });

  if (comparisonExpected) {
    await expect(comparison).toBeVisible();
  } else {
    await expect(comparison).toBeHidden();
  }
  expect(targetBoxes.length).toBeGreaterThanOrEqual(6);
  for (const target of targetBoxes) {
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.width).toBeGreaterThanOrEqual(44);
  }
  expect(scrollState.overflowY).toBe("auto");
  expect(scrollState.documentYAfter).toBe(scrollState.documentY);
  if (scrollState.maximum > 0) {
    expect(scrollState.railY).toBeGreaterThan(0);
  }
  expect(
    await timeline.evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(0);
  expect(
    await rail.evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(0);
}

async function expectMobileComparisonAtInitialRailPosition(
  rail: import("@playwright/test").Locator,
) {
  const railBox = await rail.boundingBox();
  const buttons = rail.getByRole("button", { name: /^租借去/ });
  const comparison = rail.getByRole("list", {
    name: "选项首屏比较",
  });
  const comparisonOptions = comparison.getByRole("listitem");
  const expectedFacts = [
    [
      "梅州客家",
      "沿用年薪 ¥20,000",
      "绝对主力 · 核心",
      "★",
      "风险 · 20% · 降级风险",
    ],
    [
      "无锡吴钩",
      "沿用年薪 ¥20,000",
      "绝对主力 · 核心",
      "★★",
      "风险 · 30% · 轮换风险",
    ],
    [
      "湖北青年星",
      "沿用年薪 ¥20,000",
      "绝对主力 · 核心",
      "★★★",
      "风险 · 10% · 适应风险",
    ],
  ] as const;

  expect(railBox).not.toBeNull();
  expect(await rail.evaluate((element) => element.scrollTop)).toBe(
    0,
  );
  await expect(comparisonOptions).toHaveCount(3);

  for (const [index, facts] of expectedFacts.entries()) {
    const button = buttons.nth(index);
    const comparisonOption = comparisonOptions.nth(index);
    const comparisonBox = await comparisonOption.boundingBox();

    await expect(button).toBeEnabled();
    for (const fact of facts) {
      await expect(comparisonOption).toContainText(fact);
    }
    expect(comparisonBox).not.toBeNull();
    expect(comparisonBox!.y).toBeGreaterThanOrEqual(
      railBox!.y,
    );
    expect(
      comparisonBox!.y + comparisonBox!.height,
    ).toBeLessThanOrEqual(
      railBox!.y + railBox!.height,
    );
  }
}

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
