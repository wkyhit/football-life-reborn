import { expect, test } from "@playwright/test";

import {
  playClassicCareer,
  startClassicCareer,
} from "../../src/domain/classicEngine";
import { deriveDailyChallenge } from "../../src/features/challenges/daily";
import { CLASSIC_SESSION_SCHEMA_VERSION } from "../../src/storage/classicSessionRepository";
import { ACTIVE_CLASSIC_SESSION_STORAGE_KEY } from "../../src/storage/classicSessionRepository";

const daily = deriveDailyChallenge({
  calendarDate: "2026-07-30",
  family: "one_club",
  version: 1,
});

test("selects a daily challenge and explains its live progress", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "开始一人一城挑战" })
    .click();
  await page.getByRole("button", { name: "中国" }).click();
  await page
    .getByRole("button", { name: "下一步" })
    .click();
  await page.getByLabel("姓名").fill("李");
  await page
    .getByRole("button", { name: "下一步" })
    .click();
  await page
    .getByRole("button", { name: /^中锋 ST/ })
    .click();
  await page
    .getByRole("button", { name: "开始踢球" })
    .click();

  await expect(
    page.getByRole("region", {
      name: "一人一城挑战进度",
    }),
  ).toContainText("挑战进行中");
});

test("shows completion, copies the replay link, and labels the challenge card", async ({
  page,
}) => {
  const career = playClassicCareer({
    identity: {
      lastName: "李",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 10,
    },
    mode: "normal",
    seed: daily.seed,
  });
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text: string) {
            window.sessionStorage.setItem(
              "challenge-replay-copy",
              text,
            );
            return Promise.resolve();
          },
        },
      });
    },
    {
      key: ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      value: storedSession(career),
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "继续上次生涯" })
    .click();

  await expect(
    page.getByRole("region", {
      name: "一人一城挑战进度",
    }),
  ).toContainText("挑战完成");
  await page
    .getByRole("button", {
      name: "复制挑战回放链接",
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "回放链接已复制",
  );
  const copied = await page.evaluate(() =>
    window.sessionStorage.getItem("challenge-replay-copy"),
  );
  expect(copied).toContain("#r=");
  expect(copied!.length).toBeLessThanOrEqual(1_800);

  await page
    .getByRole("button", { name: "保存战绩卡" })
    .click();
  await expect(
    page.getByText("一人一城 · 2026-07-30"),
  ).toBeVisible();
});

test("does not add challenge controls to an ordinary career", async ({
  page,
}) => {
  const career = startClassicCareer({
    identity: {
      lastName: "普通",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed: "ordinary-career",
  });
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      value: storedSession(career),
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "继续上次生涯" })
    .click();

  await expect(
    page.getByRole("region", {
      name: /挑战进度/,
    }),
  ).toHaveCount(0);
});

function storedSession(
  career: ReturnType<typeof startClassicCareer>,
): string {
  return JSON.stringify({
    choiceLog: career.choiceLog,
    contentVersion: career.contentVersion,
    identity: career.identity,
    mode: career.mode,
    schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
    seed: career.seed,
  });
}
