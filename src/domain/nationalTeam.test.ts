import { describe, expect, it } from "vitest";

import { createClassicRngState } from "./classicRng";
import { CLASSIC_CATALOG } from "./catalog/classicCatalog";
import type { ConfederationId } from "./catalog/classicCatalog";
import {
  nationalCallUpThreshold,
  nationalTeamBaseOverall,
  planNationalTournaments,
  resolveNationalTournamentSeason,
  simulateNationalTeamPeriod,
} from "./nationalTeam";

const CONFEDERATION_FIXTURES: Readonly<
  Record<ConfederationId, string>
> = {
  UEFA: "ESP",
  CONMEBOL: "BRA",
  AFC: "CHN",
  CAF: "MAR",
  CONCACAF: "USA",
  OFC: "NZL",
};

describe("Classic national-team simulation", () => {
  it("maps all six confederations through frozen call-up and team-strength bands", () => {
    const matrix = Object.entries(CONFEDERATION_FIXTURES).map(
      ([confederation, fifaCode]) => {
        const country =
          CLASSIC_CATALOG.countryByFifaCode.get(fifaCode);

        expect(country).toBeDefined();
        expect(country!.confederation).toBe(confederation);

        return {
          baseOverall: nationalTeamBaseOverall(
            country!.internationalReputation,
          ),
          confederation,
          fifaCode,
          threshold: nationalCallUpThreshold(
            country!.internationalReputation,
          ),
        };
      },
    );

    expect(matrix).toEqual([
      {
        baseOverall: 85,
        confederation: "UEFA",
        fifaCode: "ESP",
        threshold: 83,
      },
      {
        baseOverall: 85,
        confederation: "CONMEBOL",
        fifaCode: "BRA",
        threshold: 83,
      },
      {
        baseOverall: 75,
        confederation: "AFC",
        fifaCode: "CHN",
        threshold: 70,
      },
      {
        baseOverall: 80,
        confederation: "CAF",
        fifaCode: "MAR",
        threshold: 78,
      },
      {
        baseOverall: 77,
        confederation: "CONCACAF",
        fifaCode: "USA",
        threshold: 74,
      },
      {
        baseOverall: 75,
        confederation: "OFC",
        fifaCode: "NZL",
        threshold: 70,
      },
    ]);
  });

  it("plans four-year continental and World Cup windows deterministically", () => {
    const qualificationMatrix: Array<{
      fifaCode: string;
      rngState: number;
      worldCupQualification: boolean[];
    }> = [];

    for (const fifaCode of Object.values(
      CONFEDERATION_FIXTURES,
    )) {
      const country =
        CLASSIC_CATALOG.countryByFifaCode.get(fifaCode)!;
      const input = {
        age: 17,
        continentalReputation: country.continentalReputation,
        rngState: createClassicRngState(
          `phase-2:national-plan:${fifaCode}`,
        ),
        seasons: 8,
      };
      const first = planNationalTournaments(input);
      const replay = planNationalTournaments(input);

      expect(first).toEqual(replay);
      expect(
        first.tournaments.map((tournament) => [
          tournament.age,
          tournament.trophy,
        ]),
      ).toEqual([
        [17, "national_continental"],
        [19, "world_cup"],
        [21, "national_continental"],
        [23, "world_cup"],
      ]);
      expect(
        first.tournaments
          .filter(
            (tournament) =>
              tournament.trophy === "national_continental",
          )
          .every((tournament) => tournament.selectionQualified),
      ).toBe(true);
      qualificationMatrix.push({
        fifaCode,
        rngState: first.rngState,
        worldCupQualification: first.tournaments
          .filter(
            (tournament) =>
              tournament.trophy === "world_cup",
          )
          .map(
            (tournament) => tournament.selectionQualified,
          ),
      });
    }

    expect(qualificationMatrix).toEqual([
      {
        fifaCode: "ESP",
        rngState: 294_571_460,
        worldCupQualification: [true, true],
      },
      {
        fifaCode: "BRA",
        rngState: 1_401_929_212,
        worldCupQualification: [true, true],
      },
      {
        fifaCode: "CHN",
        rngState: 4_103_872_585,
        worldCupQualification: [false, false],
      },
      {
        fifaCode: "MAR",
        rngState: 1_010_001_016,
        worldCupQualification: [true, true],
      },
      {
        fifaCode: "USA",
        rngState: 2_922_458_809,
        worldCupQualification: [true, true],
      },
      {
        fifaCode: "NZL",
        rngState: 1_302_814_233,
        worldCupQualification: [true, true],
      },
    ]);
  });

  it("keeps selection qualification separate from tournament outcome", () => {
    const rngState = createClassicRngState(
      "phase-2:national-outcome",
    );
    const planned = [
      {
        age: 19,
        selectionQualified: true,
        trophy: "world_cup" as const,
      },
    ];
    const belowThreshold = resolveNationalTournamentSeason({
      age: 19,
      continentalReputation: 1,
      fifaReputation: 0,
      internationalReputation: 1,
      overall: 69,
      planned,
      rngState,
      suspended: false,
    });

    expect(belowThreshold).toEqual({
      calledUp: false,
      records: [
        {
          status: "not_selected",
          trophy: "world_cup",
        },
      ],
      rngState,
      trophies: [],
    });

    const forcedChampion = resolveNationalTournamentSeason({
      age: 19,
      continentalReputation: 1,
      fifaReputation: 0,
      internationalReputation: 1,
      nationalTrophyOverride: {
        result: "force",
        trophy: "world_cup",
      },
      overall: 70,
      planned,
      rngState,
      suspended: false,
    });

    expect(forcedChampion.calledUp).toBe(true);
    expect(forcedChampion.trophies).toEqual(["world_cup"]);
    expect(forcedChampion.records).toEqual([
      {
        result: "champion",
        status: "played",
        trophy: "world_cup",
      },
    ]);
    expect(forcedChampion.rngState).not.toBe(rngState);
  });

  it("draws frozen continental and World Cup exit rounds", () => {
    const continental = resolveNationalTournamentSeason({
      age: 17,
      continentalReputation: 3,
      fifaReputation: 2,
      internationalReputation: 3,
      overall: 82,
      planned: [
        {
          age: 17,
          selectionQualified: true,
          trophy: "national_continental",
        },
      ],
      rngState: createClassicRngState(
        "phase-2:national-continental",
      ),
      suspended: false,
    });
    const worldCup = resolveNationalTournamentSeason({
      age: 19,
      continentalReputation: 3,
      fifaReputation: 2,
      internationalReputation: 3,
      overall: 82,
      planned: [
        {
          age: 19,
          selectionQualified: true,
          trophy: "world_cup",
        },
      ],
      rngState: createClassicRngState(
        "phase-2:national-world-cup",
      ),
      suspended: false,
    });

    expect({
      continental,
      worldCup,
    }).toEqual({
      continental: {
        calledUp: true,
        records: [
          {
            result: "qf",
            status: "played",
            trophy: "national_continental",
          },
        ],
        rngState: 2_144_919_573,
        trophies: [],
      },
      worldCup: {
        calledUp: true,
        records: [
          {
            result: "qf",
            status: "played",
            trophy: "world_cup",
          },
        ],
        rngState: 3_321_964_433,
        trophies: [],
      },
    });
  });

  it("records failed qualification and suspension without consuming RNG", () => {
    const rngState = createClassicRngState(
      "phase-2:national-skip",
    );
    const unqualified = resolveNationalTournamentSeason({
      age: 19,
      continentalReputation: 0,
      fifaReputation: 0,
      internationalReputation: 1,
      overall: 90,
      planned: [
        {
          age: 19,
          selectionQualified: false,
          trophy: "world_cup",
        },
      ],
      rngState,
      suspended: false,
    });

    expect(unqualified).toEqual({
      calledUp: false,
      records: [
        {
          status: "not_qualified",
          trophy: "world_cup",
        },
      ],
      rngState,
      trophies: [],
    });

    expect(
      resolveNationalTournamentSeason({
        age: 19,
        continentalReputation: 6,
        fifaReputation: 5,
        internationalReputation: 5,
        overall: 99,
        planned: [
          {
            age: 19,
            selectionQualified: true,
            trophy: "world_cup",
          },
        ],
        rngState,
        suspended: true,
      }),
    ).toEqual({
      calledUp: false,
      records: [],
      rngState,
      trophies: [],
    });

    expect(
      resolveNationalTournamentSeason({
        age: 19,
        continentalReputation: 6,
        fifaReputation: 5,
        internationalReputation: 5,
        nationalTournament: "world_cup",
        nationalTournamentParticipation: "skip",
        overall: 99,
        planned: [
          {
            age: 19,
            selectionQualified: true,
            trophy: "world_cup",
          },
        ],
        rngState,
        suspended: false,
      }),
    ).toEqual({
      calledUp: false,
      records: [
        {
          status: "not_selected",
          trophy: "world_cup",
        },
      ],
      rngState,
      trophies: [],
    });
  });

  it("aggregates only eligible seasons into deterministic national totals", () => {
    const seasons = [
      { age: 17, overall: 69, suspended: false },
      { age: 18, overall: 72, suspended: false },
      { age: 19, overall: 75, suspended: true },
      { age: 20, overall: 78, suspended: false },
    ];
    const tournaments = [
      {
        age: 17,
        selectionQualified: true,
        trophy: "national_continental" as const,
      },
    ];
    const attacker = simulateNationalTeamPeriod({
      careerId: "phase-2-national-period",
      internationalReputation: 1,
      nationalityFifaCode: "CHN",
      periodIndex: 0,
      roleGroup: "attacker",
      seasons,
      tournaments,
    });
    const replay = simulateNationalTeamPeriod({
      careerId: "phase-2-national-period",
      internationalReputation: 1,
      nationalityFifaCode: "CHN",
      periodIndex: 0,
      roleGroup: "attacker",
      seasons,
      tournaments,
    });
    const goalkeeper = simulateNationalTeamPeriod({
      careerId: "phase-2-national-period-gk",
      internationalReputation: 1,
      nationalityFifaCode: "CHN",
      periodIndex: 0,
      roleGroup: "goalkeeper",
      seasons,
      tournaments,
    });

    expect(attacker).toEqual(replay);
    expect(attacker).not.toBeNull();
    expect(attacker!.ageStart).toBe(17);
    expect(attacker!.ageEnd).toBe(20);
    expect(attacker!.stats.appearances).toBeGreaterThanOrEqual(0);
    expect(attacker!.stats.goals).toBeGreaterThanOrEqual(0);
    expect(attacker!.stats.cleanSheets).toBe(0);
    expect(goalkeeper).not.toBeNull();
    expect(goalkeeper!.stats.goals).toBe(0);
    expect(goalkeeper!.stats.assists).toBe(0);
    expect(goalkeeper!.stats.cleanSheets).toBeGreaterThanOrEqual(
      0,
    );
    expect({
      attacker,
      goalkeeper,
    }).toEqual({
      attacker: {
        ageEnd: 20,
        ageStart: 17,
        id: "phase-2-national-period-national-team-period-0",
        nationalityFifaCode: "CHN",
        overall: 78,
        periodIndex: 0,
        rngState: 1_161_364_257,
        stats: {
          appearances: 12,
          assists: 0,
          cleanSheets: 0,
          goals: 1,
          goalsConceded: 0,
        },
      },
      goalkeeper: {
        ageEnd: 20,
        ageStart: 17,
        id: "phase-2-national-period-gk-national-team-period-0",
        nationalityFifaCode: "CHN",
        overall: 78,
        periodIndex: 0,
        rngState: 2_400_123_785,
        stats: {
          appearances: 16,
          assists: 0,
          cleanSheets: 4,
          goals: 0,
          goalsConceded: 20,
        },
      },
    });
  });

  it("returns no national period when every season misses selection", () => {
    expect(
      simulateNationalTeamPeriod({
        careerId: "phase-2-national-period-none",
        internationalReputation: 5,
        nationalityFifaCode: "ESP",
        periodIndex: 0,
        roleGroup: "creator",
        seasons: [
          { age: 17, overall: 82, suspended: false },
          { age: 18, overall: 99, suspended: true },
        ],
        tournaments: [],
      }),
    ).toBeNull();
  });
});
