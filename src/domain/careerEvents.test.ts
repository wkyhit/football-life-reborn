import { describe, expect, it } from "vitest";

import { createClassicRngState } from "./classicRng";
import {
  CAREER_EVENT_KEYS,
  CAREER_EVENT_OPTIONS,
  CAREER_EVENT_VARIANTS,
  CAREER_EVENT_WEIGHTS,
  CAREER_INJURY_CHANCE,
  CLASSIC_INJURIES,
  DEFAULT_CAREER_EVENT_MODIFIERS,
  applyCareerEventChoice,
  applyDeferredCareerEventRecovery,
  applyImmediateCareerEventEffects,
  completeCareerEventPlan,
  createCareerEventPlan,
  eligibleCareerEventKeys,
  nextCareerEventSlot,
  selectCareerEvent,
  suspensionSeasonsForEvent,
} from "./careerEvents";
import type {
  CareerEventContext,
  CareerEventKey,
  CareerEventPlan,
  ForcedCareerEventOutcome,
} from "./careerEvents";

const MAXIMAL_CONTEXT: CareerEventContext = {
  age: 32,
  alternativeNationalityFifaCodes: ["JPN"],
  canTransfer: true,
  decisivePenaltyTargetTrophy: "world_cup",
  foreignTeamIds: ["real-madrid"],
  hasQualifiedTournament: true,
  homeCountryTeamIds: ["shanghai-shenhua"],
  nationalityInternationalReputation: 1,
  overall: 90,
  peakInjuryTargetTrophy: "league",
  position: "ST",
  rivalTeamIds: ["shanghai-shenhua"],
  role: "starter",
  team: {
    domesticReputation: 4,
    internationalReputation: 4,
  },
  triumphantReturnTeamId: "shanghai-port",
};

function completedPlan(
  completedEventKeys: readonly CareerEventKey[] = [],
): CareerEventPlan {
  return {
    completedEventAges: completedEventKeys.map(
      (_, index) => 22 + index * 2,
    ),
    completedEventKeys: [...completedEventKeys],
    completedSlotAges: completedEventKeys.map(
      (_, index) => 22 + index * 2,
    ),
    injuryCount: 2,
    slotAges: [22, 24, 26, 28, 30, 32, 34],
    targetCount: 7,
  };
}

function effect(
  eventKey: CareerEventKey,
  optionKey: string | undefined,
  forcedOutcome?: ForcedCareerEventOutcome,
  extra: {
    injuryType?:
      | (typeof CLASSIC_INJURIES)[number]["type"]
      | undefined;
    optionType?: "career_choice" | "join_club" | undefined;
    targetClubTrophy?: string | undefined;
    targetTrophy?: string | undefined;
    variantKey?: string | undefined;
  } = {},
) {
  return applyCareerEventChoice({
    eventKey,
    forcedOutcome,
    optionKey,
    rngState: createClassicRngState(
      `phase-2:event-effect:${eventKey}:${optionKey ?? "none"}`,
    ),
    ...extra,
  });
}

describe("Classic career-event catalog", () => {
  it("freezes all 22 event types, 3 variants, and 10 injuries", () => {
    expect(CAREER_EVENT_KEYS).toEqual([
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
    ]);
    expect(Object.values(CAREER_EVENT_VARIANTS).flat()).toEqual([
      "preseason_camp",
      "nutrition_plan",
      "double_session",
    ]);
    expect(CLASSIC_INJURIES).toEqual([
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
    ]);
    expect(new Set(CAREER_EVENT_KEYS).size).toBe(22);
    expect(new Set(CLASSIC_INJURIES.map(({ type }) => type)).size).toBe(
      10,
    );
    expect(CAREER_INJURY_CHANCE).toBe(0.02);
    expect(CAREER_EVENT_WEIGHTS).toEqual({
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
    });
  });

  it("freezes every event option table", () => {
    expect(CAREER_EVENT_OPTIONS).toEqual({
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
    });
  });
});

describe("Classic career-event planning and eligibility", () => {
  it("builds deterministic non-adjacent plans for all pacing modes", () => {
    const expectations = {
      long: {
        count: [6, 7],
        periodLength: 1,
      },
      normal: {
        count: [3, 4],
        periodLength: 2,
      },
      express: {
        count: [2, 3],
        periodLength: 3,
      },
    } as const;
    const vectors: Array<{
      mode: string;
      rngState: number;
      slotAges: readonly number[];
    }> = [];

    for (const [mode, expected] of Object.entries(expectations)) {
      const input = {
        mode: mode as keyof typeof expectations,
        rngState: createClassicRngState(
          `phase-2:event-plan:${mode}`,
        ),
      };
      const first = createCareerEventPlan(input);
      const replay = createCareerEventPlan(input);

      expect(first).toEqual(replay);
      expect(first.plan.targetCount).toBeGreaterThanOrEqual(
        expected.count[0],
      );
      expect(first.plan.targetCount).toBeLessThanOrEqual(
        expected.count[1],
      );
      expect(first.plan.slotAges).toHaveLength(
        first.plan.targetCount,
      );
      expect(
        first.plan.slotAges.every(
          (age, index, ages) =>
            index === 0 ||
            age - ages[index - 1]! >=
              expected.periodLength * 2,
        ),
      ).toBe(true);
      expect(first.plan.completedEventKeys).toEqual([]);
      expect(first.plan.injuryCount).toBe(0);
      vectors.push({
        mode,
        rngState: first.rngState,
        slotAges: first.plan.slotAges,
      });
    }

    expect(vectors).toEqual([
      {
        mode: "long",
        rngState: 3_180_471_362,
        slotAges: [23, 26, 29, 31, 33, 35],
      },
      {
        mode: "normal",
        rngState: 2_966_987_341,
        slotAges: [22, 28, 32, 36],
      },
      {
        mode: "express",
        rngState: 472_856_183,
        slotAges: [22, 31],
      },
    ]);
  });

  it("exposes all eligible non-injury events in a maximal context", () => {
    expect(eligibleCareerEventKeys(MAXIMAL_CONTEXT)).toEqual(
      CAREER_EVENT_KEYS.filter((eventKey) => eventKey !== "injury"),
    );
  });

  it.each([
    ["season_load", { role: "substitute" }],
    ["position_competition", { role: "substitute" }],
    ["unexpected_prospect", { age: 22 }],
    [
      "club_priority",
      { team: { domesticReputation: 2, internationalReputation: 4 } },
    ],
    ["rival_offer", { rivalTeamIds: [] }],
    ["club_crisis", { canTransfer: false }],
    ["fan_backlash", { age: 22 }],
    ["return_home", { age: 24 }],
    ["tax_trouble", { foreignTeamIds: [] }],
    [
      "foreign_grandfather",
      { alternativeNationalityFifaCodes: [] },
    ],
    ["triumphant_return", { age: 31 }],
    ["club_national_team_conflict", { hasQualifiedTournament: false }],
    ["injury_at_peak", { peakInjuryTargetTrophy: null }],
    ["decisive_penalty", { decisivePenaltyTargetTrophy: null }],
    ["position_change", { position: "GK" }],
  ] as const)(
    "rejects %s when its eligibility gate is absent",
    (eventKey, patch) => {
      expect(
        eligibleCareerEventKeys({
          ...MAXIMAL_CONTEXT,
          ...patch,
        }),
      ).not.toContain(eventKey);
    },
  );

  it("tracks slots, completed keys, ages, and the two-injury cap separately", () => {
    const plan = completedPlan();
    expect(nextCareerEventSlot(plan, 21)).toBeNull();
    expect(nextCareerEventSlot(plan, 22)).toBe(22);

    const afterPersonal = completeCareerEventPlan(
      plan,
      "training_extra",
      22,
      23,
    );
    expect(afterPersonal.completedEventKeys).toEqual([
      "training_extra",
    ]);
    expect(afterPersonal.completedSlotAges).toEqual([22]);
    expect(afterPersonal.completedEventAges).toEqual([23]);

    const afterInjury = completeCareerEventPlan(
      { ...afterPersonal, injuryCount: 0 },
      "injury",
      24,
      24,
    );
    expect(afterInjury.completedEventKeys).toEqual([
      "training_extra",
    ]);
    expect(afterInjury.injuryCount).toBe(1);
  });

  it("never selects a duplicate personal event key within one plan", () => {
    let plan = completedPlan();
    let rngState = createClassicRngState(
      "phase-2:no-duplicate-events",
    );
    const selected: CareerEventKey[] = [];

    for (let step = 0; step < 7; step += 1) {
      const age = plan.slotAges[step]!;
      const selection = selectCareerEvent({
        context: { ...MAXIMAL_CONTEXT, age },
        mode: "long",
        plan,
        rngState,
        seed: "phase-2:no-duplicate-events",
        step,
      });

      expect(selection).not.toBeNull();
      selected.push(selection!.event.eventKey);
      rngState = selection!.rngState;
      plan = completeCareerEventPlan(
        plan,
        selection!.event.eventKey,
        age,
        age,
      );
    }

    expect(new Set(selected).size).toBe(selected.length);
    expect({ rngState, selected }).toEqual({
      rngState: 3_255_167_689,
      selected: [
        "personal_coach",
        "rival_offer",
        "training_extra",
        "club_national_team_conflict",
        "unexpected_prospect",
        "fan_backlash",
        "foreign_grandfather",
      ],
    });
  });

  it("enforces the two-period cooldown and age-37 ceiling", () => {
    const base = {
      context: { ...MAXIMAL_CONTEXT, age: 24 },
      mode: "normal" as const,
      rngState: createClassicRngState("phase-2:event-cooldown"),
      seed: "phase-2:event-cooldown",
      step: 1,
    };

    expect(
      selectCareerEvent({
        ...base,
        plan: {
          ...completedPlan(["training_extra"]),
          completedEventAges: [22],
        },
      }),
    ).toBeNull();
    expect(
      selectCareerEvent({
        ...base,
        context: { ...MAXIMAL_CONTEXT, age: 38 },
        plan: completedPlan(),
      }),
    ).toBeNull();
  });

  it("uses the derived injury stream without advancing the main stream", () => {
    const rngState = createClassicRngState(
      "phase-2:natural-injury-main",
    );
    let found:
      | {
          injuryType: string | undefined;
          rngState: number;
          seed: string;
        }
      | undefined;

    for (let index = 0; index < 1_000; index += 1) {
      const seed = `phase-2:natural-injury:${index}`;
      const selection = selectCareerEvent({
        context: MAXIMAL_CONTEXT,
        mode: "long",
        plan: { ...completedPlan(), injuryCount: 0 },
        rngState,
        seed,
        step: 9,
      });

      if (selection?.event.eventKey === "injury") {
        found = {
          injuryType: selection.event.injuryType,
          rngState: selection.rngState,
          seed,
        };
        break;
      }
    }

    expect(found).toEqual({
      injuryType: "hamstring",
      rngState: 3_253_285_302,
      seed: "phase-2:natural-injury:6",
    });
    expect(found!.rngState).toBe(rngState);
  });
});

describe("Classic career-event effects", () => {
  it("applies the exact positive and negative ability outcomes", () => {
    expect(
      effect("training_extra", "accept", "positive").modifiers,
    ).toMatchObject({ immediateOverallDelta: 3 });
    expect(
      effect("training_extra", "accept", "negative").modifiers,
    ).toMatchObject({ immediateOverallDelta: -2 });
    expect(
      effect("training_extra", "accept", "positive", {
        variantKey: "preseason_camp",
      }).modifiers,
    ).toMatchObject({ immediateOverallDelta: 4 });
    expect(
      effect("training_extra", "accept", "negative", {
        variantKey: "preseason_camp",
      }).modifiers,
    ).toMatchObject({ immediateOverallDelta: -3 });

    expect(
      effect("personal_coach", "accept", "positive").modifiers,
    ).toMatchObject({ permanentOverallDelta: 2 });
    expect(
      effect("personal_coach", "accept", "positive", {
        variantKey: "nutrition_plan",
      }).modifiers,
    ).toMatchObject({ permanentOverallDelta: 3 });
    expect(
      effect("personal_coach", "accept", "negative").modifiers,
    ).toMatchObject({ permanentOverallDelta: -2 });

    expect(
      effect(
        "mysterious_substance",
        "consume",
        "positive",
      ).modifiers,
    ).toMatchObject({
      immediateOverallDelta: 5,
      suspended: false,
    });
    expect(
      effect(
        "mysterious_substance",
        "consume",
        "negative",
      ).modifiers,
    ).toMatchObject({
      immediateOverallDelta: 0,
      suspended: true,
    });

    expect(
      effect("fan_backlash", "stay_and_fight").modifiers,
    ).toMatchObject({
      deferredOverallDelta: 2,
      immediateOverallDelta: -2,
    });
    expect(
      effect("return_home", "stay_abroad").modifiers,
    ).toMatchObject({
      deferredOverallDelta: 5,
      immediateOverallDelta: -5,
    });
    expect(
      effect("tax_trouble", "stay_and_fight").modifiers,
    ).toMatchObject({
      deferredOverallDelta: 3,
      immediateOverallDelta: -3,
    });
  });

  it("freezes the natural outcome draw and RNG state", () => {
    const result = effect("training_extra", "accept");

    expect({
      immediateOverallDelta:
        result.modifiers.immediateOverallDelta,
      outcomeKind: result.outcomeKind,
      rngState: result.rngState,
    }).toEqual({
      immediateOverallDelta: 3,
      outcomeKind: "positive",
      rngState: 2_392_787_838,
    });
  });

  it("applies the double-session 65% threshold independently", () => {
    let divergence:
      | {
          baseRole: string | undefined;
          doubleSessionRole: string | undefined;
          seed: string;
        }
      | undefined;

    for (let index = 0; index < 1_000; index += 1) {
      const seed = `phase-2:double-session:${index}`;
      const common = {
        eventKey: "season_load" as const,
        optionKey: "accept",
        rngState: createClassicRngState(seed),
      };
      const base = applyCareerEventChoice(common);
      const doubleSession = applyCareerEventChoice({
        ...common,
        variantKey: "double_session",
      });

      if (
        base.modifiers.roleOverride !==
        doubleSession.modifiers.roleOverride
      ) {
        divergence = {
          baseRole: base.modifiers.roleOverride,
          doubleSessionRole:
            doubleSession.modifiers.roleOverride,
          seed,
        };
        break;
      }
    }

    expect(divergence).toEqual({
      baseRole: "starter",
      doubleSessionRole: "substitute",
      seed: "phase-2:double-session:8",
    });
  });

  it("applies exact role, trophy, and national-team modifiers", () => {
    expect(
      effect("season_load", "accept", "positive").modifiers,
    ).toMatchObject({ roleOverride: "starter" });
    expect(
      effect("season_load", "accept", "negative").modifiers,
    ).toMatchObject({ roleOverride: "substitute" });
    expect(effect("season_load", "stay_calm").modifiers).toMatchObject({
      roleShift: -1,
    });
    expect(
      effect("position_change", "accept").modifiers,
    ).toMatchObject({
      deferredOverallDelta: 2,
      immediateOverallDelta: -2,
      roleOverride: "starter",
    });
    expect(
      effect("position_change", "reject").modifiers,
    ).toMatchObject({ roleShift: -1 });
    expect(
      effect("position_competition", "compete", "positive")
        .modifiers,
    ).toMatchObject({ roleOverride: "starter" });
    expect(
      effect("position_competition", "compete", "negative")
        .modifiers,
    ).toMatchObject({ roleOverride: "low_rotation" });
    expect(
      effect("unexpected_prospect", "mentor").modifiers,
    ).toMatchObject({
      clubWorldCupTrophyProbabilityMultiplier: 2,
      domesticCupTrophyProbabilityMultiplier: 2,
      leagueTrophyProbabilityMultiplier: 2,
      roleShift: -1,
    });
    expect(
      effect("club_priority", "prioritize_league").modifiers,
    ).toMatchObject({
      continentalPrimaryTrophyProbabilityMultiplier: 0.5,
      leagueTrophyProbabilityMultiplier: 2,
    });
    expect(
      effect(
        "club_priority",
        "prioritize_continental",
      ).modifiers,
    ).toMatchObject({
      continentalPrimaryTrophyProbabilityMultiplier: 2,
      leagueTrophyProbabilityMultiplier: 0.5,
    });
    expect(effect("rival_offer", "accept").modifiers).toMatchObject({
      clubWorldCupTrophyProbabilityMultiplier: 2,
      roleOverride: "high_rotation",
    });
    expect(
      effect("club_crisis", "stay_and_fight").modifiers,
    ).toMatchObject({
      clubWorldCupTrophyProbabilityMultiplier: 0.1,
      leagueTrophyProbabilityMultiplier: 0.1,
    });
    expect(
      effect("finish_high_school", "accept").modifiers,
    ).toMatchObject({
      permanentOverallDelta: 1,
      roleShift: -1,
    });
    expect(
      effect("controversial_statement", "apologize").modifiers,
    ).toMatchObject({ roleShift: -1 });
    expect(
      effect("club_national_team_conflict", "go_anyway", undefined, {
        targetTrophy: "world_cup",
      }).modifiers,
    ).toMatchObject({
      nationalTournament: "world_cup",
      nationalTournamentParticipation: "force",
      roleOverride: "substitute",
    });
    expect(
      effect("club_national_team_conflict", "comply", undefined, {
        targetTrophy: "world_cup",
      }).modifiers,
    ).toMatchObject({
      nationalTournament: "world_cup",
      nationalTournamentParticipation: "skip",
    });
    expect(
      effect("triumphant_return", undefined, undefined, {
        optionType: "join_club",
      }).modifiers,
    ).toMatchObject({ roleOverride: "starter" });
  });

  it("covers every no-op choice and probabilistic outcome branch", () => {
    const cases: Array<
      readonly [
        CareerEventKey,
        string | undefined,
        ForcedCareerEventOutcome | undefined,
      ]
    > = [
      ["training_extra", "reject", undefined],
      ["personal_coach", "reject", undefined],
      ["mysterious_substance", "reject", undefined],
      ["season_load", "accept", "positive"],
      ["position_change", "accept", undefined],
      ["position_competition", "compete", "positive"],
      ["unexpected_prospect", "mentor", undefined],
      ["club_priority", "prioritize_league", undefined],
      ["rival_offer", "reject", undefined],
      ["club_crisis", "stay_and_fight", undefined],
      ["fan_backlash", "stay_and_fight", undefined],
      ["return_home", "stay_abroad", undefined],
      ["giant_tattoo", "accept", "positive"],
      ["tax_trouble", "stay_and_fight", undefined],
      ["foreign_grandfather", "switch_national_team", undefined],
      ["finish_high_school", "reject", undefined],
      ["controversial_statement", "apologize", undefined],
      ["triumphant_return", undefined, undefined],
      ["club_national_team_conflict", "comply", undefined],
      ["injury_at_peak", "play_injured", "positive"],
      ["injury", "continue", undefined],
      ["decisive_penalty", "left", "positive"],
    ];

    expect(cases.map(([eventKey]) => eventKey)).toEqual(
      CAREER_EVENT_KEYS,
    );

    for (const [eventKey, optionKey, forcedOutcome] of cases) {
      const first = effect(eventKey, optionKey, forcedOutcome, {
        injuryType: eventKey === "injury" ? "hamstring" : undefined,
      });
      const replay = effect(eventKey, optionKey, forcedOutcome, {
        injuryType: eventKey === "injury" ? "hamstring" : undefined,
      });

      expect(first).toEqual(replay);
      expect(first.modifiers.statsMultiplier).toBe(1);
    }

    expect(
      effect("giant_tattoo", "accept", "positive").modifiers,
    ).toMatchObject({ permanentOverallDelta: 2 });
    expect(
      effect("giant_tattoo", "accept", "negative").modifiers,
    ).toMatchObject({ roleOverride: "substitute" });
    expect(
      effect("injury_at_peak", "play_injured", "positive", {
        targetClubTrophy: "league",
      }).modifiers,
    ).toMatchObject({
      clubTrophyOverride: {
        result: "force",
        trophy: "league",
      },
      immediateOverallDelta: -1,
    });
    expect(
      effect("injury_at_peak", "recover", "negative", {
        targetClubTrophy: "league",
      }).modifiers,
    ).toMatchObject({
      clubTrophyOverride: {
        result: "skip",
        trophy: "league",
      },
    });
    expect(
      effect("injury_at_peak", "play_injured", "negative", {
        targetClubTrophy: "league",
      }),
    ).toMatchObject({
      modifiers: {
        clubTrophyOverride: {
          result: "skip",
          trophy: "league",
        },
        immediateOverallDelta: -1,
      },
      outcomeKind: "negative",
    });
    expect(
      effect("injury_at_peak", "recover", "positive", {
        targetClubTrophy: "league",
      }),
    ).toMatchObject({
      modifiers: {
        clubTrophyOverride: {
          result: "force",
          trophy: "league",
        },
      },
      outcomeKind: "positive",
    });
    expect(
      effect("decisive_penalty", "right", "positive", {
        targetTrophy: "world_cup",
      }).modifiers,
    ).toMatchObject({
      nationalTrophyOverride: {
        result: "force",
        trophy: "world_cup",
      },
    });
    expect(
      effect("decisive_penalty", "left", "negative", {
        targetTrophy: "continental_primary",
      }).modifiers,
    ).toMatchObject({
      clubTrophyOverride: {
        result: "skip",
        trophy: "continental_primary",
      },
    });
  });

  it("applies every injury delta and offers retirement for severe veteran injuries", () => {
    for (const injury of CLASSIC_INJURIES) {
      const result = effect("injury", "continue", undefined, {
        injuryType: injury.type,
      });

      expect(result.modifiers).toMatchObject({
        immediateOverallDelta: injury.overallDelta,
        roleOverride: "substitute",
      });
    }

    const selection = selectCareerEvent({
      context: MAXIMAL_CONTEXT,
      forceInjury: "achilles",
      mode: "long",
      plan: { ...completedPlan(), injuryCount: 0 },
      rngState: createClassicRngState(
        "phase-2:forced-injury-selection",
      ),
      seed: "phase-2:forced-injury-selection",
      step: 7,
    });

    expect(selection!.event).toMatchObject({
      eventKey: "injury",
      injuryType: "achilles",
      optionKeys: ["continue"],
      retireAvailable: true,
    });
  });

  it("applies suspension length and deferred recovery without escaping 40–99", () => {
    const suspended = effect(
      "mysterious_substance",
      "consume",
      "negative",
    ).modifiers;
    const backlash = effect(
      "fan_backlash",
      "stay_and_fight",
    ).modifiers;

    expect(suspensionSeasonsForEvent(suspended, "long")).toBe(2);
    expect(suspensionSeasonsForEvent(suspended, "normal")).toBe(2);
    expect(suspensionSeasonsForEvent(suspended, "express")).toBe(3);
    expect(applyImmediateCareerEventEffects(41, backlash)).toBe(40);
    expect(applyDeferredCareerEventRecovery(40, backlash)).toBe(42);
    expect(
      applyImmediateCareerEventEffects(99, {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
        permanentOverallDelta: 5,
      }),
    ).toBe(99);
  });
});
