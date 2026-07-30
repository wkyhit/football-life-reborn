import { expect, test } from "@playwright/test";

test("matches every Classic onboarding state", async ({ page }) => {
  await page.goto("/?seed=phase-3-onboarding-baseline");
  await freezePresentation(page);

  await expect(page).toHaveScreenshot("landing.png");
  await page.getByRole("button", { name: "开始生涯" }).click();

  const countries = page.locator("[data-classic-country]");
  const nextButton = page.getByRole("button", { name: "下一步" });
  await expect(countries).toHaveCount(61);
  await expect(nextButton).toBeDisabled();
  await expect(page).toHaveScreenshot("nationality-initial.png");

  const search = page.getByPlaceholder("搜索国家");
  await search.fill("中国");
  await expect(countries).toHaveCount(1);
  await search.fill("");

  await page.getByRole("button", { name: /中国/ }).click();
  await expect(nextButton).toBeEnabled();
  await expect(page).toHaveScreenshot("nationality-selected.png");
  await nextButton.click();

  await expect(page.getByLabel("姓名")).toHaveValue("李");
  await expect(page.getByLabel("号码")).toHaveValue("10");
  await expect(
    page.getByRole("button", { name: "右脚" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveScreenshot("identity-default.png");

  await page.getByLabel("姓名").fill("");
  await page.getByLabel("号码").fill("");
  await page.getByRole("heading", { name: "填一下名字" }).click();
  await expect(nextButton).toBeDisabled();
  await expect(page).toHaveScreenshot("identity-empty.png");

  await page.getByLabel("姓名").fill("李");
  await page.getByLabel("号码").fill("10");
  await nextButton.click();

  const positions = page.locator("[data-classic-position]");
  await expect(positions).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: "开始踢球" }),
  ).toBeDisabled();
  await expect(page).toHaveScreenshot("position-initial.png");

  await page.getByRole("button", { name: "中锋" }).click();
  await expect(
    page.getByRole("button", { name: "开始踢球" }),
  ).toBeEnabled();
  await expect(page).toHaveScreenshot("position-selected.png");

  const shell = page.locator("[data-classic-setup-shell]");
  await expect(shell).toHaveCSS("height", `${test.info().project.use.viewport?.height}px`);
  const footerButtons = page
    .locator("[data-classic-setup-footer]")
    .getByRole("button");
  await expect(footerButtons).toHaveCount(2);
  await expect(footerButtons.first()).toHaveCSS("height", "48px");
  await expect(footerButtons.last()).toHaveCSS("height", "48px");
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
