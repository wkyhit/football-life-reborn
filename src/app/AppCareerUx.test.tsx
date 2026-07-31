import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CLASSIC_GOLDEN_FIXTURES } from "../../tests/golden/fixtures";
import { replayClassicCareer } from "../domain/classicEngine";
import { ACTIVE_ARCHIVE_ID_STORAGE_KEY } from "../storage/activeArchive";
import { createClassicSessionRepository } from "../storage/classicSessionRepository";
import { App } from "./App";

describe("Issue 25 real App career regression", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/?ui=enhanced&seed=issue-25%3Areal-app-goalkeeper",
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("drives a goalkeeper from clean setup into the complete career workbench", async () => {
    const user = userEvent.setup();

    const rendered = render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "开始普通生涯",
      }),
    );
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: /^门将/ }));
    await user.click(screen.getByRole("button", { name: "开始踢球" }));
    await waitFor(() => {
      expect(
        localStorage.getItem(ACTIVE_ARCHIVE_ID_STORAGE_KEY),
      ).not.toBeNull();
    });

    const table = await screen.findByRole("table", {
      name: "生涯赛季数据",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "年龄",
      "俱乐部",
      "能力",
      "出场",
      "零封",
      "失球",
    ]);
    expect(
      table.querySelector('[role="row"][aria-current="step"]'),
    ).toHaveAttribute("data-career-season-row", "16");

    const market = document.querySelector<HTMLDetailsElement>(
      '[data-enhanced-exact-money="身价"]',
    );

    expect(market).not.toBeNull();
    const marketSummary = market!.querySelector("summary");

    expect(marketSummary).toHaveAccessibleName(
      "身价：€100,000",
    );
    await user.click(marketSummary!);
    expect(market).toHaveAttribute("open");
    expect(
      market!.querySelector("[data-enhanced-exact-money-value]"),
    ).toBeVisible();
    await user.click(marketSummary!);
    expect(market).not.toHaveAttribute("open");

    const firstOffer = screen.getAllByRole("button", {
      name: /^加盟 /,
    })[0]!;
    const firstOfferTitle = within(firstOffer).getByText(
      /^加盟 /,
    ).textContent!;

    expect(within(firstOffer).getByText(/年薪/)).toBeVisible();
    expect(within(firstOffer).getByText(/预计角色/)).toBeVisible();
    expect(
      within(firstOffer).getByRole("img", {
        name: /俱乐部星级：\d 星/,
      }),
    ).toBeVisible();

    await user.click(firstOffer);
    const selected = await screen.findByRole("button", {
      name: /^加盟 /,
      pressed: true,
    });

    expect(selected).toBeDisabled();
    expect(screen.getByText("赛季进行中")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          table.querySelector(
            '[role="row"][aria-current="step"]',
          ),
        ).toHaveAttribute("data-career-season-row", "18");
      },
      { timeout: 2_500 },
    );

    const firstSeason = table.querySelector<HTMLElement>(
      '[data-career-season-row="16"]',
    );
    expect(firstSeason).not.toBeNull();
    openSeasonDetails(firstSeason!);
    expect(within(firstSeason!).getByText("年度选择")).toBeVisible();
    expect(firstSeason).toHaveTextContent(firstOfferTitle);
    expect(firstSeason).toHaveTextContent(/实际合同：/);

    rendered.unmount();
    const resumed = render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "继续上次生涯",
      }),
    );
    const restoredTable = await screen.findByRole("table", {
      name: "生涯赛季数据",
    });

    expect(
      within(restoredTable)
        .getAllByRole("columnheader")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "年龄",
      "俱乐部",
      "能力",
      "出场",
      "零封",
      "失球",
    ]);
    const restoredSeason = restoredTable.querySelector<HTMLElement>(
      '[data-career-season-row="16"]',
    );

    expect(restoredSeason).not.toBeNull();
    openSeasonDetails(restoredSeason!);
    expect(restoredSeason).toHaveTextContent(firstOfferTitle);

    resumed.unmount();
    const restoredSeed = new URLSearchParams(
      window.location.search,
    ).get("seed");

    expect(restoredSeed).not.toBeNull();
    window.history.replaceState(
      {},
      "",
      `/?ui=classic&seed=${encodeURIComponent(restoredSeed!)}`,
    );
    render(<App />);
    const classicHeader = document.querySelector<HTMLElement>(
      "[data-classic-career-header]",
    );

    expect(classicHeader).not.toBeNull();
    expect(within(classicHeader!).getByText("进球")).toBeVisible();
    expect(within(classicHeader!).getByText("助攻")).toBeVisible();
    expect(
      document.querySelector("[data-enhanced-exact-money]"),
    ).toBeNull();
    expect(
      screen.queryByRole("table", { name: "生涯赛季数据" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a real event choice beside its result until acknowledgement and records it once", async () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "special-journeyman",
    );

    if (fixture === undefined) {
      throw new Error("Missing event-transfer golden fixture");
    }

    const choiceIndex = fixture.choices.findIndex(
      ({ optionId }) => optionId === "join:eibar",
    );
    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, choiceIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const eventAge = career.currentDecision?.age;

    expect(eventAge).toBeDefined();
    expect(
      createClassicSessionRepository(localStorage).save(career),
    ).toEqual({ ok: true });
    window.history.replaceState(
      {},
      "",
      `/?ui=enhanced&seed=${encodeURIComponent(career.seed)}`,
    );
    const user = userEvent.setup();

    const rendered = render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "继续上次生涯",
      }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: /加盟 埃瓦尔/,
      }),
    );

    const rail = document.querySelector<HTMLElement>(
      "[data-enhanced-decision-rail]",
    );
    const selected = await screen.findByRole("button", {
      name: /加盟 埃瓦尔/,
      pressed: true,
    });
    const confirm = screen.getByRole("button", {
      name: "确认结果",
    });

    expect(rail).not.toBeNull();
    expect(rail).not.toHaveAttribute("aria-busy");
    expect(selected).toBeDisabled();
    expect(confirm).toHaveFocus();
    expect(
      rail!.querySelector("[data-career-event-contract-result]"),
    ).toHaveTextContent(/^实际合同：新合同生效 · 年薪 ¥[\d,]+$/);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1_650));
    });
    expect(screen.getByRole("button", { name: "确认结果" })).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /加盟 埃瓦尔/,
        pressed: true,
      }),
    ).toBeVisible();

    await user.click(confirm);
    await waitFor(
      () => {
        expect(
          screen.queryByRole("button", { name: "确认结果" }),
        ).not.toBeInTheDocument();
        expect(
          document.querySelector(
            `[data-career-season-row="${eventAge}"] details`,
          ),
        ).not.toBeNull();
      },
      { timeout: 1_500 },
    );

    const season = document.querySelector<HTMLElement>(
      `[data-career-season-row="${eventAge}"]`,
    );
    expect(season).not.toBeNull();
    openSeasonDetails(season!);
    expect(within(season!).getByText("年度选择")).toBeVisible();
    const story = season!.querySelector(
      "[data-enhanced-season-choice-story]",
    );

    expect(story).toHaveTextContent("加盟 埃瓦尔");
    expect(story).toHaveTextContent("结果：");
    expect(
      season!.querySelectorAll(
        "[data-enhanced-season-choice-story]",
      ),
    ).toHaveLength(1);
    expect(
      within(season!).getByText(/实际合同：新合同生效/),
    ).toBeVisible();
    const saved = createClassicSessionRepository(localStorage).load();

    expect(saved.status).toBe("ready");
    if (saved.status === "ready") {
      expect(saved.state.choiceLog).toHaveLength(
        career.choiceLog.length + 1,
      );
      expect(saved.state.choiceLog.at(-1)).toMatchObject({
        optionId: "join:eibar",
      });
    }

    rendered.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "继续上次生涯",
      }),
    );
    const restoredSeason = document.querySelector<HTMLElement>(
      `[data-career-season-row="${eventAge}"]`,
    );
    expect(restoredSeason).not.toBeNull();
    openSeasonDetails(restoredSeason!);
    expect(
      restoredSeason!.querySelector(
        "[data-enhanced-season-choice-story]",
      ),
    ).toHaveTextContent("加盟 埃瓦尔");
    expect(
      restoredSeason!.querySelectorAll(
        "[data-enhanced-season-choice-story]",
      ),
    ).toHaveLength(1);
    expect(
      within(restoredSeason!).getByText(/实际合同：新合同生效/),
    ).toBeVisible();
  });
});

function openSeasonDetails(season: HTMLElement): void {
  const seasonSummary = season.querySelector(
    'details[data-enhanced-season-row="season"] > summary',
  );

  if (seasonSummary === null) {
    throw new Error("Expected collapsed season summary");
  }

  fireEvent.click(seasonSummary);
  const storySummary = season.querySelector(
    "[data-enhanced-season-details] > summary",
  );

  if (storySummary === null) {
    throw new Error("Expected collapsed season story summary");
  }

  fireEvent.click(storySummary);
}
