import {
  classicChance,
  classicPick,
  classicPickWeighted,
  classicRandomInteger,
  deriveClassicRngState,
} from "./classicRng";
import { nationalCallUpThreshold } from "./nationalTeam";
import { PACING_CONFIGS } from "./pacing";
import type { PacingMode } from "./pacing";
import type {
  ClassicPosition,
  ClassicSquadRole,
} from "./role";

export const CAREER_EVENT_KEYS = [
  "training_extra",
  "personal_coach",
  "mysterious_substance",
  "season_load",
  "position_change",
  "position_competition",
  "unexpected_prospect",
  "club_priority",
  "rival_offer",
  "club_crisis",
  "fan_backlash",
  "return_home",
  "giant_tattoo",
  "tax_trouble",
  "foreign_grandfather",
  "finish_high_school",
  "controversial_statement",
  "triumphant_return",
  "club_national_team_conflict",
  "injury_at_peak",
  "injury",
  "decisive_penalty",
] as const;

export type CareerEventKey = (typeof CAREER_EVENT_KEYS)[number];

export const CAREER_EVENT_OPTIONS = {
  training_extra: ["accept", "reject"],
  personal_coach: ["accept", "reject"],
  mysterious_substance: ["consume", "reject"],
  season_load: ["accept", "stay_calm"],
  position_change: ["accept", "reject"],
  position_competition: ["compete"],
  unexpected_prospect: ["mentor"],
  club_priority: [
    "prioritize_league",
    "prioritize_continental",
  ],
  rival_offer: ["accept", "reject"],
  club_crisis: ["stay_and_fight"],
  fan_backlash: ["stay_and_fight"],
  return_home: ["stay_abroad"],
  giant_tattoo: ["accept", "reject"],
  tax_trouble: ["stay_and_fight"],
  foreign_grandfather: [
    "switch_national_team",
    "keep_national_team",
  ],
  finish_high_school: ["accept", "reject"],
  controversial_statement: ["apologize"],
  triumphant_return: [],
  club_national_team_conflict: ["go_anyway", "comply"],
  injury_at_peak: ["play_injured", "recover"],
  injury: ["continue"],
  decisive_penalty: ["left", "right"],
} as const satisfies Readonly<
  Record<CareerEventKey, readonly string[]>
>;

export const CAREER_EVENT_VARIANTS = {
  training_extra: ["preseason_camp"],
  personal_coach: ["nutrition_plan"],
  season_load: ["double_session"],
} as const;

export type CareerEventVariant =
  (typeof CAREER_EVENT_VARIANTS)[keyof typeof CAREER_EVENT_VARIANTS][number];

export const CLASSIC_INJURIES = [
  { overallDelta: -3, type: "hamstring", weight: 24 },
  { overallDelta: -2, type: "meniscus", weight: 18 },
  { overallDelta: -5, type: "acl", weight: 14 },
  { overallDelta: -1, type: "ankle_sprain", weight: 14 },
  { overallDelta: -2, type: "calf_tear", weight: 8 },
  { overallDelta: -8, type: "tibia_fibula", weight: 8 },
  {
    overallDelta: -4,
    type: "metatarsal_fracture",
    weight: 5,
  },
  { overallDelta: -10, type: "achilles", weight: 4 },
  {
    overallDelta: -4,
    type: "shoulder_dislocation",
    weight: 3,
  },
  { overallDelta: -5, type: "disc_hernia", weight: 2 },
] as const;

export type InjuryType = (typeof CLASSIC_INJURIES)[number]["type"];
export type ForcedCareerEventOutcome = "positive" | "negative";
export type CareerEventOutcomeKind = ForcedCareerEventOutcome;
export type CareerEventPreviewTone =
  | "negative"
  | "neutral"
  | "positive"
  | "warning";
export type CareerEventOutcomePreview = {
  readonly outcomeKind?: CareerEventOutcomeKind;
  readonly probability?: number;
  readonly text: string;
  readonly tone: CareerEventPreviewTone;
};
export type CareerEventOptionNarrative = {
  readonly label: string;
  readonly previews: readonly CareerEventOutcomePreview[];
};
export type CareerEventNarrative = {
  readonly description: string;
  readonly option: CareerEventOptionNarrative | null;
  readonly title: string;
};
export type ClubTrophy =
  | "league"
  | "cup"
  | "continental_primary"
  | "continental_secondary"
  | "club_world_cup";
export type NationalTrophy =
  | "national_continental"
  | "world_cup";
export type CareerTrophy = ClubTrophy | NationalTrophy;

export const CAREER_EVENT_PROBABILITIES = Object.freeze({
  decisivePenaltyPositive: 0.5,
  giantTattooPositive: 0.7,
  injuryAtPeakPlayPositive: 0.8,
  injuryAtPeakRecoverPositive: 0.3,
  mysteriousSubstancePositive: 0.75,
  personalCoachPositive: 0.5,
  personalCoachNutritionPositive: 0.6,
  positionCompetitionPositive: 0.5,
  seasonLoadDoubleSessionPositive: 0.65,
  seasonLoadPositive: 0.7,
  trainingExtraPositive: 0.7,
  trainingExtraPreseasonPositive: 0.65,
});

export type CareerEventPlan = {
  readonly completedEventAges: readonly number[];
  readonly completedEventKeys: readonly CareerEventKey[];
  readonly completedSlotAges: readonly number[];
  readonly injuryCount: number;
  readonly slotAges: readonly number[];
  readonly targetCount: number;
};

export type CareerEventContext = {
  readonly age: number;
  readonly alternativeNationalityFifaCodes: readonly string[];
  readonly canTransfer: boolean;
  readonly decisivePenaltyTargetTrophy: CareerTrophy | null;
  readonly foreignTeamIds: readonly string[];
  readonly hasQualifiedTournament: boolean;
  readonly homeCountryTeamIds: readonly string[];
  readonly nationalityInternationalReputation: number;
  readonly overall: number;
  readonly peakInjuryTargetTrophy: ClubTrophy | null;
  readonly position: ClassicPosition;
  readonly rivalTeamIds: readonly string[];
  readonly role: ClassicSquadRole;
  readonly team:
    | {
        readonly domesticReputation: number;
        readonly internationalReputation: number;
      }
    | undefined;
  readonly triumphantReturnTeamId: string | null;
};

export type CareerEventSelection = {
  readonly eventKey: CareerEventKey;
  readonly injuryType?: InjuryType;
  readonly optionKeys: readonly string[];
  readonly retireAvailable: boolean;
  readonly variantKey?: CareerEventVariant;
};

export type TrophyOverride<TTrophy extends string> = {
  readonly result: "force" | "skip";
  readonly trophy: TTrophy;
};

export type CareerEventModifiers = {
  clubTrophyOverride?: TrophyOverride<ClubTrophy>;
  clubWorldCupTrophyProbabilityMultiplier: number;
  continentalPrimaryTrophyProbabilityMultiplier: number;
  continentalSecondaryTrophyProbabilityMultiplier: number;
  deferredOverallDelta: number;
  domesticCupTrophyProbabilityMultiplier: number;
  immediateOverallDelta: number;
  leagueTrophyProbabilityMultiplier: number;
  nationalTournament?: NationalTrophy;
  nationalTournamentParticipation?: "force" | "skip";
  nationalTrophyOverride?: TrophyOverride<NationalTrophy>;
  permanentOverallDelta: number;
  roleOverride?: ClassicSquadRole;
  roleShift: number;
  statsMultiplier: number;
  suspended: boolean;
};

export const DEFAULT_CAREER_EVENT_MODIFIERS: Readonly<CareerEventModifiers> =
  Object.freeze({
    clubWorldCupTrophyProbabilityMultiplier: 1,
    continentalPrimaryTrophyProbabilityMultiplier: 1,
    continentalSecondaryTrophyProbabilityMultiplier: 1,
    deferredOverallDelta: 0,
    domesticCupTrophyProbabilityMultiplier: 1,
    immediateOverallDelta: 0,
    leagueTrophyProbabilityMultiplier: 1,
    permanentOverallDelta: 0,
    roleShift: 0,
    statsMultiplier: 1,
    suspended: false,
  });

export const CAREER_EVENT_WEIGHTS: Partial<
  Readonly<Record<CareerEventKey, number>>
> = {
  club_crisis: 45,
  club_national_team_conflict: 20,
  controversial_statement: 45,
  decisive_penalty: 20,
  fan_backlash: 80,
  finish_high_school: 35,
  foreign_grandfather: 25,
  giant_tattoo: 35,
  injury_at_peak: 20,
  mysterious_substance: 20,
  return_home: 45,
  rival_offer: 80,
  tax_trouble: 25,
  triumphant_return: 50,
  unexpected_prospect: 45,
};
export const CAREER_INJURY_CHANCE = 0.02;
export const MAX_CAREER_INJURIES = 2;

const CAREER_EVENT_COPY: Readonly<
  Record<
    CareerEventKey,
    { readonly description: string; readonly title: string }
  >
> = {
  club_crisis: {
    description: "俱乐部正经历动荡。你准备怎么面对？",
    title: "俱乐部危机",
  },
  club_national_team_conflict: {
    description: "俱乐部和国家队的赛程撞在了一起。",
    title: "征召冲突",
  },
  club_priority: {
    description: "赛程太密集了，只能把精力放在一条战线。",
    title: "赛季取舍",
  },
  controversial_statement: {
    description: "一句话把你推上了风口浪尖。",
    title: "争议发言",
  },
  decisive_penalty: {
    description: "决定冠军的点球就在你脚下。踢哪边？",
    title: "决胜点球",
  },
  fan_backlash: {
    description: "看台上的质疑声越来越大。",
    title: "球迷倒戈",
  },
  finish_high_school: {
    description: "你还有机会完成高中学业。",
    title: "回到课堂",
  },
  foreign_grandfather: {
    description: "另一支国家队向你发出了邀请。",
    title: "血缘选择",
  },
  giant_tattoo: {
    description: "有人提议把信念永久留在皮肤上。",
    title: "巨幅纹身",
  },
  injury: {
    description: "伤病打断了你的节奏，只能耐心恢复。",
    title: "意外伤病",
  },
  injury_at_peak: {
    description: "最重要的比赛就在眼前，但你的身体亮起红灯。",
    title: "带伤上阵",
  },
  mysterious_substance: {
    description: "有人递来一瓶成分不明的补剂。",
    title: "神秘补剂",
  },
  personal_coach: {
    description: "一位私人教练愿意为你制定专属计划。",
    title: "私人教练",
  },
  position_change: {
    description: "教练认为换个位置会打开新的可能。",
    title: "位置改造",
  },
  position_competition: {
    description: "新援到来，你的位置不再稳固。",
    title: "位置竞争",
  },
  return_home: {
    description: "家乡球队希望你回去成为旗帜。",
    title: "回到故乡",
  },
  rival_offer: {
    description: "死敌送来了一份很难拒绝的合同。",
    title: "死敌邀约",
  },
  season_load: {
    description: "教练组希望你承担更多比赛和训练任务。",
    title: "赛季负荷",
  },
  tax_trouble: {
    description: "场外的税务问题正在变得棘手。",
    title: "税务风波",
  },
  training_extra: {
    description: "训练结束后，教练问你要不要再加一组。",
    title: "额外训练",
  },
  triumphant_return: {
    description: "最初的俱乐部希望功成名就的你回家。",
    title: "荣归故里",
  },
  unexpected_prospect: {
    description: "一位天赋惊人的年轻人来到了更衣室。",
    title: "后起之秀",
  },
};

const CAREER_EVENT_VARIANT_COPY: Readonly<
  Record<
    CareerEventVariant,
    { readonly description: string; readonly title: string }
  >
> = {
  double_session: {
    description: "教练组希望你把训练量提高到双倍。",
    title: "双倍训练",
  },
  nutrition_plan: {
    description: "私人团队提出了一套严格的营养计划。",
    title: "营养计划",
  },
  preseason_camp: {
    description: "季前集训结束前，教练安排了最后一轮加练。",
    title: "季前集训",
  },
};

const CAREER_EVENT_OPTION_LABELS: Readonly<
  Record<CareerEventKey, Readonly<Record<string, string>>>
> = {
  club_crisis: {
    stay_and_fight: "留下共渡危机",
  },
  club_national_team_conflict: {
    comply: "服从俱乐部",
    go_anyway: "前往国家队",
  },
  club_priority: {
    prioritize_continental: "优先洲际赛事",
    prioritize_league: "优先联赛",
  },
  controversial_statement: {
    apologize: "公开道歉",
  },
  decisive_penalty: {
    left: "踢向左边",
    right: "踢向右边",
  },
  fan_backlash: {
    stay_and_fight: "留下回应质疑",
  },
  finish_high_school: {
    accept: "完成高中学业",
    reject: "专注足球",
  },
  foreign_grandfather: {
    keep_national_team: "留在当前国家队",
    switch_national_team: "更换国家队",
  },
  giant_tattoo: {
    accept: "纹上巨幅纹身",
    reject: "拒绝纹身",
  },
  injury: {
    continue: "开始康复",
  },
  injury_at_peak: {
    play_injured: "带伤出战",
    recover: "安心恢复",
  },
  mysterious_substance: {
    consume: "喝下补剂",
    reject: "拒绝不明补剂",
  },
  personal_coach: {
    accept: "聘请私人教练",
    reject: "继续团队训练",
  },
  position_change: {
    accept: "接受位置改造",
    reject: "坚持原位置",
  },
  position_competition: {
    compete: "正面竞争",
  },
  return_home: {
    stay_abroad: "继续留洋",
  },
  rival_offer: {
    accept: "接受死敌邀约",
    reject: "拒绝死敌邀约",
  },
  season_load: {
    accept: "承担更多负荷",
    stay_calm: "维持当前负荷",
  },
  tax_trouble: {
    stay_and_fight: "留队处理风波",
  },
  training_extra: {
    accept: "留下加练",
    reject: "按计划结束训练",
  },
  triumphant_return: {},
  unexpected_prospect: {
    mentor: "主动指导新人",
  },
};

export function selectCareerEventNarrative(input: {
  readonly eventKey: CareerEventKey;
  readonly injuryType?: InjuryType | undefined;
  readonly optionKey?: string | undefined;
  readonly targetClubTrophy?: ClubTrophy | undefined;
  readonly targetTrophy?: CareerTrophy | undefined;
  readonly variantKey?: CareerEventVariant | undefined;
}): CareerEventNarrative {
  assertValidNarrativeVariant(input.eventKey, input.variantKey);
  const copy =
    input.variantKey === undefined
      ? CAREER_EVENT_COPY[input.eventKey]
      : CAREER_EVENT_VARIANT_COPY[input.variantKey];

  const optionKey = input.optionKey;

  if (optionKey === undefined) {
    return {
      ...copy,
      option: null,
    };
  }

  assertValidOption(input.eventKey, optionKey);
  const baseLabel =
    CAREER_EVENT_OPTION_LABELS[input.eventKey][optionKey];

  if (baseLabel === undefined) {
    throw new RangeError(
      `Missing narrative for ${input.eventKey}:${optionKey}`,
    );
  }
  const optionInput = {
    ...input,
    optionKey,
  };

  return {
    ...copy,
    option: {
      label: variantOptionLabel(optionInput, baseLabel),
      previews: eventOutcomePreviews(optionInput),
    },
  };
}

function variantOptionLabel(
  input: {
    readonly eventKey: CareerEventKey;
    readonly optionKey: string;
    readonly variantKey?: CareerEventVariant | undefined;
  },
  baseLabel: string,
): string {
  if (
    input.eventKey === "training_extra" &&
    input.optionKey === "accept" &&
    input.variantKey === "preseason_camp"
  ) {
    return "完成季前加练";
  }

  if (
    input.eventKey === "personal_coach" &&
    input.optionKey === "accept" &&
    input.variantKey === "nutrition_plan"
  ) {
    return "执行营养计划";
  }

  if (
    input.eventKey === "season_load" &&
    input.optionKey === "accept" &&
    input.variantKey === "double_session"
  ) {
    return "接受双倍训练";
  }

  return baseLabel;
}

function eventOutcomePreviews(input: {
  readonly eventKey: CareerEventKey;
  readonly injuryType?: InjuryType | undefined;
  readonly optionKey: string;
  readonly targetClubTrophy?: ClubTrophy | undefined;
  readonly targetTrophy?: CareerTrophy | undefined;
  readonly variantKey?: CareerEventVariant | undefined;
}): readonly CareerEventOutcomePreview[] {
  const key = `${input.eventKey}:${input.optionKey}`;

  switch (key) {
    case "training_extra:accept": {
      const variant = input.variantKey === "preseason_camp";
      return probabilisticPreviews(
        variant
          ? CAREER_EVENT_PROBABILITIES.trainingExtraPreseasonPositive
          : CAREER_EVENT_PROBABILITIES.trainingExtraPositive,
        variant ? "总评立即 +4" : "总评立即 +3",
        variant ? "总评立即 -3" : "总评立即 -2",
      );
    }
    case "training_extra:reject":
      return neutralPreview("总评与角色保持不变");
    case "personal_coach:accept": {
      const variant = input.variantKey === "nutrition_plan";
      return probabilisticPreviews(
        variant
          ? CAREER_EVENT_PROBABILITIES.personalCoachNutritionPositive
          : CAREER_EVENT_PROBABILITIES.personalCoachPositive,
        variant ? "永久总评 +3" : "永久总评 +2",
        "永久总评 -2",
      );
    }
    case "personal_coach:reject":
      return neutralPreview("沿用现有成长计划");
    case "mysterious_substance:consume":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.mysteriousSubstancePositive,
        "总评立即 +5",
        "遭遇停赛，总评不变",
      );
    case "mysterious_substance:reject":
      return neutralPreview("避开停赛风险，能力保持不变");
    case "season_load:accept":
      return probabilisticPreviews(
        input.variantKey === "double_session"
          ? CAREER_EVENT_PROBABILITIES
              .seasonLoadDoubleSessionPositive
          : CAREER_EVENT_PROBABILITIES.seasonLoadPositive,
        "成为绝对主力",
        "降为替补",
      );
    case "season_load:stay_calm":
      return deterministicPreviews([
        {
          text: "阵容角色下降一级",
          tone: "negative",
        },
      ]);
    case "position_change:accept":
      return deterministicPreviews([
        {
          text: "成为绝对主力",
          tone: "positive",
        },
        {
          text: "总评先 -2，周期结束后恢复 +2",
          tone: "warning",
        },
      ]);
    case "position_change:reject":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "阵容角色下降一级",
          tone: "negative",
        },
      ]);
    case "position_competition:compete":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.positionCompetitionPositive,
        "成为绝对主力",
        "降为边缘轮换",
      );
    case "unexpected_prospect:mentor":
      return deterministicPreviews([
        {
          text: "阵容角色下降一级",
          tone: "negative",
        },
        {
          text: "本周期所有俱乐部赛事夺冠概率 ×2",
          tone: "positive",
        },
      ]);
    case "club_priority:prioritize_league":
      return deterministicPreviews([
        {
          text: "联赛夺冠概率 ×2",
          tone: "positive",
        },
        {
          text: "顶级洲际赛事夺冠概率 ×0.5",
          tone: "negative",
        },
      ]);
    case "club_priority:prioritize_continental":
      return deterministicPreviews([
        {
          text: "顶级洲际赛事夺冠概率 ×2",
          tone: "positive",
        },
        {
          text: "联赛夺冠概率 ×0.5",
          tone: "negative",
        },
      ]);
    case "rival_offer:accept":
      return neutralPreview("加盟报价俱乐部，角色按新环境结算");
    case "rival_offer:reject":
      return neutralPreview("留在当前俱乐部，赛季状态不变");
    case "club_crisis:stay_and_fight":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "本周期所有俱乐部赛事夺冠概率降至 10%",
          tone: "negative",
        },
      ]);
    case "fan_backlash:stay_and_fight":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "总评立即 -2，周期结束后恢复 +2",
          tone: "warning",
        },
      ]);
    case "return_home:stay_abroad":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "总评立即 -5，周期结束后恢复 +5",
          tone: "warning",
        },
      ]);
    case "giant_tattoo:accept":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.giantTattooPositive,
        "永久总评 +2",
        "降为替补",
      );
    case "giant_tattoo:reject":
      return neutralPreview("总评与角色保持不变");
    case "tax_trouble:stay_and_fight":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "总评立即 -3，周期结束后恢复 +3",
          tone: "warning",
        },
      ]);
    case "foreign_grandfather:switch_national_team":
      return deterministicPreviews([
        {
          text: "切换到受邀国家队",
          tone: "positive",
        },
      ]);
    case "foreign_grandfather:keep_national_team":
      return neutralPreview("保留当前国家队资格");
    case "finish_high_school:accept":
      return deterministicPreviews([
        {
          text: "永久总评 +1",
          tone: "positive",
        },
        {
          text: "阵容角色下降一级",
          tone: "negative",
        },
      ]);
    case "finish_high_school:reject":
      return neutralPreview("总评与角色保持不变");
    case "controversial_statement:apologize":
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: "阵容角色下降一级",
          tone: "negative",
        },
      ]);
    case "club_national_team_conflict:go_anyway":
      return deterministicPreviews([
        {
          text: "强制参加目标国家队赛事",
          tone: "positive",
        },
        {
          text: "俱乐部角色降为替补",
          tone: "negative",
        },
      ]);
    case "club_national_team_conflict:comply":
      return deterministicPreviews([
        {
          text: "缺席目标国家队赛事",
          tone: "negative",
        },
      ]);
    case "injury_at_peak:play_injured":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.injuryAtPeakPlayPositive,
        "总评 -1，但赢得目标冠军",
        "总评 -1，并错失目标冠军",
      );
    case "injury_at_peak:recover":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.injuryAtPeakRecoverPositive,
        "安心恢复并赢得目标冠军",
        "安心恢复但错失目标冠军",
      );
    case "injury:continue": {
      const overallDelta = injuryOverallDelta(
        input.injuryType ?? "hamstring",
      );
      return deterministicPreviews([
        {
          outcomeKind: "negative",
          text: `总评 ${overallDelta}，角色降为替补`,
          tone: "negative",
        },
      ]);
    }
    case "decisive_penalty:left":
    case "decisive_penalty:right":
      return probabilisticPreviews(
        CAREER_EVENT_PROBABILITIES.decisivePenaltyPositive,
        "命中点球并赢得目标冠军",
        "罚失点球并错失目标冠军",
      );
    default:
      throw new RangeError(`Missing outcome preview for ${key}`);
  }
}

function probabilisticPreviews(
  positiveProbability: number,
  positiveText: string,
  negativeText: string,
): readonly CareerEventOutcomePreview[] {
  const negativeProbability =
    Math.round((1 - positiveProbability) * 100) / 100;

  return [
    {
      outcomeKind: "positive",
      probability: positiveProbability,
      text: positiveText,
      tone: "positive",
    },
    {
      outcomeKind: "negative",
      probability: negativeProbability,
      text: negativeText,
      tone: "negative",
    },
  ];
}

function deterministicPreviews(
  previews: readonly CareerEventOutcomePreview[],
): readonly CareerEventOutcomePreview[] {
  return previews;
}

function neutralPreview(
  text: string,
): readonly CareerEventOutcomePreview[] {
  return [
    {
      text,
      tone: "neutral",
    },
  ];
}

export function createCareerEventPlan(input: {
  readonly mode: PacingMode;
  readonly rngState: number;
}): {
  readonly plan: CareerEventPlan;
  readonly rngState: number;
} {
  const config = PACING_CONFIGS[input.mode];
  const countDraw = classicRandomInteger(
    input.rngState,
    config.personalEventCount[0],
    config.personalEventCount[1],
  );
  const availableAges = careerEventSlotAges(input.mode);
  const combinations = nonAdjacentCombinations(
    availableAges,
    countDraw.value,
  );
  const selection = classicPick(countDraw.state, combinations);
  const slotAges = Object.freeze([...selection.item]);

  return {
    plan: {
      completedEventAges: [],
      completedEventKeys: [],
      completedSlotAges: [],
      injuryCount: 0,
      slotAges,
      targetCount: slotAges.length,
    },
    rngState: selection.state,
  };
}

export function nextCareerEventSlot(
  plan: CareerEventPlan | null,
  age: number,
): number | null {
  if (
    plan === null ||
    plan.completedEventKeys.length >= plan.targetCount
  ) {
    return null;
  }

  return (
    plan.slotAges.find(
      (slotAge) =>
        slotAge <= age &&
        !plan.completedSlotAges.includes(slotAge),
    ) ?? null
  );
}

export function completeCareerEventPlan(
  plan: CareerEventPlan,
  eventKey: CareerEventKey,
  scheduledSlotAge: number,
  eventAge: number,
): CareerEventPlan {
  if (eventKey === "injury") {
    return {
      ...plan,
      injuryCount: plan.injuryCount + 1,
    };
  }

  return {
    ...plan,
    completedEventAges: [
      ...plan.completedEventAges,
      eventAge,
    ],
    completedEventKeys: [
      ...plan.completedEventKeys,
      eventKey,
    ],
    completedSlotAges: [
      ...plan.completedSlotAges,
      scheduledSlotAge,
    ],
  };
}

export function eligibleCareerEventKeys(
  context: CareerEventContext,
  eventKeys: readonly CareerEventKey[] = CAREER_EVENT_KEYS,
): CareerEventKey[] {
  return eventKeys.filter((eventKey) => {
    switch (eventKey) {
      case "season_load":
      case "position_competition":
        return isLeadingRole(context.role);
      case "unexpected_prospect":
        return (
          context.age > 22 &&
          isLeadingRole(context.role) &&
          context.canTransfer
        );
      case "club_priority":
        return (
          context.role === "starter" &&
          (context.team?.domesticReputation ?? 0) > 2 &&
          (context.team?.internationalReputation ?? 0) > 2
        );
      case "rival_offer":
        return (
          context.role === "starter" &&
          context.rivalTeamIds.length > 0 &&
          (context.team?.domesticReputation ?? 0) > 2 &&
          (context.team?.internationalReputation ?? 0) > 2
        );
      case "club_crisis":
        return (
          context.team !== undefined &&
          (context.team.domesticReputation > 1 ||
            context.team.internationalReputation > 1) &&
          context.canTransfer
        );
      case "fan_backlash":
        return context.age > 22 && context.canTransfer;
      case "return_home":
        return (
          context.age > 24 &&
          context.homeCountryTeamIds.length > 0
        );
      case "tax_trouble":
        return context.foreignTeamIds.length > 0;
      case "foreign_grandfather":
        return (
          context.alternativeNationalityFifaCodes.length > 0
        );
      case "triumphant_return":
        return (
          context.age >= 32 &&
          context.triumphantReturnTeamId !== null
        );
      case "club_national_team_conflict":
        return (
          context.overall >=
            nationalCallUpThreshold(
              context.nationalityInternationalReputation,
            ) && context.hasQualifiedTournament
        );
      case "injury_at_peak":
        return (
          context.role === "starter" &&
          context.peakInjuryTargetTrophy !== null
        );
      case "decisive_penalty":
        return context.decisivePenaltyTargetTrophy !== null;
      case "position_change":
        return context.position !== "GK";
      case "injury":
        return false;
      default:
        return true;
    }
  });
}

export function selectCareerEvent(input: {
  readonly context: CareerEventContext;
  readonly forceInjury?: InjuryType;
  readonly mode: PacingMode;
  readonly plan: CareerEventPlan;
  readonly rngState: number;
  readonly seed: string;
  readonly step: number;
}): {
  readonly event: CareerEventSelection;
  readonly rngState: number;
} | null {
  const scheduledSlotAge = nextCareerEventSlot(
    input.plan,
    input.context.age,
  );
  const lastCompletedAge =
    input.plan.completedEventAges[
      input.plan.completedEventAges.length - 1
    ];
  const minimumGap =
    PACING_CONFIGS[input.mode].periodLengthSeasons * 2;

  if (
    scheduledSlotAge === null ||
    input.context.age > 37 ||
    (lastCompletedAge !== undefined &&
      input.context.age - lastCompletedAge < minimumGap)
  ) {
    return null;
  }

  if (input.plan.injuryCount < MAX_CAREER_INJURIES) {
    const forcedInjury = input.forceInjury;
    const injuryState = deriveClassicRngState(
      input.seed,
      "injury",
      input.step,
    );
    const injuryDraw = classicChance(
      injuryState,
      CAREER_INJURY_CHANCE,
    );

    if (forcedInjury !== undefined || injuryDraw.success) {
      const injury =
        forcedInjury === undefined
          ? classicPickWeighted(
              injuryDraw.state,
              CLASSIC_INJURIES.map((candidate) => ({
                item: candidate,
                weight: candidate.weight,
              })),
            ).item
          : CLASSIC_INJURIES.find(
              (candidate) => candidate.type === forcedInjury,
            )!;

      return {
        event: {
          eventKey: "injury",
          injuryType: injury.type,
          optionKeys: [...CAREER_EVENT_OPTIONS.injury],
          retireAvailable:
            input.context.age >= 30 && injury.overallDelta <= -5,
        },
        rngState: input.rngState,
      };
    }
  }

  const eligible = eligibleCareerEventKeys(input.context).filter(
    (eventKey) =>
      !input.plan.completedEventKeys.includes(eventKey),
  );

  if (eligible.length === 0) {
    return null;
  }

  const eventDraw = classicPickWeighted(
    input.rngState,
    eligible.map((eventKey) => ({
      item: eventKey,
      weight: CAREER_EVENT_WEIGHTS[eventKey] ?? 100,
    })),
  );
  const variants = variantsForEvent(eventDraw.item);
  const variantKey =
    variants.length === 0
      ? undefined
      : classicPickWeighted(
          deriveClassicRngState(
            input.seed,
            "variant",
            input.step,
            eventDraw.item,
          ),
          variants.map((variant) => ({
            item: variant,
            weight: 100,
          })),
        ).item;
  const base = {
    eventKey: eventDraw.item,
    optionKeys: [...CAREER_EVENT_OPTIONS[eventDraw.item]],
    retireAvailable: false,
  };

  return {
    event:
      variantKey === undefined
        ? base
        : {
            ...base,
            variantKey,
          },
    rngState: eventDraw.state,
  };
}

export function applyCareerEventChoice(input: {
  readonly eventKey: CareerEventKey;
  readonly forcedOutcome?:
    | ForcedCareerEventOutcome
    | undefined;
  readonly injuryType?: InjuryType | undefined;
  readonly optionKey: string | undefined;
  readonly optionType?:
    | "career_choice"
    | "join_club"
    | undefined;
  readonly rngState: number;
  readonly targetClubTrophy?: ClubTrophy | string | undefined;
  readonly targetTrophy?: CareerTrophy | string | undefined;
  readonly variantKey?: CareerEventVariant | string | undefined;
}): {
  readonly modifiers: CareerEventModifiers;
  readonly outcomeKind?: CareerEventOutcomeKind;
  readonly rngState: number;
} {
  assertValidOption(input.eventKey, input.optionKey);

  const modifiers: CareerEventModifiers = {
    ...DEFAULT_CAREER_EVENT_MODIFIERS,
  };
  let rngState = input.rngState;
  let outcomeKind: CareerEventOutcomeKind | undefined;

  const outcome = (
    probability: number,
    target: CareerEventOutcomeKind,
  ): boolean => {
    if (input.forcedOutcome !== undefined) {
      return input.forcedOutcome === target;
    }

    const draw = classicChance(rngState, probability);
    rngState = draw.state;
    return draw.success;
  };

  switch (`${input.eventKey}:${input.optionKey ?? ""}`) {
    case "training_extra:accept": {
      const variant =
        input.variantKey === "preseason_camp";
      const positive = outcome(
        variant
          ? CAREER_EVENT_PROBABILITIES
              .trainingExtraPreseasonPositive
          : CAREER_EVENT_PROBABILITIES.trainingExtraPositive,
        "positive",
      );
      modifiers.immediateOverallDelta = positive
        ? variant
          ? 4
          : 3
        : variant
          ? -3
          : -2;
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    case "personal_coach:accept": {
      const variant =
        input.variantKey === "nutrition_plan";
      const positive = outcome(
        variant
          ? CAREER_EVENT_PROBABILITIES
              .personalCoachNutritionPositive
          : CAREER_EVENT_PROBABILITIES.personalCoachPositive,
        "positive",
      );
      modifiers.permanentOverallDelta = positive
        ? variant
          ? 3
          : 2
        : -2;
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    case "mysterious_substance:consume": {
      const negative = outcome(
        1 -
          CAREER_EVENT_PROBABILITIES.mysteriousSubstancePositive,
        "negative",
      );
      outcomeKind = negative ? "negative" : "positive";
      modifiers.immediateOverallDelta = negative ? 0 : 5;
      modifiers.suspended = negative;
      break;
    }
    case "season_load:accept": {
      const positive = outcome(
        input.variantKey === "double_session"
          ? CAREER_EVENT_PROBABILITIES
              .seasonLoadDoubleSessionPositive
          : CAREER_EVENT_PROBABILITIES.seasonLoadPositive,
        "positive",
      );
      modifiers.roleOverride = positive
        ? "starter"
        : "substitute";
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    case "season_load:stay_calm":
      modifiers.roleShift = -1;
      break;
    case "position_change:accept":
      modifiers.roleOverride = "starter";
      modifiers.immediateOverallDelta = -2;
      modifiers.deferredOverallDelta = 2;
      break;
    case "position_change:reject":
      modifiers.roleShift = -1;
      outcomeKind = "negative";
      break;
    case "position_competition:compete": {
      const positive = outcome(
        CAREER_EVENT_PROBABILITIES.positionCompetitionPositive,
        "positive",
      );
      modifiers.roleOverride = positive
        ? "starter"
        : "low_rotation";
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    case "unexpected_prospect:mentor":
      modifiers.roleShift = -1;
      multiplyEveryClubTrophyChance(modifiers, 2);
      break;
    case "club_priority:prioritize_league":
      modifiers.leagueTrophyProbabilityMultiplier = 2;
      modifiers.continentalPrimaryTrophyProbabilityMultiplier =
        0.5;
      break;
    case "club_priority:prioritize_continental":
      modifiers.leagueTrophyProbabilityMultiplier = 0.5;
      modifiers.continentalPrimaryTrophyProbabilityMultiplier = 2;
      break;
    case "rival_offer:accept":
      modifiers.roleOverride = "high_rotation";
      multiplyEveryClubTrophyChance(modifiers, 2);
      break;
    case "club_crisis:stay_and_fight":
      multiplyEveryClubTrophyChance(modifiers, 0.1);
      outcomeKind = "negative";
      break;
    case "fan_backlash:stay_and_fight":
      modifiers.immediateOverallDelta = -2;
      modifiers.deferredOverallDelta = 2;
      outcomeKind = "negative";
      break;
    case "return_home:stay_abroad":
      modifiers.immediateOverallDelta = -5;
      modifiers.deferredOverallDelta = 5;
      outcomeKind = "negative";
      break;
    case "giant_tattoo:accept": {
      const positive = outcome(
        CAREER_EVENT_PROBABILITIES.giantTattooPositive,
        "positive",
      );
      outcomeKind = positive ? "positive" : "negative";

      if (positive) {
        modifiers.permanentOverallDelta = 2;
      } else {
        modifiers.roleOverride = "substitute";
      }
      break;
    }
    case "tax_trouble:stay_and_fight":
      modifiers.immediateOverallDelta = -3;
      modifiers.deferredOverallDelta = 3;
      outcomeKind = "negative";
      break;
    case "finish_high_school:accept":
      modifiers.permanentOverallDelta = 1;
      modifiers.roleShift = -1;
      break;
    case "controversial_statement:apologize":
      modifiers.roleShift = -1;
      outcomeKind = "negative";
      break;
    case "club_national_team_conflict:go_anyway":
      modifiers.roleOverride = "substitute";
      modifiers.nationalTournamentParticipation = "force";
      break;
    case "club_national_team_conflict:comply":
      modifiers.nationalTournamentParticipation = "skip";
      break;
    case "injury_at_peak:play_injured": {
      const positive = outcome(
        CAREER_EVENT_PROBABILITIES.injuryAtPeakPlayPositive,
        "positive",
      );
      outcomeKind = positive ? "positive" : "negative";
      modifiers.immediateOverallDelta = -1;
      break;
    }
    case "injury_at_peak:recover": {
      const positive = outcome(
        CAREER_EVENT_PROBABILITIES.injuryAtPeakRecoverPositive,
        "positive",
      );
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    case "injury:continue":
      modifiers.immediateOverallDelta = injuryOverallDelta(
        input.injuryType ?? "hamstring",
      );
      modifiers.roleOverride = "substitute";
      outcomeKind = "negative";
      break;
    case "decisive_penalty:left":
    case "decisive_penalty:right": {
      const positive = outcome(
        CAREER_EVENT_PROBABILITIES.decisivePenaltyPositive,
        "positive",
      );
      outcomeKind = positive ? "positive" : "negative";
      break;
    }
    default:
      break;
  }

  enrichTargetedModifiers(input, modifiers, outcomeKind);

  return outcomeKind === undefined
    ? { modifiers, rngState }
    : { modifiers, outcomeKind, rngState };
}

export function suspensionSeasonsForEvent(
  modifiers: CareerEventModifiers,
  mode: PacingMode,
): number {
  return modifiers.suspended
    ? Math.max(2, PACING_CONFIGS[mode].periodLengthSeasons)
    : 0;
}

export function applyImmediateCareerEventEffects(
  overall: number,
  modifiers: CareerEventModifiers,
): number {
  return clamp(
    overall +
      modifiers.immediateOverallDelta +
      modifiers.permanentOverallDelta,
    40,
    99,
  );
}

export function applyDeferredCareerEventRecovery(
  overall: number,
  modifiers: CareerEventModifiers,
): number {
  return clamp(
    overall + modifiers.deferredOverallDelta,
    40,
    99,
  );
}

function careerEventSlotAges(mode: PacingMode): number[] {
  const periodLength = PACING_CONFIGS[mode].periodLengthSeasons;
  const firstAge =
    16 + Math.ceil(6 / periodLength) * periodLength;
  const ages: number[] = [];

  for (
    let age = firstAge;
    age <= 37;
    age += periodLength
  ) {
    ages.push(age);
  }

  return ages;
}

function nonAdjacentCombinations(
  values: readonly number[],
  count: number,
): number[][] {
  const combinations: number[][] = [];

  const visit = (start: number, selected: number[]): void => {
    if (selected.length === count) {
      combinations.push(selected);
      return;
    }

    for (let index = start; index < values.length; index += 1) {
      visit(index + 2, [...selected, values[index]!]);
    }
  };

  visit(0, []);
  return combinations;
}

function variantsForEvent(
  eventKey: CareerEventKey,
): readonly CareerEventVariant[] {
  if (eventKey === "training_extra") {
    return CAREER_EVENT_VARIANTS.training_extra;
  }
  if (eventKey === "personal_coach") {
    return CAREER_EVENT_VARIANTS.personal_coach;
  }
  if (eventKey === "season_load") {
    return CAREER_EVENT_VARIANTS.season_load;
  }

  return [];
}

function assertValidNarrativeVariant(
  eventKey: CareerEventKey,
  variantKey: CareerEventVariant | undefined,
): void {
  if (
    variantKey !== undefined &&
    !variantsForEvent(eventKey).includes(variantKey)
  ) {
    throw new RangeError(
      `Unsupported variant ${variantKey} for ${eventKey}`,
    );
  }
}

function injuryOverallDelta(injuryType: InjuryType): number {
  return (
    CLASSIC_INJURIES.find(
      (injury) => injury.type === injuryType,
    )?.overallDelta ?? -3
  );
}

function isLeadingRole(role: ClassicSquadRole): boolean {
  return role === "starter" || role === "high_rotation";
}

function assertValidOption(
  eventKey: CareerEventKey,
  optionKey: string | undefined,
): void {
  if (optionKey === undefined) {
    if (CAREER_EVENT_OPTIONS[eventKey].length === 0) {
      return;
    }

    throw new RangeError(
      `Career event ${eventKey} requires an option`,
    );
  }

  if (
    !(CAREER_EVENT_OPTIONS[eventKey] as readonly string[]).includes(
      optionKey,
    )
  ) {
    throw new RangeError(
      `Unsupported option ${optionKey} for ${eventKey}`,
    );
  }
}

function multiplyEveryClubTrophyChance(
  modifiers: CareerEventModifiers,
  multiplier: number,
): void {
  modifiers.leagueTrophyProbabilityMultiplier = multiplier;
  modifiers.domesticCupTrophyProbabilityMultiplier = multiplier;
  modifiers.continentalPrimaryTrophyProbabilityMultiplier =
    multiplier;
  modifiers.continentalSecondaryTrophyProbabilityMultiplier =
    multiplier;
  modifiers.clubWorldCupTrophyProbabilityMultiplier = multiplier;
}

function enrichTargetedModifiers(
  input: {
    readonly eventKey: CareerEventKey;
    readonly optionType?:
      | "career_choice"
      | "join_club"
      | undefined;
    readonly targetClubTrophy?: ClubTrophy | string | undefined;
    readonly targetTrophy?: CareerTrophy | string | undefined;
  },
  modifiers: CareerEventModifiers,
  outcomeKind: CareerEventOutcomeKind | undefined,
): void {
  if (
    input.eventKey === "triumphant_return" &&
    input.optionType === "join_club"
  ) {
    modifiers.roleOverride = "starter";
  }

  if (
    input.eventKey === "club_national_team_conflict" &&
    isNationalTrophy(input.targetTrophy)
  ) {
    modifiers.nationalTournament = input.targetTrophy;
  }

  if (
    input.eventKey === "injury_at_peak" &&
    isClubTrophy(input.targetClubTrophy) &&
    outcomeKind !== undefined
  ) {
    modifiers.clubTrophyOverride = {
      result: outcomeKind === "positive" ? "force" : "skip",
      trophy: input.targetClubTrophy,
    };
  }

  if (
    input.eventKey === "decisive_penalty" &&
    outcomeKind !== undefined
  ) {
    const result =
      outcomeKind === "positive" ? "force" : "skip";

    if (isNationalTrophy(input.targetTrophy)) {
      modifiers.nationalTrophyOverride = {
        result,
        trophy: input.targetTrophy,
      };
    } else if (isClubTrophy(input.targetTrophy)) {
      modifiers.clubTrophyOverride = {
        result,
        trophy: input.targetTrophy,
      };
    }
  }
}

function isNationalTrophy(
  trophy: string | undefined,
): trophy is NationalTrophy {
  return (
    trophy === "national_continental" ||
    trophy === "world_cup"
  );
}

function isClubTrophy(
  trophy: string | undefined,
): trophy is ClubTrophy {
  return (
    trophy === "league" ||
    trophy === "cup" ||
    trophy === "continental_primary" ||
    trophy === "continental_secondary" ||
    trophy === "club_world_cup"
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}
