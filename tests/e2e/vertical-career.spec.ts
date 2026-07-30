import { expect, test, type Page } from "@playwright/test";

import {
  ACTIVE_CAREER_STORAGE_KEY,
  CAREER_SCHEMA_VERSION,
} from "../../src/storage/careerRepository";

const eventTitles = [
  "青训报价",
  "额外训练",
  "转会窗口",
  "赛季负荷",
  "外租邀请",
  "外租后的选择",
  "转会窗口",
  "外租邀请",
  "未获留队",
  "额外训练",
  "赛季负荷",
  "没有新的报价",
] as const;

const eventTypes = [
  "academy_offer",
  "loan_offer",
  "no_offers_retirement",
  "post_loan_not_retained",
  "post_loan_retained",
  "season_load",
  "training_extra",
  "transfer",
] as const;

type StoredEnvelope = {
  choiceLog: { eventType: string }[];
  contentVersion: string;
  schemaVersion: number;
  seed: string;
  state: {
    career: {
      age: number;
      retirementReason: string | null;
      seasons: unknown[];
      totals: {
        appearances: number;
        assists: number;
        goals: number;
      };
    };
    choiceLog: { eventType: string }[];
    phase: string;
    seed: string;
  };
};

test("a Chinese striker completes the deterministic vertical career", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });

  await page.goto("/?seed=phase-1%3Ae2e");

  await page.getByRole("button", { name: "开始生涯" }).click();
  await page.getByRole("button", { name: "中国" }).click();
  await page.getByRole("button", { name: "下一步" }).click();

  await page.getByRole("textbox", { name: "姓名" }).fill("林一鸣");
  await page.getByLabel("号码").fill("9");
  await page.getByRole("button", { name: "左脚" }).click();
  await reloadWithoutStateDrift(page, "填一下名字");
  await expect(page.getByRole("textbox", { name: "姓名" })).toHaveValue(
    "林一鸣",
  );
  await expect(page.getByRole("button", { name: "左脚" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "中锋" }).click();
  await page.getByRole("button", { name: "开始踢球" }).click();
  await reloadWithoutStateDrift(page, "青训报价");

  for (const [index, title] of eventTitles.entries()) {
    const decisionRegion = page.getByRole("region", { name: title });
    await expect(decisionRegion).toBeVisible();
    await decisionRegion.getByRole("button").first().click();

    if (title === "没有新的报价") {
      break;
    }

    await expect(
      page.getByRole("heading", { name: "两赛季小结" }),
    ).toBeVisible();

    if (index === 0) {
      await reloadWithoutStateDrift(page, "两赛季小结");
    }

    await page.getByRole("button", { name: "继续生涯" }).click();
  }

  await expect(
    page.getByRole("heading", { name: "职业生涯结束" }),
  ).toBeVisible();
  await expect(page.getByText("38 岁", { exact: true })).toBeVisible();
  await expect(
    page.getByText("连续两个赛季没有收到职业合同"),
  ).toBeVisible();
  await reloadWithoutStateDrift(page, "职业生涯结束");

  const envelope = await readEnvelope(page);
  expect(envelope).toMatchObject({
    contentVersion: "phase-1",
    schemaVersion: CAREER_SCHEMA_VERSION,
    seed: "phase-1:e2e",
    state: {
      career: {
        age: 38,
        retirementReason: "连续两个赛季没有收到职业合同",
      },
      phase: "retired",
      seed: "phase-1:e2e",
    },
  });
  expect(envelope.state.career.seasons).toHaveLength(22);
  expect(envelope.state.choiceLog).toHaveLength(12);
  expect(envelope.choiceLog).toEqual(envelope.state.choiceLog);
  expect(
    [...new Set(envelope.state.choiceLog.map((entry) => entry.eventType))]
      .sort(),
  ).toEqual([...eventTypes].sort());
  expect(envelope.state.career.totals.appearances).toBeGreaterThan(0);
  expect(envelope.state.career.totals.goals).toBeGreaterThan(0);
  expect(envelope.state.career.totals.assists).toBeGreaterThan(0);

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(browserErrors).toEqual([]);
});

async function reloadWithoutStateDrift(
  page: Page,
  heading: string,
): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.localStorage.getItem(key),
        ACTIVE_CAREER_STORAGE_KEY,
      ),
    )
    .not.toBeNull();

  const before = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_CAREER_STORAGE_KEY,
  );

  await page.reload();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();

  const after = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_CAREER_STORAGE_KEY,
  );
  expect(after).toBe(before);
}

async function readEnvelope(page: Page): Promise<StoredEnvelope> {
  return page.evaluate(
    (key) => {
      const raw = window.localStorage.getItem(key);

      if (raw === null) {
        throw new Error("Expected an active career envelope");
      }

      return JSON.parse(raw) as StoredEnvelope;
    },
    ACTIVE_CAREER_STORAGE_KEY,
  );
}
