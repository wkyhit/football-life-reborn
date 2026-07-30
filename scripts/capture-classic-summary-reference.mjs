import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory =
  `${root}/tests/visual/classic/reference/chromium-390x844`;
const referenceUrl = "https://football-life.pages.dev/";
const scenarios = [
  {
    captures: [
      "summary-attacker",
      "summary-national-team",
      "summary-title",
    ],
    id: "attacker",
    position: "中锋",
  },
  {
    captures: ["summary-goalkeeper"],
    id: "goalkeeper",
    position: "门将",
  },
  {
    captures: ["summary-no-title"],
    id: "no-title",
    policy: "one-transfer",
    position: "中锋",
    removeTitle: true,
  },
];
const requestedScenario = process.env.CLASSIC_SUMMARY_SCENARIO;
const browser = await chromium.launch();

try {
  await mkdir(outputDirectory, { recursive: true });

  for (const scenario of scenarios) {
    if (requestedScenario && scenario.id !== requestedScenario) {
      continue;
    }

    const context = await browser.newContext({
      colorScheme: "dark",
      deviceScaleFactor: 1,
      locale: "zh-CN",
      viewport: { height: 844, width: 390 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (handler, timeout, ...arguments_) =>
        nativeSetTimeout(
          handler,
          Math.min(Number(timeout) || 0, 20),
          ...arguments_,
        );
    });
    await page.goto(referenceUrl, { waitUntil: "networkidle" });
    await completeSetup(page, scenario.position);
    await completeCareer(page, scenario.policy ?? "first");
    await page.getByRole("button", { name: "保存战绩卡" }).waitFor();

    if (scenario.removeTitle) {
      await page.evaluate(() => {
        const sparkle = [...document.querySelectorAll("span")].find(
          (element) => element.textContent === "✨",
        );
        sparkle?.parentElement?.parentElement?.remove();
      });
    }

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
        }

        img[src^="/crests/"] {
          visibility: hidden !important;
        }
      `,
    });
    await page.waitForTimeout(100);

    for (const name of scenario.captures) {
      if (name === "summary-title") {
        await addSyntheticTitle(page);
      }

      await page.screenshot({
        animations: "disabled",
        caret: "hide",
        path: `${outputDirectory}/${name}.png`,
      });
    }

    process.stdout.write(
      `Reference ${scenario.position} summary:\n${await page.locator("body").innerText()}\n`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}

async function addSyntheticTitle(page) {
  await page.evaluate(() => {
    const existingSparkle = [
      ...document.querySelectorAll("span"),
    ].find((element) => element.textContent === "✨");
    existingSparkle?.parentElement?.parentElement?.remove();

    const honorHeading = [
      ...document.querySelectorAll("div"),
    ].find(
      (element) =>
        element.children.length === 0 &&
        element.textContent === "荣誉室",
    );
    const honorSection = honorHeading?.parentElement;

    if (honorSection?.parentElement === null || !honorSection) {
      throw new Error("Reference summary honor section is missing");
    }

    const titleSection = document.createElement("div");
    titleSection.className = "mt-3 space-y-1.5";
    titleSection.innerHTML = `
      <div class="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent px-3 py-1.5">
        <span class="text-sm">✨</span>
        <span class="text-[13px] font-black text-amber-300">一人一城</span>
        <span class="min-w-0 truncate text-[10px] text-amber-200/60">整个生涯只效力过一家俱乐部</span>
      </div>
    `;
    honorSection.parentElement.insertBefore(
      titleSection,
      honorSection,
    );
  });
}

async function completeSetup(page, position) {
  await page.getByRole("button", { name: "开始生涯" }).click();
  await page.getByRole("button", { name: /中国/ }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("姓名").fill("李");
  await page.getByLabel("号码").fill("10");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: position }).click();
  await page.getByRole("button", { name: "开始踢球" }).click();
}

async function completeCareer(page, policy) {
  let transferTaken = false;

  for (let index = 0; index < 24; index += 1) {
    const body = await page.locator("body").innerText();
    const decision = body.match(/\d+ 岁 · 决策\n([^\n]+)/);

    if (decision === null) {
      return;
    }

    const buttons = page.locator("#root button");
    const shouldTransfer =
      policy === "one-transfer" &&
      !transferTaken &&
      decision[1] === "转会窗" &&
      (await buttons.count()) > 1;
    await buttons.nth(shouldTransfer ? 1 : 0).click();
    transferTaken ||= shouldTransfer;
    await page.waitForTimeout(100);
  }

  throw new Error("Reference career did not retire within 24 choices");
}
