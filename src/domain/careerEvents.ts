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
        variant ? 0.65 : 0.7,
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
        variant ? 0.6 : 0.5,
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
      const negative = outcome(0.25, "negative");
      outcomeKind = negative ? "negative" : "positive";
      modifiers.immediateOverallDelta = negative ? 0 : 5;
      modifiers.suspended = negative;
      break;
    }
    case "season_load:accept": {
      const positive = outcome(
        input.variantKey === "double_session" ? 0.65 : 0.7,
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
      const positive = outcome(0.5, "positive");
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
      const positive = outcome(0.7, "positive");
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
      const positive = outcome(0.8, "positive");
      outcomeKind = positive ? "positive" : "negative";
      modifiers.immediateOverallDelta = -1;
      break;
    }
    case "injury_at_peak:recover": {
      const positive = outcome(0.3, "positive");
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
      const positive = outcome(0.5, "positive");
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
