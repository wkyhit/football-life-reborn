import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SummaryPresentation } from "./summaryPresentation";
import { SummaryScreen } from "./SummaryScreen";

describe("SummaryScreen", () => {
  it("keeps long names and dense honor and club lists inside the scroll region", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const onShare = vi.fn();
    const view = denseSummary();
    const { container } = render(
      <SummaryScreen
        onRestart={onRestart}
        onShare={onShare}
        view={view}
      />,
    );

    const name = screen.getByRole("heading", {
      name: "八字名字正好上限",
    });
    expect(name).toHaveClass("truncate");
    expect(
      container.querySelector("[data-classic-summary-scroll]"),
    ).toHaveClass("overflow-y-auto");
    expect(
      screen.getByRole("region", { name: "荣誉室" }).children[1]
        ?.children,
    ).toHaveLength(20);
    expect(
      screen.getByRole("region", { name: "效力过" }).children[1]
        ?.children,
    ).toHaveLength(12);

    await user.click(screen.getByRole("button", { name: "再来一局" }));
    await user.click(
      screen.getByRole("button", { name: "保存战绩卡" }),
    );
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });
});

function denseSummary(): SummaryPresentation {
  return {
    badge: "elite",
    clubs: Array.from({ length: 12 }, (_, index) => ({
      club: {
        abbreviation: `C${index}`,
        color: "#065f46",
        id: `club-${index}`,
        name: `很长的俱乐部名称${index}`,
        shortName: `俱乐部${index}`,
        subtitle: "测试联赛",
      },
      stats: `${100 + index} 场 · ${index} 球 · ${index} 助`,
      trophyCount: index,
    })),
    honors: Array.from({ length: 20 }, (_, index) => ({
      count: index + 1,
      id: `honor-${index}`,
      kind: "trophy" as const,
      label: `荣誉${index}`,
    })),
    identity: {
      country: "中国",
      name: "八字名字正好上限",
      number: 10,
      position: "中锋",
    },
    maxMarketValue: 150_000_000,
    maxOverall: 97,
    metrics: [
      { label: "出场", value: 1_100 },
      { label: "进球", value: 600 },
      { label: "助攻", value: 300 },
    ],
    nationalTeam: {
      bestTournament: "世界杯冠军 · 亚洲杯冠军",
      name: "中国国家队",
      stats: "180 场 · 80 球 · 40 助",
    },
    seasonCount: 28,
    seed: "phase-3:dense-summary",
    titles: [
      {
        description: "这是一条需要被截断的超长特殊称号说明文字",
        id: "king_of_football",
        label: "球王",
      },
    ],
  };
}
