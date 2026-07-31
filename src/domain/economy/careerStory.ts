import type { PersonalAward } from "../awards";
import type { ClassicCareerState } from "../classicEngine";
import { CLASSIC_CATALOG } from "../catalog/classicCatalog";
import type {
  CareerSummary,
  CareerTrophy,
  RetirementReason,
} from "../summary";
import { createCareerEconomyProjection } from "./careerEconomyProjection";
import { formatYuan } from "./economyPolicy";
import {
  calculateSimulatedCareerPercentile,
  PERCENTILE_BENCHMARK_SAMPLE_COUNT,
} from "./percentileBenchmark";

export type CareerStory = {
  readonly chapters: readonly string[];
  readonly ending: {
    readonly description: string;
    readonly label: string;
    readonly reason: RetirementReason;
  };
  readonly highestHonor: string;
  readonly narrative: string;
  readonly simulatedPercentile: {
    readonly label: "模拟生涯分位";
    readonly maxOverall: number;
    readonly sampleCount:
      typeof PERCENTILE_BENCHMARK_SAMPLE_COUNT;
    readonly value: number;
  };
  readonly totalIncome: number;
};

const ENDING_COPY: Readonly<
  Record<
    RetirementReason,
    {
      readonly description: string;
      readonly label: string;
    }
  >
> = {
  no_offers: {
    description: "连续没有收到职业合同后结束生涯",
    label: "合同落幕",
  },
  retirement_age: {
    description: "走到职业生涯年龄终点后正式退役",
    label: "自然退役",
  },
  voluntary: {
    description: "在仍有选择时主动告别职业赛场",
    label: "主动退役",
  },
};

const TROPHY_PRIORITY = [
  "world_cup",
  "national_continental",
  "club_world_cup",
  "continental_primary",
  "continental_secondary",
  "league",
  "cup",
] as const satisfies readonly CareerTrophy[];

const TROPHY_LABEL: Readonly<
  Record<CareerTrophy, string>
> = {
  club_world_cup: "世俱杯冠军",
  continental_primary: "洲际顶级赛事冠军",
  continental_secondary: "洲际次级赛事冠军",
  cup: "国内杯赛冠军",
  league: "联赛冠军",
  national_continental: "洲际国家队赛事冠军",
  world_cup: "世界杯冠军",
};

const AWARD_PRIORITY = [
  "ballon_dor",
  "golden_boot",
  "golden_glove",
] as const satisfies readonly PersonalAward[];

const AWARD_LABEL: Readonly<
  Record<PersonalAward, string>
> = {
  ballon_dor: "金球奖",
  golden_boot: "金靴奖",
  golden_glove: "金手套",
};

export function createCareerStory(
  career: ClassicCareerState,
): CareerStory {
  const summary = career.summary;
  const endingReason = career.retirementReason;

  if (
    career.phase !== "summary" ||
    summary === null ||
    endingReason === null
  ) {
    throw new RangeError(
      "A completed Classic career is required for its story",
    );
  }

  const economy = createCareerEconomyProjection(career);
  const ending = Object.freeze({
    ...ENDING_COPY[endingReason],
    reason: endingReason,
  });
  const highestHonor = highestHonorLabel(career);
  const simulatedPercentile = Object.freeze({
    label: "模拟生涯分位" as const,
    maxOverall: summary.maxOverall,
    sampleCount: PERCENTILE_BENCHMARK_SAMPLE_COUNT,
    value: calculateSimulatedCareerPercentile(
      summary.maxOverall,
    ),
  });
  const chapters = Object.freeze([
    trajectoryNarrative(career, summary),
    `巅峰能力 ${summary.maxOverall}，${simulatedPercentile.label} P${simulatedPercentile.value}`,
    highestHonor === "暂无荣誉"
      ? "没有奖杯或个人奖项，但每个赛季都已写入记录"
      : `最高荣誉 ${highestHonor}`,
    ending.description,
    `合同生涯总收入 ${formatYuan(economy.totalIncome)}`,
  ]);
  const narrative = `${chapters.join("。")}。`;

  return Object.freeze({
    chapters,
    ending,
    highestHonor,
    narrative,
    simulatedPercentile,
    totalIncome: economy.totalIncome,
  });
}

function trajectoryNarrative(
  career: ClassicCareerState,
  summary: CareerSummary,
): string {
  const clubNames = summary.clubs.map(({ teamId }) => {
    const club = CLASSIC_CATALOG.clubById.get(teamId);

    if (club === undefined) {
      throw new RangeError(`Unknown Classic club: ${teamId}`);
    }

    return club.shortNameZh;
  });

  if (summary.hiddenTitles.includes("one_club_man")) {
    return `一人一城：${clubNames[0] ?? "同一支球队"}见证了全部 ${career.seasons.length} 个赛季`;
  }

  if (
    summary.hiddenTitles.includes("journeyman") ||
    clubNames.length >= 8
  ) {
    return `漂泊轨迹：先后效力 ${clubNames.length} 家俱乐部`;
  }

  if (clubNames.length <= 1) {
    return `俱乐部轨迹：${clubNames[0] ?? "自由身"}完成职业生涯`;
  }

  return `俱乐部轨迹：从 ${clubNames[0]} 到 ${clubNames.at(-1)}，共效力 ${clubNames.length} 家俱乐部`;
}

function highestHonorLabel(
  career: ClassicCareerState,
): string {
  const trophies = career.seasons.flatMap(
    (season) => season.trophies,
  );

  for (const trophy of TROPHY_PRIORITY) {
    if (trophies.includes(trophy)) {
      return TROPHY_LABEL[trophy];
    }
  }

  const awards = career.seasons.flatMap(
    (season) => season.awards,
  );

  for (const award of AWARD_PRIORITY) {
    if (awards.includes(award)) {
      return AWARD_LABEL[award];
    }
  }

  return "暂无荣誉";
}
