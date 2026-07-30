import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { playClassicCareer } from "../../src/domain/classicEngine";
import { CLASSIC_SESSION_SCHEMA_VERSION } from "../../src/storage/classicSessionRepository";
import { ACTIVE_CLASSIC_SESSION_STORAGE_KEY } from "../../src/storage/classicSessionRepository";

const completedCareer = playClassicCareer({
  identity: {
    lastName: "林一鸣",
    nationalityFifaCode: "CHN",
    position: "ST",
    preferredNumber: 9,
  },
  mode: "normal",
  seed: "phase-3:share-card-e2e",
});
const storedSession = JSON.stringify({
  choiceLog: completedCareer.choiceLog,
  contentVersion: completedCareer.contentVersion,
  identity: completedCareer.identity,
  mode: completedCareer.mode,
  schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
  seed: completedCareer.seed,
});

test("the share overlay edits, previews, and downloads a local PNG", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      value: storedSession,
    },
  );
  await page.goto("/");

  const shareTrigger = page.getByRole("button", {
    name: "保存战绩卡",
  });
  await shareTrigger.click();

  const name = page.getByRole("textbox", { name: "卡上名字" });
  await expect(name).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(name).toBeHidden();
  await expect(shareTrigger).toBeFocused();

  await shareTrigger.press("Enter");
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("林一鸣");
  await expect(name).toHaveAttribute("maxlength", "12");
  await name.fill("新名字");

  const preview = page.getByRole("img", { name: "生涯战绩卡" });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute(
    "data-share-card-name",
    "新名字",
  );
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => ({
        height: image.naturalHeight,
        width: image.naturalWidth,
      })),
    )
    .toEqual({ height: 1720, width: 1080 });

  const downloadButton = page.getByRole("button", {
    name: "下载图片",
  });
  await name.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(downloadButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(name).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(
    "新名字-生涯战绩卡.png",
  );
  const path = await download.path();
  expect(path).not.toBeNull();
  const png = await readFile(path!);
  expect(Array.from(png.subarray(0, 8))).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1720);
  expect(png.byteLength).toBeLessThan(1_500_000);

  await page.getByRole("button", { name: "关闭" }).click();
  await expect(name).toBeHidden();
  await expect(shareTrigger).toBeFocused();
});
