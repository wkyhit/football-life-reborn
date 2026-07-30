import type { DailyChallengeFamily } from "./daily";

export type ChallengeRuleDefinition = {
  readonly description: string;
  readonly id: string;
  readonly label: string;
};

export type ChallengeDefinition = {
  readonly description: string;
  readonly family: DailyChallengeFamily;
  readonly rules: readonly ChallengeRuleDefinition[];
  readonly title: string;
};

function rule(
  id: string,
  label: string,
  description: string,
): ChallengeRuleDefinition {
  return Object.freeze({ description, id, label });
}

function challenge(
  family: DailyChallengeFamily,
  title: string,
  description: string,
  rules: readonly ChallengeRuleDefinition[],
): ChallengeDefinition {
  return Object.freeze({
    description,
    family,
    rules: Object.freeze(rules),
    title,
  });
}

export const CHALLENGE_CATALOG = Object.freeze({
  one_club: challenge(
    "one_club",
    "一人一城",
    "从青训起步，只为一家俱乐部永久效力并完成漫长生涯。",
    [
      rule(
        "academy_start",
        "青训起步",
        "从青训邀请中选择第一家俱乐部。",
      ),
      rule(
        "club_loyalty",
        "忠于一队",
        "永久效力俱乐部不超过一家，租借不计入转会。",
      ),
      rule(
        "career_length",
        "十六载生涯",
        "完成至少 16 个赛季并正式退役。",
      ),
    ],
  ),
  asian_glory: challenge(
    "asian_glory",
    "亚洲之光",
    "以亚洲低声望国家球员身份，带领国家队走向洲际或世界杯舞台。",
    [
      rule(
        "eligible_nation",
        "亚洲新星",
        "初始国籍属于 AFC，且国际声望不高于 2。",
      ),
      rule(
        "senior_call_up",
        "成年国家队",
        "至少获得一次成年国家队征召。",
      ),
      rule(
        "international_milestone",
        "国际赛突破",
        "进入洲际赛事四强，或帮助国家获得世界杯参赛资格。",
      ),
    ],
  ),
  goalkeeper_legend: challenge(
    "goalkeeper_legend",
    "门将传奇",
    "以门将身份累积零封，并用个人或国际级荣誉完成传奇。",
    [
      rule(
        "goalkeeper_position",
        "门将身份",
        "使用门将位置开始生涯。",
      ),
      rule(
        "clean_sheets",
        "零封里程碑",
        "俱乐部与国家队合计完成至少 150 场零封。",
      ),
      rule(
        "elite_honor",
        "传奇荣誉",
        "赢得金手套，或夺得洲际、世俱杯、国家洲际或世界杯冠军。",
      ),
    ],
  ),
} satisfies Readonly<
  Record<DailyChallengeFamily, ChallengeDefinition>
>);

export function challengeDefinition(
  family: DailyChallengeFamily,
): ChallengeDefinition {
  return CHALLENGE_CATALOG[family];
}
