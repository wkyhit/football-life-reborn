import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { playClassicCareer } from "../../domain/classicEngine";
import { deriveDailyChallenge } from "../../features/challenges/daily";
import { evaluateChallengeProgress } from "../../features/challenges/progress";
import { SummaryScreen } from "./SummaryScreen";
import {
  createSummaryPresentation,
  type SummaryPresentation,
} from "./summaryPresentation";
import { HONOR_IDENTITY_KEYS } from "../shared/HonorIdentity";

describe("SummaryScreen", () => {
  afterEach(cleanup);

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
    expect(
      container.querySelectorAll(
        '[data-honor-art="local-svg"]',
      ),
    ).toHaveLength(20);
    expect(container).not.toHaveTextContent(/[🏆🥇]/u);

    await user.click(
      screen.getByRole("button", { name: "再来一局" }),
    );
    await user.click(
      screen.getByRole("button", { name: "保存战绩卡" }),
    );
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });
});

describe("Classic summary challenge extension", () => {
  afterEach(cleanup);

  it("shows challenge completion and copies its replay while ordinary summaries stay unchanged", async () => {
    const daily = deriveDailyChallenge({
      calendarDate: "2026-07-30",
      family: "one_club",
      version: 1,
    });
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
    const view = createSummaryPresentation(career);
    const onCopyReplay = vi.fn();
    const common = {
      onRestart: vi.fn(),
      onShare: vi.fn(),
      view,
    };
    const { rerender } = render(
      <SummaryScreen
        {...common}
        challenge={{
          daily,
          progress: evaluateChallengeProgress(
            daily.family,
            career,
          ),
          replayUrl: "https://example.test/#r=replay",
        }}
        onCopyReplay={onCopyReplay}
        replayCopyMessage="回放链接已复制"
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "一人一城挑战进度",
      }),
    ).toHaveTextContent("挑战完成");
    expect(
      screen.getByText("回放链接已复制"),
    ).toHaveAttribute("role", "status");

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: "复制挑战回放链接",
      }),
    );
    expect(onCopyReplay).toHaveBeenCalledOnce();

    rerender(<SummaryScreen {...common} />);
    expect(
      screen.queryByRole("button", {
        name: "复制挑战回放链接",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "保存战绩卡",
      }),
    ).toBeInTheDocument();
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
      identity:
        HONOR_IDENTITY_KEYS[index % HONOR_IDENTITY_KEYS.length]!,
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
    story: {
      chapters: [
        "一人一城",
        "巅峰能力 97",
        "最高荣誉 世界杯冠军",
        "主动告别职业赛场",
        "合同生涯总收入 ¥150,000,000",
      ],
      ending: {
        description: "在仍有选择时主动告别职业赛场",
        label: "主动退役",
        reason: "voluntary",
      },
      highestHonor: "世界杯冠军",
      narrative:
        "一人一城。巅峰能力 97。最高荣誉 世界杯冠军。主动告别职业赛场。合同生涯总收入 ¥150,000,000。",
      simulatedPercentile: {
        label: "模拟生涯分位",
        maxOverall: 97,
        sampleCount: 10_000,
        value: 99,
      },
      totalIncome: 150_000_000,
    },
    titles: [
      {
        description: "这是一条需要被截断的超长特殊称号说明文字",
        id: "king_of_football",
        label: "球王",
      },
    ],
  };
}
