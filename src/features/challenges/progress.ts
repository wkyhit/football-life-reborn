import type {
  ClassicCareerState,
  ClassicChoiceLogEntry,
} from "../../domain/classicEngine";
import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";
import type { NationalTournamentRecord } from "../../domain/nationalTeam";
import type { CareerTrophy } from "../../domain/summary";
import {
  challengeDefinition,
  type ChallengeDefinition,
  type ChallengeRuleDefinition,
} from "./catalog";
import type { DailyChallengeFamily } from "./daily";

export type ChallengeProgressStatus =
  | "active"
  | "completed"
  | "failed";

export type ChallengeRuleState =
  | "failed"
  | "met"
  | "pending";

export type ChallengeRuleProgress = {
  readonly current: number;
  readonly detail: string;
  readonly id: string;
  readonly label: string;
  readonly state: ChallengeRuleState;
  readonly target: number;
};

export type ChallengeProgress = {
  readonly family: DailyChallengeFamily;
  readonly message: string;
  readonly rules: readonly ChallengeRuleProgress[];
  readonly status: ChallengeProgressStatus;
  readonly title: string;
};

const ELITE_GOALKEEPER_TROPHIES: ReadonlySet<CareerTrophy> =
  new Set([
    "continental_primary",
    "continental_secondary",
    "club_world_cup",
    "national_continental",
    "world_cup",
  ]);

export function evaluateChallengeProgress(
  family: DailyChallengeFamily,
  career: ClassicCareerState,
): ChallengeProgress {
  switch (family) {
    case "one_club":
      return evaluateOneClub(career);
    case "asian_glory":
      return evaluateAsianGlory(career);
    case "goalkeeper_legend":
      return evaluateGoalkeeperLegend(career);
  }
}

function evaluateOneClub(
  career: ClassicCareerState,
): ChallengeProgress {
  const definition = challengeDefinition("one_club");
  const terminal = career.phase === "summary";
  const academyChoice = career.choiceLog.find(
    (choice) => choice.decisionType === "academy_offer",
  );
  const academyClubId =
    academyChoice === undefined
      ? null
      : permanentClubId(academyChoice);
  const validAcademy =
    academyClubId !== null &&
    CLASSIC_CATALOG.clubById.has(academyClubId);
  const permanentClubs = new Set(
    career.choiceLog
      .filter(
        (choice) => choice.decisionType !== "loan_offer",
      )
      .map(permanentClubId)
      .filter((clubId): clubId is string => clubId !== null),
  );
  const clubCount = permanentClubs.size;
  const seasons = career.seasons.length;

  return progress(definition, [
    measuredRule(
      definition.rules[0]!,
      validAcademy
        ? "met"
        : terminal
          ? "failed"
          : "pending",
      validAcademy ? 1 : 0,
      1,
      validAcademy
        ? "已从青训邀请加入首家俱乐部。"
        : "等待从青训邀请选择首家俱乐部。",
    ),
    measuredRule(
      definition.rules[1]!,
      clubCount > 1
        ? "failed"
        : clubCount === 1
          ? "met"
          : terminal
            ? "failed"
            : "pending",
      clubCount,
      1,
      clubCount > 1
        ? `已永久效力 ${clubCount} 家俱乐部。`
        : "租借不改变永久效力俱乐部数量。",
    ),
    measuredRule(
      definition.rules[2]!,
      terminal
        ? seasons >= 16
          ? "met"
          : "failed"
        : "pending",
      seasons,
      16,
      terminal
        ? `生涯已在 ${seasons} 个赛季后结束。`
        : `已完成 ${seasons} 个赛季，退役后结算。`,
    ),
  ]);
}

function evaluateAsianGlory(
  career: ClassicCareerState,
): ChallengeProgress {
  const definition = challengeDefinition("asian_glory");
  const terminal = career.phase === "summary";
  const country = CLASSIC_CATALOG.countryByFifaCode.get(
    career.identity.nationalityFifaCode,
  );
  const reputation = country?.internationalReputation ?? 0;
  const eligible =
    country?.confederation === "AFC" && reputation <= 2;
  const calledUp = career.nationalTeamPeriods.length > 0;
  const milestone = career.seasons.some((season) =>
    season.nationalTournamentRecords.some(
      internationalMilestone,
    ),
  );

  return progress(definition, [
    measuredRule(
      definition.rules[0]!,
      eligible ? "met" : "failed",
      reputation,
      2,
      eligible
        ? "初始国籍符合 AFC 低声望条件。"
        : "初始国籍不符合 AFC 且国际声望不高于 2 的条件。",
    ),
    measuredRule(
      definition.rules[1]!,
      calledUp
        ? "met"
        : terminal
          ? "failed"
          : "pending",
      calledUp ? 1 : 0,
      1,
      calledUp
        ? "已获得成年国家队征召。"
        : "尚未获得成年国家队征召。",
    ),
    measuredRule(
      definition.rules[2]!,
      milestone
        ? "met"
        : terminal
          ? "failed"
          : "pending",
      milestone ? 1 : 0,
      1,
      milestone
        ? "已达成洲际四强或世界杯资格里程碑。"
        : "尚未达成国际赛突破。",
    ),
  ]);
}

function evaluateGoalkeeperLegend(
  career: ClassicCareerState,
): ChallengeProgress {
  const definition = challengeDefinition(
    "goalkeeper_legend",
  );
  const terminal = career.phase === "summary";
  const goalkeeper = career.identity.position === "GK";
  const cleanSheets =
    career.seasons.reduce(
      (total, season) =>
        total + season.stats.cleanSheets,
      0,
    ) +
    career.nationalTeamPeriods.reduce(
      (total, period) =>
        total + period.stats.cleanSheets,
      0,
    );
  const hasEliteHonor = career.seasons.some(
    (season) =>
      season.awards.includes("golden_glove") ||
      season.trophies.some((trophy) =>
        ELITE_GOALKEEPER_TROPHIES.has(trophy),
      ),
  );

  return progress(definition, [
    measuredRule(
      definition.rules[0]!,
      goalkeeper ? "met" : "failed",
      goalkeeper ? 1 : 0,
      1,
      goalkeeper
        ? "以门将身份开始生涯。"
        : "该挑战只接受门将位置。",
    ),
    measuredRule(
      definition.rules[1]!,
      cleanSheets >= 150
        ? "met"
        : terminal
          ? "failed"
          : "pending",
      cleanSheets,
      150,
      `俱乐部与国家队合计 ${cleanSheets} 场零封。`,
    ),
    measuredRule(
      definition.rules[2]!,
      hasEliteHonor
        ? "met"
        : terminal
          ? "failed"
          : "pending",
      hasEliteHonor ? 1 : 0,
      1,
      hasEliteHonor
        ? "已获得金手套或认可的国际级冠军。"
        : "尚未获得金手套或认可的国际级冠军。",
    ),
  ]);
}

function permanentClubId(
  choice: ClassicChoiceLogEntry,
): string | null {
  return choice.optionId.startsWith("join:")
    ? choice.optionId.slice("join:".length)
    : null;
}

function internationalMilestone(
  record: NationalTournamentRecord,
): boolean {
  if (record.trophy === "world_cup") {
    return record.status !== "not_qualified";
  }

  return (
    record.status === "played" &&
    ["sf", "final", "champion"].includes(record.result)
  );
}

function measuredRule(
  definition: ChallengeRuleDefinition,
  state: ChallengeRuleState,
  current: number,
  target: number,
  detail: string,
): ChallengeRuleProgress {
  return Object.freeze({
    current,
    detail,
    id: definition.id,
    label: definition.label,
    state,
    target,
  });
}

function progress(
  definition: ChallengeDefinition,
  rules: readonly ChallengeRuleProgress[],
): ChallengeProgress {
  const status: ChallengeProgressStatus = rules.some(
    (rule) => rule.state === "failed",
  )
    ? "failed"
    : rules.every((rule) => rule.state === "met")
      ? "completed"
      : "active";
  const message =
    status === "completed"
      ? `${definition.title}挑战已完成。`
      : status === "failed"
        ? `${definition.title}挑战条件已无法达成。`
        : `${definition.title}挑战进行中。`;

  return Object.freeze({
    family: definition.family,
    message,
    rules: Object.freeze(rules),
    status,
    title: definition.title,
  });
}
