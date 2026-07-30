import { describe, expect, it } from "vitest";

import {
  ballonDorProbability,
  clubCupTrophyProbability,
  clubLeagueTrophyProbability,
  clubPrimaryTrophyProbability,
  clubSecondaryTrophyProbability,
  createCatalogClubTrophyContext,
  goldenBootProbability,
  promotionLeagueTrophyProbability,
  simulateClubTrophies,
  simulatePersonalAwards,
  trophyRoleMultiplier,
} from "./awards";
import { createClassicRngState } from "./classicRng";
import { CLASSIC_CATALOG } from "./catalog/classicCatalog";
import { DEFAULT_CAREER_EVENT_MODIFIERS } from "./careerEvents";
import {
  HIDDEN_TITLE_KEYS,
  aggregateCareerSummary,
  badgeTierForOverall,
  calculateCareerTotals,
  evaluateHiddenTitles,
  validateCareerTotals,
} from "./summary";
import type {
  CareerSummaryInput,
  ClassicSummarySeason,
  HiddenTitleKey,
} from "./summary";

const EMPTY_STATS = {
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
} as const;

function season(
  index: number,
  patch: Partial<ClassicSummarySeason> = {},
): ClassicSummarySeason {
  return {
    age: 16 + index,
    awards: [],
    id: `season-${index}`,
    index,
    marketValue: 100_000 * index,
    overall: 50 + index,
    stats: {
      appearances: 20,
      assists: 3,
      cleanSheets: 0,
      goals: 5,
      goalsConceded: 0,
    },
    suspended: false,
    teamId: "shanghai-port",
    trophies: [],
    ...patch,
  };
}

function career(
  patch: Partial<CareerSummaryInput> = {},
): CareerSummaryInput {
  return {
    nationalTeamPeriods: [],
    player: {
      age: 16,
      developmentProfile: "normal",
      marketValue: 100_000,
      nationalityFifaReputation: 3,
      nationalityIsoAlpha2: "CN",
      overall: 50,
      position: "ST",
      preferredNumber: 10,
    },
    retirementReason: "retirement_age",
    seasons: [],
    totals: {
      ...EMPTY_STATS,
      awards: 0,
      trophies: 0,
    },
    ...patch,
  };
}

describe("Classic trophies and awards", () => {
  it("freezes every club trophy probability table and role multiplier", () => {
    expect(
      [0, 1, 2, 3, 4, 5].map(clubLeagueTrophyProbability),
    ).toEqual([0, 0.01, 0.04, 0.18, 0.33, 0.5]);
    expect(
      [0, 1, 2, 3, 4, 5].map(clubCupTrophyProbability),
    ).toEqual([0.01, 0.03, 0.08, 0.18, 0.25, 0.3]);
    expect(
      [0, 1, 2, 3, 4, 5].map(clubPrimaryTrophyProbability),
    ).toEqual([0, 0.000_01, 0.04, 0.1, 0.14, 0.2]);
    expect(
      [0, 1, 2, 3, 4, 5].map(clubSecondaryTrophyProbability),
    ).toEqual([0, 0.05, 0.15, 0.02, 0, 0]);
    expect(
      [63, 64, 69, 74, 79, 84, 87, 89, 99].map(
        promotionLeagueTrophyProbability,
      ),
    ).toEqual([0.03, 0.03, 0.04, 0.06, 0.09, 0.13, 0.18, 0.25, 0.3]);
    expect([2, 3, 6, 10].map(trophyRoleMultiplier)).toEqual([
      1,
      1.1,
      1.3,
      1.6,
    ]);
  });

  it("simulates deterministic club trophies and explicit force/skip overrides", () => {
    const context = createCatalogClubTrophyContext(
      CLASSIC_CATALOG,
      "shanghai-port",
    );
    const input = {
      age: 18,
      club: CLASSIC_CATALOG.clubById.get("shanghai-port")!,
      context,
      modifiers: {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
        clubTrophyOverride: {
          result: "force" as const,
          trophy: "club_world_cup" as const,
        },
      },
      overall: 90,
      previousSeason: null,
      rngState: createClassicRngState("phase-2:club-trophies"),
    };
    const first = simulateClubTrophies(input);
    const replay = simulateClubTrophies(input);

    expect(first).toEqual(replay);
    expect(first.trophies).toContain("club_world_cup");
    expect(first).toEqual({
      rngState: 3_049_516_776,
      trophies: ["club_world_cup"],
    });

    const skipped = simulateClubTrophies({
      ...input,
      modifiers: {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
        clubTrophyOverride: {
          result: "skip",
          trophy: "club_world_cup",
        },
      },
    });

    expect(skipped.trophies).not.toContain("club_world_cup");
    expect(skipped.rngState).toBe(first.rngState);
  });

  it("respects prior continental qualification and secondary-cup exclusivity", () => {
    const club = CLASSIC_CATALOG.clubById.get("shanghai-port")!;
    const context = createCatalogClubTrophyContext(
      CLASSIC_CATALOG,
      club.id,
    );
    const previousSeason = {
      teamId: club.id,
      trophies: ["league" as const],
    };
    const primary = simulateClubTrophies({
      age: 22,
      club: { ...club, continentalReputation: 0 },
      context,
      modifiers: {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
        clubTrophyOverride: {
          result: "force",
          trophy: "continental_primary",
        },
      },
      overall: 90,
      previousSeason,
      rngState: createClassicRngState(
        "phase-2:continental-primary",
      ),
    });
    const secondary = simulateClubTrophies({
      age: 22,
      club: { ...club, continentalReputation: 0 },
      context,
      modifiers: {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
        clubTrophyOverride: {
          result: "force",
          trophy: "continental_secondary",
        },
      },
      overall: 90,
      previousSeason,
      rngState: createClassicRngState(
        "phase-2:continental-secondary",
      ),
    });

    expect(primary.trophies).toContain("continental_primary");
    expect(primary.trophies).not.toContain(
      "continental_secondary",
    );
    expect(secondary.trophies).toContain(
      "continental_secondary",
    );
  });

  it("freezes Ballon d'Or, Golden Glove, and Golden Boot thresholds", () => {
    expect(ballonDorProbability(84, false, false)).toBe(0);
    expect(ballonDorProbability(85, true, false)).toBe(0.01);
    expect(ballonDorProbability(90, true, true)).toBe(0.3);
    expect(ballonDorProbability(94, false, false)).toBe(0.5);
    expect(ballonDorProbability(94, true, false)).toBe(0.65);
    expect(ballonDorProbability(94, false, true)).toBe(0.8);
    expect(ballonDorProbability(94, true, true)).toBe(1);
    expect(ballonDorProbability(97, false, false)).toBe(1);
    expect(goldenBootProbability(24, true)).toBe(0);
    expect(goldenBootProbability(25, true)).toBe(0.2);
    expect(goldenBootProbability(32, true)).toBe(0.5);
    expect(goldenBootProbability(40, true)).toBe(1);
    expect(goldenBootProbability(40, false)).toBe(0);
  });

  it("separates goalkeeper and outfield personal awards deterministically", () => {
    const attacker = simulatePersonalAwards({
      clubTrophies: ["league", "continental_primary"],
      goldenBootEligible: true,
      goals: 40,
      overall: 97,
      rngState: createClassicRngState(
        "phase-2:personal-awards",
      ),
      roleGroup: "attacker",
    });
    const goalkeeper = simulatePersonalAwards({
      clubTrophies: ["league", "continental_primary"],
      goldenBootEligible: true,
      goals: 40,
      overall: 97,
      rngState: createClassicRngState(
        "phase-2:personal-awards",
      ),
      roleGroup: "goalkeeper",
    });

    expect(attacker.awards).toEqual([
      "ballon_dor",
      "golden_boot",
    ]);
    expect(goalkeeper.awards).toEqual(["golden_glove"]);
    expect(attacker.rngState).not.toBe(goalkeeper.rngState);
    expect({ attacker, goalkeeper }).toEqual({
      attacker: {
        awards: ["ballon_dor", "golden_boot"],
        rngState: 809_166_473,
      },
      goalkeeper: {
        awards: ["golden_glove"],
        rngState: 2_047_834_429,
      },
    });
  });
});

describe("Classic career summary", () => {
  it("aggregates club and national raw periods without double counting", () => {
    const seasons = [
      season(1, {
        awards: ["golden_boot"],
        stats: {
          appearances: 20,
          assists: 4,
          cleanSheets: 0,
          goals: 10,
          goalsConceded: 0,
        },
        trophies: ["league"],
      }),
      season(2, {
        marketValue: 5_000_000,
        overall: 82,
        stats: {
          appearances: 30,
          assists: 8,
          cleanSheets: 0,
          goals: 15,
          goalsConceded: 0,
        },
        teamId: "real-madrid",
        trophies: ["cup", "world_cup"],
      }),
      season(3, {
        stats: {
          appearances: 10,
          assists: 1,
          cleanSheets: 0,
          goals: 2,
          goalsConceded: 0,
        },
        teamId: "shanghai-port",
      }),
    ];
    const nationalTeamPeriods = [
      {
        stats: {
          appearances: 12,
          assists: 2,
          cleanSheets: 0,
          goals: 5,
          goalsConceded: 0,
        },
      },
    ];
    const totals = calculateCareerTotals(
      seasons,
      nationalTeamPeriods,
    );
    const input = career({
      nationalTeamPeriods,
      player: {
        ...career().player,
        marketValue: 4_000_000,
        overall: 79,
      },
      seasons,
      totals,
    });
    const summary = aggregateCareerSummary(input);

    expect(totals).toEqual({
      appearances: 72,
      assists: 15,
      awards: 1,
      cleanSheets: 0,
      goals: 32,
      goalsConceded: 0,
      trophies: 3,
    });
    expect(summary.maxOverall).toBe(82);
    expect(summary.maxMarketValue).toBe(5_000_000);
    expect(summary.clubs).toEqual([
      {
        stats: {
          appearances: 30,
          assists: 5,
          cleanSheets: 0,
          goals: 12,
          goalsConceded: 0,
        },
        teamId: "shanghai-port",
        trophies: ["league"],
      },
      {
        stats: {
          appearances: 30,
          assists: 8,
          cleanSheets: 0,
          goals: 15,
          goalsConceded: 0,
        },
        teamId: "real-madrid",
        trophies: ["cup"],
      },
    ]);
    expect(summary.nationalStats).toEqual(
      nationalTeamPeriods[0]!.stats,
    );
    expect(summary.nationalTrophies).toEqual(["world_cup"]);
    expect(summary.awards).toEqual(["golden_boot"]);
    expect(validateCareerTotals(input)).toEqual([]);
    expect(
      validateCareerTotals({
        ...input,
        totals: { ...totals, goals: totals.goals + 1 },
      }),
    ).toEqual(["totals.goals expected 32, received 33"]);
  });

  it("freezes every badge boundary and retirement ending", () => {
    expect(
      [69, 70, 79, 80, 89, 90, 94, 95, 98, 99].map(
        badgeTierForOverall,
      ),
    ).toEqual([
      "bronze",
      "silver",
      "silver",
      "gold",
      "gold",
      "cyan",
      "cyan",
      "elite",
      "elite",
      "special",
    ]);
    expect(
      (
        [
          "retirement_age",
          "voluntary",
          "no_offers",
        ] as const
      ).map(
        (retirementReason) =>
          aggregateCareerSummary(
            career({ retirementReason }),
          ).ending,
      ),
    ).toEqual(["retirement_age", "voluntary", "no_offers"]);
  });

  it.each([
    [
      "national_miracle",
      career({
        player: {
          ...career().player,
          nationalityFifaReputation: 1,
        },
        seasons: [
          season(1, {
            trophies: ["world_cup"],
          }),
        ],
      }),
      career({
        player: {
          ...career().player,
          nationalityFifaReputation: 2,
        },
        seasons: [
          season(1, {
            trophies: ["world_cup"],
          }),
        ],
      }),
    ],
    [
      "one_club_man",
      career({
        seasons: Array.from({ length: 16 }, (_, index) =>
          season(index + 1),
        ),
      }),
      career({
        seasons: Array.from({ length: 15 }, (_, index) =>
          season(index + 1),
        ),
      }),
    ],
    [
      "journeyman",
      career({
        seasons: Array.from({ length: 10 }, (_, index) =>
          season(index + 1, { teamId: `club-${index}` }),
        ),
      }),
      career({
        seasons: Array.from({ length: 9 }, (_, index) =>
          season(index + 1, { teamId: `club-${index}` }),
        ),
      }),
    ],
    [
      "uncrowned_king",
      career({
        player: { ...career().player, overall: 88 },
      }),
      career({
        player: { ...career().player, overall: 87 },
      }),
    ],
    [
      "redemption",
      career({
        seasons: [
          season(1, {
            awards: ["ballon_dor"],
            suspended: true,
          }),
        ],
      }),
      career({
        seasons: [
          season(1, {
            awards: ["ballon_dor"],
            suspended: false,
          }),
        ],
      }),
    ],
    [
      "new_messi",
      career({
        player: {
          ...career().player,
          nationalityIsoAlpha2: "AR",
          overall: 90,
          preferredNumber: 10,
        },
      }),
      career({
        player: {
          ...career().player,
          nationalityIsoAlpha2: "AR",
          overall: 89,
          preferredNumber: 10,
        },
      }),
    ],
    [
      "phenomenon",
      career({
        player: {
          ...career().player,
          nationalityIsoAlpha2: "BR",
          overall: 90,
          position: "ST",
          preferredNumber: 9,
        },
      }),
      career({
        player: {
          ...career().player,
          nationalityIsoAlpha2: "BR",
          overall: 90,
          position: "RW",
          preferredNumber: 9,
        },
      }),
    ],
    [
      "iron_man",
      career({
        totals: {
          ...career().totals,
          appearances: 1_000,
        },
      }),
      career({
        totals: {
          ...career().totals,
          appearances: 999,
        },
      }),
    ],
    [
      "late_bloomer",
      career({
        player: {
          ...career().player,
          developmentProfile: "late",
          overall: 88,
        },
      }),
      career({
        player: {
          ...career().player,
          developmentProfile: "late",
          overall: 87,
        },
      }),
    ],
    [
      "king_of_football",
      career({
        player: {
          ...career().player,
          developmentProfile: "legend",
          overall: 95,
        },
      }),
      career({
        player: {
          ...career().player,
          developmentProfile: "legend",
          overall: 94,
        },
      }),
    ],
    [
      "go_out_on_top",
      career({
        player: { ...career().player, overall: 85 },
        retirementReason: "voluntary",
        seasons: [season(17, { age: 33, overall: 85 })],
      }),
      career({
        player: { ...career().player, overall: 85 },
        retirementReason: "voluntary",
        seasons: [season(18, { age: 34, overall: 85 })],
      }),
    ],
    [
      "evergreen",
      career({
        seasons: [season(26, { age: 42 })],
      }),
      career({
        seasons: [season(25, { age: 41 })],
      }),
    ],
  ] as const)(
    "evaluates the %s hidden-title boundary",
    (
      title: HiddenTitleKey,
      positive: CareerSummaryInput,
      negative: CareerSummaryInput,
    ) => {
      expect(evaluateHiddenTitles(positive)).toContain(title);
      expect(evaluateHiddenTitles(negative)).not.toContain(title);
    },
  );

  it("exposes exactly the 12 frozen hidden title keys", () => {
    expect(HIDDEN_TITLE_KEYS).toEqual([
      "national_miracle",
      "one_club_man",
      "journeyman",
      "uncrowned_king",
      "redemption",
      "new_messi",
      "phenomenon",
      "iron_man",
      "late_bloomer",
      "king_of_football",
      "go_out_on_top",
      "evergreen",
    ]);
  });
});
