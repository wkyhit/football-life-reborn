import {
  expect,
  test,
  type Page,
} from "@playwright/test";

test("an Enhanced user can archive, export/import, fork, finish, and compare across reloads", async ({
  page,
}) => {
  await page.goto(
    "/?ui=enhanced&seed=phase-5%3Aarchive-branching-e2e",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "速通" }).click();
  await page.getByRole("button", { name: "开始新生涯" }).click();
  await page.getByRole("button", { name: "中国" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: /^中锋/ }).click();
  await page.getByRole("button", { name: "开始踢球" }).click();
  await page
    .getByRole("button", { name: /^加盟 / })
    .first()
    .click();

  await page.getByRole("button", { name: "生涯档案" }).click();
  await expect(
    page.getByRole("heading", { name: "生涯档案" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /^导出 / })
    .first()
    .click();
  const download = await downloadPromise;
  const exportPath = await download.path();

  await page
    .getByRole("button", { name: /^创建平行人生 / })
    .first()
    .click();
  await page.getByRole("button", { name: /^改选 / }).first().click();
  await page
    .getByRole("button", { name: "保存平行人生" })
    .click();

  await page.reload();
  await page.getByRole("button", { name: "生涯档案" }).click();
  await expect(
    page.getByText(/平行人生/).first(),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: /^继续 (?!.*平行人生)/,
    })
    .first()
    .click();
  await finishActiveCareer(page);
  await page.getByRole("button", { name: "生涯档案" }).click();
  await page
    .getByRole("button", {
      name: /^继续 .*平行人生/,
    })
    .click();
  await finishActiveCareer(page);
  await page.getByRole("button", { name: "生涯档案" }).click();

  if (exportPath === null) {
    throw new Error("Expected exported career file");
  }

  await page
    .getByRole("button", {
      name: "删除 李的生涯",
    })
    .click();
  await page
    .getByRole("button", {
      name: "确认删除 李的生涯",
    })
    .click();
  await page.getByLabel("导入生涯 JSON").setInputFiles(exportPath);
  await expect(page.getByRole("status")).toContainText("已导入");

  const selectors = page.getByRole("checkbox", {
    name: /用于比较/,
  });
  await selectors.nth(0).check();
  await selectors.nth(1).check();
  await page
    .getByRole("button", { name: "比较已选人生" })
    .click();
  await expect(
    page.getByRole("heading", { name: "平行人生对比" }),
  ).toBeVisible();
  await expect(page.getByText("能力曲线")).toBeVisible();
  await expect(page.getByText("国家队结果")).toBeVisible();
});

async function finishActiveCareer(page: Page): Promise<void> {
  for (let index = 0; index < 40; index += 1) {
    if (
      await page
        .locator("[data-classic-summary-shell]")
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const option = page
      .locator("[data-enhanced-decision-rail] button")
      .first();
    await expect(option).toBeVisible();
    await option.click();
  }

  throw new Error("Enhanced career did not reach retirement");
}
