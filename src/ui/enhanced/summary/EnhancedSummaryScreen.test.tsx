import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SummaryPresentation } from "../../classic/summaryPresentation";
import { HONOR_IDENTITY_KEYS } from "../../shared/HonorIdentity";
import { EnhancedSummaryScreen } from "./EnhancedSummaryScreen";

describe("EnhancedSummaryScreen", () => {
  afterEach(cleanup);

  it("keeps the final club, honor, and Seed record reachable above fixed actions", async () => {
    const onRestart = vi.fn();
    const onStartNewCareer = vi.fn();
    const onShare = vi.fn();
    const { container } = render(
      <EnhancedSummaryScreen
        onRestart={onRestart}
        onShare={onShare}
        onStartNewCareer={onStartNewCareer}
        view={summaryView()}
      />,
    );

    const shell = container.querySelector<HTMLElement>(
      "[data-enhanced-summary-screen]",
    );
    const scrollRegion = container.querySelector<HTMLElement>(
      "[data-enhanced-summary-scroll]",
    );
    const lastRecord = container.querySelector<HTMLElement>(
      "[data-summary-last-record]",
    );
    const fixedActions = container.querySelector<HTMLElement>(
      "[data-enhanced-summary-footer]",
    );

    expect(shell).toHaveClass("h-dvh", "overflow-hidden");
    expect(scrollRegion).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "scroll-pb-6",
    );
    expect(scrollRegion).toContainElement(
      screen.getByText("终章俱乐部"),
    );
    expect(scrollRegion).toContainElement(
      screen.getByText("联赛冠军"),
    );
    expect(scrollRegion).toContainElement(
      screen.getByText("issue-23:short-summary"),
    );
    expect(lastRecord).toHaveClass("scroll-mb-6");
    expect(scrollRegion).toContainElement(lastRecord);
    expect(fixedActions).not.toBeNull();
    expect(scrollRegion).not.toContainElement(fixedActions);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "同 Seed 重开" }),
    );
    await user.click(
      screen.getByRole("button", { name: "新 Seed 新人生" }),
    );
    await user.click(
      screen.getByRole("button", { name: "保存战绩卡" }),
    );
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onStartNewCareer).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });
});

function summaryView(): SummaryPresentation {
  return {
    badge: "elite",
    clubs: [
      {
        club: {
          abbreviation: "FIN",
          color: "#065f46",
          id: "final-club",
          name: "终章俱乐部",
          shortName: "终章俱乐部",
          subtitle: "测试联赛",
        },
        stats: "120 场 · 40 球 · 20 助",
        trophyCount: 1,
      },
    ],
    honors: [
      {
        count: 1,
        id: "league-title",
        identity: HONOR_IDENTITY_KEYS[0]!,
        kind: "trophy",
        label: "联赛冠军",
      },
    ],
    identity: {
      country: "中国",
      name: "短屏测试球员",
      number: 10,
      position: "中锋",
    },
    maxMarketValue: 150_000_000,
    maxOverall: 94,
    metrics: [
      { label: "出场", value: 500 },
      { label: "进球", value: 200 },
      { label: "助攻", value: 100 },
    ],
    nationalTeam: null,
    seasonCount: 24,
    seed: "issue-23:short-summary",
    story: {
      chapters: ["联赛冠军", "主动告别职业赛场"],
      ending: {
        description: "在仍有选择时主动告别职业赛场",
        label: "主动退役",
        reason: "voluntary",
      },
      highestHonor: "联赛冠军",
      narrative: "赢得联赛冠军后主动告别职业赛场。",
      simulatedPercentile: {
        label: "模拟生涯分位",
        maxOverall: 94,
        sampleCount: 10_000,
        value: 95,
      },
      totalIncome: 150_000_000,
    },
    titles: [],
  };
}
