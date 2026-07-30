import { expect, test } from "@playwright/test";

test("freezes the Classic landing tokens and primitive geometry", async ({
  page,
}) => {
  await page.goto("/?seed=phase-3-visual-baseline");
  await freezePresentation(page);

  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const heading = document.querySelector("h1");
    const main = document.querySelector("main");
    const headingStyle =
      heading === null ? null : getComputedStyle(heading);
    const mainStyle =
      main === null ? null : getComputedStyle(main);

    return {
      accent: root.getPropertyValue("--classic-accent").trim(),
      canvas: root.getPropertyValue("--classic-canvas").trim(),
      fontFamily: body.fontFamily,
      heading: headingStyle
        ? {
            fontSize: headingStyle.fontSize,
            fontWeight: headingStyle.fontWeight,
            lineHeight: headingStyle.lineHeight,
          }
        : null,
      mainPadding: mainStyle?.padding,
      primary: root.getPropertyValue("--classic-primary").trim(),
      surface: root.getPropertyValue("--classic-surface").trim(),
    };
  });

  expect(tokens).toEqual({
    accent: "oklch(0.696 0.17 162.48)",
    canvas: "oklch(0.141 0.005 285.823)",
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
    heading: {
      fontSize: "36px",
      fontWeight: "900",
      lineHeight: "45px",
    },
    mainPadding: "64px 20px 32px",
    primary: "oklch(0.985 0 0)",
    surface: "oklch(0.21 0.006 285.885)",
  });

  const paceOptions = page.getByRole("button").filter({
    has: page.locator("[data-classic-pace-option]"),
  });
  await expect(paceOptions).toHaveCount(3);
  await expect(paceOptions.first()).toHaveCSS(
    "border-radius",
    "16px",
  );
  await expect(paceOptions.first()).toHaveCSS("height", "79.5px");
  await expect(
    page.getByRole("button", { name: "开始生涯" }),
  ).toHaveCSS("height", "48px");
  await expect(
    page.getByRole("button", { name: "开始生涯" }),
  ).toHaveCSS("border-radius", "12px");

  await expect(page).toHaveScreenshot("landing.png");
});

async function freezePresentation(page: import("@playwright/test").Page) {
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
}
