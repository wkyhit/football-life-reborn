import { expect, test, type Page } from "@playwright/test";

import { replayClassicCareer } from "../../src/domain/classicEngine";
import type {
  ClassicChoiceLogEntry,
  ClassicIdentity,
} from "../../src/domain/classicEngine";
import type { PacingMode } from "../../src/domain/pacing";
import { ACTIVE_CAREER_STORAGE_KEY } from "../../src/storage/careerRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  CLASSIC_SESSION_SCHEMA_VERSION,
} from "../../src/storage/classicSessionRepository";

type StoredClassicSession = {
  readonly choiceLog: readonly ClassicChoiceLogEntry[];
  readonly contentVersion: string;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly schemaVersion: number;
  readonly seed: string;
};

test("a deterministic Classic period commits before its visual reveal", async ({
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

  await page.goto("/?seed=phase-3%3Ae2e");
  await page.getByRole("button", { name: "开始生涯" }).click();
  await page.getByRole("button", { name: "中国" }).click();
  await page.getByRole("button", { name: "下一步" }).click();

  await page.getByRole("textbox", { name: "姓名" }).fill("林一鸣");
  await page.getByLabel("号码").fill("9");
  await page.getByRole("button", { name: "左脚" }).click();
  await reloadWithoutStateDrift(
    page,
    ACTIVE_CAREER_STORAGE_KEY,
    "填一下名字",
  );
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
  await reloadWithoutStateDrift(
    page,
    ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
    "青训报价",
  );

  const academyOptions = page.getByRole("button", {
    name: /^加盟 /,
  });
  await expect(academyOptions).toHaveCount(3);
  await academyOptions.first().click();
  await expect(page.getByText("赛季进行中…")).toBeVisible();

  await expect
    .poll(async () => {
      const session = await readSession(page);
      return session.choiceLog.length;
    })
    .toBe(1);

  const session = await readSession(page);
  const rawBeforeReload = await readRaw(
    page,
    ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  );
  const committed = replayClassicCareer({
    choices: session.choiceLog,
    contentVersion: session.contentVersion,
    identity: session.identity,
    mode: session.mode,
    seed: session.seed,
  });

  expect(session).toMatchObject({
    contentVersion: "2026-07-30-classic-v1",
    identity: {
      lastName: "林一鸣",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
    seed: "phase-3:e2e",
  });
  expect(rawBeforeReload).not.toContain('"state"');
  expect(rawBeforeReload).not.toContain('"rngState"');
  expect(rawBeforeReload).not.toContain('"seasons"');
  expect(committed.playerAge).toBe(18);
  expect(committed.seasons).toHaveLength(2);
  expect(committed.currentDecision).not.toBeNull();

  await page.reload();
  await expect(
    page.locator("[data-classic-career-panel] button").first(),
  ).toBeVisible();
  await expect(
    page.locator("[data-classic-career-header]"),
  ).toContainText("18");
  expect(
    await readRaw(page, ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
  ).toBe(rawBeforeReload);

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
  key: string,
  heading: string,
): Promise<void> {
  await expect.poll(() => readRawOrNull(page, key)).not.toBeNull();
  const before = await readRaw(page, key);

  await page.reload();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();

  expect(await readRaw(page, key)).toBe(before);
}

async function readSession(page: Page): Promise<StoredClassicSession> {
  return JSON.parse(
    await readRaw(page, ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
  ) as StoredClassicSession;
}

async function readRaw(page: Page, key: string): Promise<string> {
  const raw = await readRawOrNull(page, key);

  if (raw === null) {
    throw new Error(`Expected local storage value for ${key}`);
  }

  return raw;
}

async function readRawOrNull(
  page: Page,
  key: string,
): Promise<string | null> {
  return page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    key,
  );
}
