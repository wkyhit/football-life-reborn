import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../src/styles.css";
import { CareerScreen } from "../../src/ui/classic/CareerScreen";
import type {
  CareerClubPresentation,
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "../../src/ui/classic/careerPresentation";

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

const fixtureName = new URLSearchParams(window.location.search).get(
  "fixture",
);
const fixture = createFixture(fixtureName);
const root = document.querySelector("#root");

if (root === null) {
  throw new Error("Visual fixture root is missing");
}

createRoot(root).render(
  <StrictMode>
    <CareerScreen onChoose={() => undefined} view={fixture} />
  </StrictMode>,
);

function createFixture(name: string | null): CareerPresentation {
  switch (name) {
    case "career-empty":
      return presentation({
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
      });
    case "career-simulating":
      return presentation({
        age: 18,
        club: TONGLIANG,
        marketValue: 540_000,
        options: [],
        overall: 57,
        panel: "simulating",
        seasons: [],
      });
    case "career-populated":
      return presentation({
        age: 16,
        club: TONGLIANG,
        marketValue: 150_000,
        options: [],
        overall: 50,
        panel: "simulating",
        seasons: [
          season(16, 50, 9, 0, 0),
        ],
      });
    case "career-deciding":
      return presentation({
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
      });
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
  const timeline = Array.from({ length: 24 }, (_, index) => {
    const age = 16 + index;
    return (
      byAge.get(age) ??
      (input.currentAge === age
        ? { age, kind: "current" as const }
        : { age, kind: "empty" as const })
    );
  });

  return {
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
    kind: "season",
    overall,
    stats: { appearances, assists, goals },
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
    id,
    role,
    roleTone,
    stars,
    subtitle: club.subtitle,
    title: `${action} ${club.name}`,
  };
}
