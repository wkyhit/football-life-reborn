import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Page,
} from "@playwright/test";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
] as const;

test("Enhanced supports keyboard-only setup and announces season updates", async ({
  page,
}) => {
  await page.goto(
    "/?ui=enhanced&seed=phase-4%3Akeyboard-e2e",
  );
  await expectNoSeriousAxeViolations(page);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", {
    name: "跳到主要内容",
  });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const random = page.getByRole("button", {
    name: "随机球员",
  });
  await random.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "开始普通生涯" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  const china = page.getByRole("button", {
    name: /^中国/,
  });
  await china.focus();
  await page.keyboard.press("Space");
  await expect(china).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await activateWithKeyboard(
    page,
    page.getByRole("button", { name: "下一步" }),
    "Enter",
  );

  await page.getByRole("textbox", { name: "姓名" }).fill(
    "林一鸣",
  );
  await page.getByLabel("号码").fill("9");
  await activateWithKeyboard(
    page,
    page.getByRole("button", { name: "左脚" }),
    "Space",
  );
  await activateWithKeyboard(
    page,
    page.getByRole("button", { name: "下一步" }),
    "Enter",
  );
  await activateWithKeyboard(
    page,
    page.getByRole("button", { name: /^中锋/ }),
    "Space",
  );
  await activateWithKeyboard(
    page,
    page.getByRole("button", { name: "开始踢球" }),
    "Enter",
  );

  const decision = page
    .locator("[data-enhanced-decision-rail] button")
    .first();
  await activateWithKeyboard(page, decision, "Enter");
  await expect(page.getByRole("status")).toHaveText(
    "赛季进行中",
  );
  await expectNoSeriousAxeViolations(page);
});

test("Enhanced honors reduced motion and remains usable at 200% reflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/?ui=enhanced&seed=phase-4%3Areduced-e2e",
  );

  const initialWidth = page.viewportSize()?.width;

  if (initialWidth === undefined) {
    throw new Error("Expected a configured viewport");
  }

  await page.setViewportSize({
    height: page.viewportSize()!.height,
    width: Math.max(195, Math.floor(initialWidth / 2)),
  });
  await expectNoDocumentOverflow(page);

  const selectedMode = page.getByRole("button", {
    name: "标准",
  });
  await expect(selectedMode).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(selectedMode).toContainText("已选择");

  await page.getByRole("button", { name: "随机球员" }).click();
  await expectNoDocumentOverflow(page);
  await page
    .getByRole("button", { name: "开始踢球" })
    .click();
  await expectNoDocumentOverflow(page);
  expect(
    await page
      .locator("[data-enhanced-timeline]")
      .evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(0);
  expect(
    await page
      .locator("[data-enhanced-decision-rail]")
      .evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(0);

  const decision = page
    .locator("[data-enhanced-decision-rail] button")
    .first();
  await decision.click();
  await expect(page.getByRole("status")).toHaveText(
    "赛季更新完成，已记录 2 个赛季",
  );
  await expect(
    page.locator('[data-enhanced-season-row="season"]'),
  ).toHaveCount(2);
  expect(
    await decision.evaluate((element) =>
      Number.parseFloat(
        getComputedStyle(element).transitionDuration,
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
  await expectNoDocumentOverflow(page);
  await expectNoSeriousAxeViolations(page);
});

async function activateWithKeyboard(
  page: Page,
  target: ReturnType<Page["locator"]>,
  key: "Enter" | "Space",
): Promise<void> {
  await target.focus();
  await page.keyboard.press(key);
}

async function expectNoSeriousAxeViolations(
  page: Page,
): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags([...WCAG_TAGS])
    .analyze();
  const violations = result.violations.filter(
    (violation) =>
      violation.impact === "serious" ||
      violation.impact === "critical",
  );

  expect(
    violations,
    violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes
            .map((node) => node.target.join(" "))
            .join(", ")}`,
      )
      .join("\n"),
  ).toEqual([]);
}

async function expectNoDocumentOverflow(
  page: Page,
): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
