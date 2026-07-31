import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../src/styles.css";
import { ShareCardOverlay } from "../../src/features/share-card/ShareCardOverlay";
import { CareerScreen } from "../../src/ui/classic/CareerScreen";
import { SummaryScreen } from "../../src/ui/classic/SummaryScreen";
import type {
  CareerClubPresentation,
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "../../src/ui/classic/careerPresentation";
import type { SummaryPresentation } from "../../src/ui/classic/summaryPresentation";
import { EnhancedCareerScreen } from "../../src/ui/enhanced/career/EnhancedCareerScreen";
import { EnhancedSummaryScreen } from "../../src/ui/enhanced/summary/EnhancedSummaryScreen";

const TONGLIANG: CareerClubPresentation = {
  abbreviation: "CQT",
  color: "#E4002B",
  id: "chongqing-tongliang",
  name: "重庆铜梁龙",
  shortName: "铜梁龙",
  subtitle: "中甲 · 次级联赛",
};
const YATAI: CareerClubPresentation = {
  abbreviation: "CCY",
  color: "#F7941D",
  id: "changchun-yatai",
  name: "长春亚泰",
  shortName: "亚泰",
  subtitle: "中超",
};
const WEST_COAST: CareerClubPresentation = {
  abbreviation: "QWC",
  color: "#0F4C81",
  id: "qingdao-west-coast",
  name: "青岛西海岸",
  shortName: "西海岸",
  subtitle: "中超",
};
const MEIZHOU: CareerClubPresentation = {
  abbreviation: "MZH",
  color: "#FFD200",
  id: "meizhou-hakka",
  name: "梅州客家",
  shortName: "客家",
  subtitle: "中超",
};
const WUXI: CareerClubPresentation = {
  abbreviation: "WXW",
  color: "#0067B1",
  id: "wuxi-wugou",
  name: "无锡吴钩",
  shortName: "吴钩",
  subtitle: "中甲 · 次级联赛",
};
const HUBEI: CareerClubPresentation = {
  abbreviation: "HBI",
  color: "#00954C",
  id: "hubei-istar",
  name: "湖北青年星",
  shortName: "青年星",
  subtitle: "中甲 · 次级联赛",
};
const GONGFU: CareerClubPresentation = {
  abbreviation: "SJZ",
  color: "#F58220",
  id: "shijiazhuang",
  name: "石家庄功夫",
  shortName: "功夫",
  subtitle: "中甲 · 次级联赛",
};
const OKAYAMA: CareerClubPresentation = {
  abbreviation: "FGO",
  color: "#8E1D41",
  id: "fagiano-okayama",
  name: "冈山绿雉",
  shortName: "冈山",
  subtitle: "日职联",
};
const THREE_TOWNS: CareerClubPresentation = {
  abbreviation: "WHT",
  color: "#E4002B",
  id: "wuhan-three-towns",
  name: "武汉三镇",
  shortName: "三镇",
  subtitle: "中超",
};
const SHONAN: CareerClubPresentation = {
  abbreviation: "SBM",
  color: "#00A651",
  id: "shonan-bellmare",
  name: "湘南比马",
  shortName: "湘南",
  subtitle: "日职联",
};

type VisualFixture =
  | { readonly kind: "career"; readonly view: CareerPresentation }
  | { readonly kind: "share"; readonly view: SummaryPresentation }
  | { readonly kind: "summary"; readonly view: SummaryPresentation };

const fixtureName = new URLSearchParams(window.location.search).get(
  "fixture",
);
const uiMode = new URLSearchParams(window.location.search).get(
  "ui",
);
const fixture = createFixture(fixtureName);
const root = document.querySelector("#root");

if (root === null) {
  throw new Error("Visual fixture root is missing");
}

createRoot(root).render(
  <StrictMode>
    {fixture.kind === "career" && uiMode === "enhanced" ? (
      <EnhancedCareerScreen
        onChoose={() => true}
        view={fixture.view}
      />
    ) : fixture.kind === "career" ? (
      <CareerScreen
        onChoose={() => undefined}
        view={fixture.view}
      />
    ) : fixture.kind === "summary" &&
      uiMode === "enhanced" ? (
      <EnhancedSummaryScreen
        onRestart={() => undefined}
        onShare={() => undefined}
        view={fixture.view}
      />
    ) : fixture.kind === "summary" ? (
      <SummaryScreen
        onRestart={() => undefined}
        onShare={() => undefined}
        view={fixture.view}
      />
    ) : (
      <>
        <SummaryScreen
          onRestart={() => undefined}
          onShare={() => undefined}
          view={fixture.view}
        />
        <ShareCardOverlay
          onClose={() => undefined}
          qrPayload="https://football-life-reborn.test/"
          view={fixture.view}
        />
      </>
    )}
  </StrictMode>,
);

function createFixture(name: string | null): VisualFixture {
  switch (name) {
    case "career-empty":
      return {
        kind: "career",
        view: presentation({
          age: 16,
          club: null,
          currentAge: 16,
          marketValue: 100_000,
          options: [
            clubOption(TONGLIANG, "join:chongqing-tongliang", "替补", "danger", "★"),
            clubOption(YATAI, "join:changchun-yatai", "替补", "danger", "★"),
            clubOption(WEST_COAST, "join:qingdao-west-coast", "轮换主力", "positive", "—"),
          ],
          overall: 50,
          panel: "academy",
          seasons: [],
        }),
      };
    case "career-simulating":
      return {
        kind: "career",
        view: presentation({
          age: 18,
          club: TONGLIANG,
          marketValue: 540_000,
          options: [],
          overall: 57,
          panel: "simulating",
          seasons: [],
        }),
      };
    case "career-populated":
      return {
        kind: "career",
        view: presentation({
          age: 16,
          club: TONGLIANG,
          marketValue: 150_000,
          options: [],
          overall: 50,
          panel: "simulating",
          seasons: [
            season(16, 50, 9, 0, 0),
          ],
        }),
      };
    case "career-deciding":
      return {
        kind: "career",
        view: presentation({
          age: 18,
          club: TONGLIANG,
          currentAge: 18,
          marketValue: 540_000,
          options: [
            clubOption(MEIZHOU, "loan:meizhou-hakka", "绝对主力", "primary", "—", "租借去"),
            clubOption(WUXI, "loan:wuxi-wugou", "绝对主力", "primary", "—", "租借去"),
            clubOption(HUBEI, "loan:hubei-istar", "绝对主力", "primary", "—", "租借去"),
          ],
          overall: 57,
          panel: "loan",
          seasons: [
            season(16, 50, 9, 0, 0),
            season(17, 55, 6, 0, 0),
          ],
        }),
      };
    case "career-event-result": {
      const view = presentation({
        age: 24,
        club: YATAI,
        marketValue: 12_000_000,
        options: [],
        overall: 80,
        panel: "simulating",
        seasons: [
          season(22, 76, 31, 14, 7),
          season(23, 78, 34, 18, 9),
        ],
      });

      return {
        kind: "career",
        view: {
          ...view,
          panel: {
            age: 24,
            choiceLabel: "接受豪门邀约",
            contractResult: null,
            contractSummary:
              "实际合同：新合同生效 · 年薪 ¥1,200,000",
            kind: "event_result",
            summary: "转会成功；能力 +2",
            title: "豪门邀约结果",
            tone: "positive",
          },
        },
      };
    }
    case "career-milestone": {
      const view = presentation({
        age: 24,
        club: YATAI,
        marketValue: 12_000_000,
        options: [],
        overall: 80,
        panel: "simulating",
        seasons: [
          season(22, 76, 31, 14, 7),
          season(23, 78, 34, 18, 9),
          season(24, 80, 36, 21, 11),
        ],
      });

      return {
        kind: "career",
        view: {
          ...view,
          panel: {
            age: 24,
            club: YATAI,
            honors: [
              {
                kind: "trophy",
                label: "联赛冠军",
                scope: "club",
                trophy: "league",
              },
              {
                award: "golden_boot",
                kind: "award",
                label: "金靴奖",
              },
            ],
            kind: "milestone",
            nationalTournaments: [],
            statuses: [],
            tierChange: null,
            title: "赛季里程碑",
          },
        },
      };
    }
    case "summary-attacker":
    case "summary-national-team":
      return { kind: "summary", view: attackerSummary() };
    case "summary-title":
      return {
        kind: "summary",
        view: {
          ...attackerSummary(),
          titles: [
            {
              description: "整个生涯只效力过一家俱乐部",
              id: "one_club_man",
              label: "一人一城",
            },
          ],
        },
      };
    case "summary-goalkeeper":
      return { kind: "summary", view: goalkeeperSummary() };
    case "summary-no-title":
      return { kind: "summary", view: noTitleSummary() };
    case "share":
      return { kind: "share", view: attackerSummary() };
    default:
      throw new RangeError(`Unknown visual fixture: ${String(name)}`);
  }
}

function presentation(input: {
  readonly age: number;
  readonly club: CareerClubPresentation | null;
  readonly currentAge?: number;
  readonly marketValue: number;
  readonly options: readonly CareerDecisionOptionPresentation[];
  readonly overall: number;
  readonly panel: "academy" | "loan" | "simulating";
  readonly seasons: readonly CareerTimelineRowPresentation[];
}): CareerPresentation {
  const totals = input.seasons.reduce(
    (sum, row) =>
      row.kind === "season"
        ? {
            appearances: sum.appearances + row.stats.appearances,
            assists: sum.assists + row.stats.assists,
            goals: sum.goals + row.stats.goals,
            trophies: sum.trophies,
          }
        : sum,
    { appearances: 0, assists: 0, goals: 0, trophies: 0 },
  );
  const byAge = new Map(input.seasons.map((row) => [row.age, row]));
  const endAge = Math.max(
    39,
    input.currentAge ?? 16,
    ...input.seasons.map(({ age }) => age),
  );
  const timeline = Array.from({ length: endAge - 16 + 1 }, (_, index) => {
    const age = 16 + index;
    return (
      byAge.get(age) ??
      (input.currentAge === age
        ? { age, kind: "current" as const }
        : { age, kind: "empty" as const })
    );
  });

  return {
    economy: {
      annualSalary: input.club === null ? null : 20_000,
      totalIncome:
        input.seasons.filter(
          (row) => row.kind === "season",
        ).length * 20_000,
    },
    header: {
      age: input.age,
      club: input.club,
      countryCode: "CHN",
      countryFlag: "🇨🇳",
      marketValue: input.marketValue,
      number: 10,
      overall: input.overall,
      position: "中锋",
    },
    nationalTeam: {
      countryFlag: "🇨🇳",
      name: "中国国家队",
      stats: { appearances: 0, assists: 0, goals: 0 },
    },
    panel:
      input.panel === "simulating"
        ? { kind: "simulating" }
        : {
            age: input.currentAge ?? input.age,
            decisionId:
              input.panel === "academy"
                ? "fixture-academy"
                : "fixture-transfer",
            description:
              input.panel === "academy"
                ? "三家俱乐部想签下你。你的第一步走哪儿？"
                : "俱乐部想让你出去踢球攒经验。去哪家？",
            kind: "decision",
            options: input.options,
            title: input.panel === "academy" ? "青训报价" : "外租",
          },
    recentEventResult: null,
    timeline,
    totals,
  };
}

function season(
  age: number,
  overall: number,
  appearances: number,
  goals: number,
  assists: number,
): CareerTimelineRowPresentation {
  return {
    age,
    club: TONGLIANG,
    competitionTier: 1,
    economy: {
      annualSalary: 20_000,
      income: 20_000,
    },
    honors: [],
    kind: "season",
    marketValue: overall * 10_000,
    nationalTournaments: [],
    overall,
    stats: { appearances, assists, goals },
    story: null,
    statuses: [],
    tierChange: null,
  };
}

function clubOption(
  club: CareerClubPresentation,
  id: string,
  role: string,
  roleTone: CareerDecisionOptionPresentation["roleTone"],
  stars: string,
  action = "加盟",
): CareerDecisionOptionPresentation {
  return {
    club,
    consequences: [],
    contract: null,
    honorOpportunities: [],
    id,
    outcomePreviews: [],
    role,
    roleTone,
    stars,
    subtitle: club.subtitle,
    title: `${action} ${club.name}`,
  };
}

function attackerSummary(): SummaryPresentation {
  return {
    badge: "gold",
    clubs: [
      {
        club: GONGFU,
        stats: "702 场 · 377 球 · 149 助",
        trophyCount: 2,
      },
      {
        club: OKAYAMA,
        stats: "62 场 · 13 球 · 5 助",
        trophyCount: 0,
      },
    ],
    honors: [
      {
        count: 1,
        id: "trophy:中甲冠军",
        identity: "league",
        kind: "trophy",
        label: "中甲冠军",
      },
      {
        count: 1,
        id: "trophy:中国足协杯",
        identity: "cup",
        kind: "trophy",
        label: "中国足协杯",
      },
    ],
    identity: {
      country: "中国",
      name: "李",
      number: 10,
      position: "中锋",
      preferredFoot: "未记录",
    },
    maxMarketValue: 57_000_000,
    maxOverall: 86,
    metrics: [
      { label: "出场", value: 873 },
      { label: "进球", value: 414 },
      { label: "助攻", value: 163 },
    ],
    nationalTeam: {
      bestTournament: "亚洲杯八强",
      name: "中国国家队",
      stats: "109 场 · 24 球 · 9 助",
    },
    seasonCount: 22,
    seed: "ms74jclp-1yj5if",
    story: fixtureStory(86, 12_800_000, "中甲冠军"),
    titles: [],
  };
}

function goalkeeperSummary(): SummaryPresentation {
  return {
    badge: "gold",
    clubs: [
      {
        club: HUBEI,
        stats: "699 场 · 228 零封",
        trophyCount: 1,
      },
    ],
    honors: [
      {
        count: 1,
        id: "trophy:中甲冠军",
        identity: "league",
        kind: "trophy",
        label: "中甲冠军",
      },
    ],
    identity: {
      country: "中国",
      name: "李",
      number: 10,
      position: "门将",
      preferredFoot: "未记录",
    },
    maxMarketValue: 26_000_000,
    maxOverall: 82,
    metrics: [
      { label: "出场", value: 795 },
      { label: "零封", value: 254 },
      { label: "失球", value: 649 },
    ],
    nationalTeam: {
      bestTournament: "世界杯小组赛 · 亚洲杯四强",
      name: "中国国家队",
      stats: "96 场 · 26 零封",
    },
    seasonCount: 24,
    seed: "ms74faaw-18h9kt",
    story: fixtureStory(82, 8_600_000, "中甲冠军"),
    titles: [
      {
        description: "整个生涯只效力过一家俱乐部",
        id: "one_club_man",
        label: "一人一城",
      },
    ],
  };
}

function noTitleSummary(): SummaryPresentation {
  return {
    badge: "silver",
    clubs: [
      {
        club: WEST_COAST,
        stats: "57 场 · 7 球 · 2 助",
        trophyCount: 0,
      },
      {
        club: THREE_TOWNS,
        stats: "653 场 · 209 球 · 73 助",
        trophyCount: 2,
      },
      {
        club: SHONAN,
        stats: "63 场 · 12 球 · 4 助",
        trophyCount: 0,
      },
    ],
    honors: [
      {
        count: 2,
        id: "trophy:中国足协杯",
        identity: "cup",
        kind: "trophy",
        label: "中国足协杯",
      },
    ],
    identity: {
      country: "中国",
      name: "李",
      number: 10,
      position: "中锋",
      preferredFoot: "未记录",
    },
    maxMarketValue: 5_100_000,
    maxOverall: 75,
    metrics: [
      { label: "出场", value: 827 },
      { label: "进球", value: 235 },
      { label: "助攻", value: 81 },
    ],
    nationalTeam: {
      bestTournament: "世界杯小组赛 · 亚洲杯小组赛",
      name: "中国国家队",
      stats: "54 场 · 7 球 · 2 助",
    },
    seasonCount: 22,
    seed: "ms74ggo4-radcb7",
    story: fixtureStory(
      75,
      3_200_000,
      "中国足协杯冠军",
    ),
    titles: [],
  };
}

function fixtureStory(
  maxOverall: number,
  totalIncome: number,
  highestHonor: string,
): SummaryPresentation["story"] {
  const income = `¥${totalIncome.toLocaleString("en-US")}`;
  const chapters = [
    "俱乐部轨迹已经写入记录",
    `巅峰能力 ${maxOverall}，模拟生涯分位 P50`,
    `最高荣誉 ${highestHonor}`,
    "连续没有收到职业合同后结束生涯",
    `合同生涯总收入 ${income}`,
  ];

  return {
    chapters,
    ending: {
      description: "连续没有收到职业合同后结束生涯",
      label: "合同落幕",
      reason: "no_offers",
    },
    highestHonor,
    narrative: `${chapters.join("。")}。`,
    simulatedPercentile: {
      label: "模拟生涯分位",
      maxOverall,
      sampleCount: 10_000,
      value: 50,
    },
    totalIncome,
  };
}
