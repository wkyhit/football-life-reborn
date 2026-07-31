import {
  classicChance,
  classicRandomInteger,
  deriveClassicRngState,
  nextClassicFloat,
} from "./classicRng";
import {
  resolveClassicSquadRoleAgainstBase,
  simulateRoleSeason,
} from "./role";
import type {
  ClassicSeasonStats,
  ClassicSquadRole,
  RoleGroup,
} from "./role";

export type NationalTrophy =
  | "national_continental"
  | "world_cup";

export type NationalTournamentResult =
  | "group"
  | "r16"
  | "qf"
  | "sf"
  | "final"
  | "champion";

export type PlannedNationalTournament = {
  readonly age: number;
  readonly selectionQualified: boolean;
  readonly trophy: NationalTrophy;
};

export type NationalTournamentRecord =
  | {
      readonly status: "not_qualified" | "not_selected";
      readonly trophy: NationalTrophy;
    }
  | {
      readonly result: NationalTournamentResult;
      readonly status: "played";
      readonly trophy: NationalTrophy;
    };

export type NationalPeriodSeason = {
  readonly age: number;
  readonly overall: number;
  readonly suspended: boolean;
};

export type NationalTeamPeriod = {
  readonly ageEnd: number;
  readonly ageStart: number;
  readonly id: string;
  readonly nationalityFifaCode: string;
  readonly overall: number;
  readonly periodIndex: number;
  readonly rngState: number;
  readonly stats: ClassicSeasonStats;
};

export const NATIONAL_CALL_UP_THRESHOLDS = [
  60,
  70,
  74,
  78,
  80,
  83,
] as const;
const NATIONAL_TEAM_BASE_OVERALLS = [
  70,
  75,
  77,
  80,
  83,
  85,
] as const;
const CONTINENTAL_WIN_PROBABILITIES = [
  0.000_01,
  0.02,
  0.05,
  0.1,
  0.2,
  0.3,
  0.8,
] as const;
const WORLD_CUP_QUALIFICATION_PROBABILITIES = [
  0.03,
  0.25,
  0.6,
  0.85,
  1,
  1,
  1,
] as const;
const WORLD_CUP_WIN_PROBABILITIES = [
  0.004,
  0.008,
  0.05,
  0.08,
  0.12,
  0.18,
] as const;
const WORLD_CUP_EXIT_DISTRIBUTIONS = [
  [0.78, 0.18, 0.035, 0.004, 0.001],
  [0.6, 0.28, 0.09, 0.02, 0.01],
  [0.35, 0.35, 0.2, 0.07, 0.03],
  [0.2, 0.3, 0.28, 0.14, 0.08],
  [0.12, 0.25, 0.3, 0.2, 0.13],
  [0.08, 0.2, 0.3, 0.24, 0.18],
] as const;
const CONTINENTAL_EXIT_DISTRIBUTIONS = [
  [0.6, 0.25, 0.1, 0.04, 0.01],
  [0.35, 0.35, 0.2, 0.07, 0.03],
  [0.2, 0.3, 0.28, 0.15, 0.07],
  [0.12, 0.25, 0.3, 0.21, 0.12],
  [0.08, 0.2, 0.3, 0.25, 0.17],
  [0.05, 0.15, 0.28, 0.3, 0.22],
] as const;
const NATIONAL_SCORING_MULTIPLIER = 0.6;
const OUTFIELD_APPEARANCE_RATIOS: Readonly<
  Record<ClassicSquadRole, readonly [number, number]>
> = {
  starter: [0.55, 1],
  high_rotation: [0.3, 0.6],
  low_rotation: [0.15, 0.35],
  substitute: [0, 0.2],
  third_keeper: [0, 0.2],
};
const GOALKEEPER_APPEARANCE_RATIOS: Readonly<
  Record<ClassicSquadRole, readonly [number, number]>
> = {
  starter: [0.6, 1],
  high_rotation: [0.05, 0.25],
  low_rotation: [0.05, 0.25],
  substitute: [0.05, 0.25],
  third_keeper: [0, 0.08],
};
const EMPTY_STATS: ClassicSeasonStats = {
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
};

export function nationalCallUpThreshold(
  internationalReputation: number,
): number {
  return NATIONAL_CALL_UP_THRESHOLDS[
    clampInteger(
      internationalReputation,
      0,
      NATIONAL_CALL_UP_THRESHOLDS.length - 1,
    )
  ]!;
}

export function nationalTeamBaseOverall(
  internationalReputation: number,
): number {
  return NATIONAL_TEAM_BASE_OVERALLS[
    clampInteger(
      internationalReputation,
      0,
      NATIONAL_TEAM_BASE_OVERALLS.length - 1,
    )
  ]!;
}

export function planNationalTournaments(input: {
  readonly age: number;
  readonly continentalReputation: number;
  readonly rngState: number;
  readonly seasons: number;
}): {
  readonly rngState: number;
  readonly tournaments: readonly PlannedNationalTournament[];
} {
  const tournaments: PlannedNationalTournament[] = [];
  let rngState = input.rngState;

  for (let offset = 0; offset < input.seasons; offset += 1) {
    const age = input.age + offset;

    if (isFourYearTournamentAge(age, 17)) {
      tournaments.push({
        age,
        selectionQualified: true,
        trophy: "national_continental",
      });
    }

    if (isFourYearTournamentAge(age, 19)) {
      const probability =
        WORLD_CUP_QUALIFICATION_PROBABILITIES[
          clampInteger(
            input.continentalReputation,
            0,
            WORLD_CUP_QUALIFICATION_PROBABILITIES.length - 1,
          )
        ]!;
      const qualification = classicChance(
        rngState,
        probability,
      );
      rngState = qualification.state;
      tournaments.push({
        age,
        selectionQualified: qualification.success,
        trophy: "world_cup",
      });
    }
  }

  return {
    rngState,
    tournaments: Object.freeze(tournaments),
  };
}

export function resolveNationalTournamentSeason(input: {
  readonly age: number;
  readonly continentalReputation: number;
  readonly fifaReputation: number;
  readonly internationalReputation: number;
  readonly nationalTournament?: NationalTrophy;
  readonly nationalTournamentParticipation?: "force" | "skip";
  readonly nationalTrophyOverride?: {
    readonly result: "force" | "skip";
    readonly trophy: NationalTrophy;
  };
  readonly overall: number;
  readonly planned: readonly PlannedNationalTournament[];
  readonly rngState: number;
  readonly suspended: boolean;
}): {
  readonly calledUp: boolean;
  readonly records: readonly NationalTournamentRecord[];
  readonly rngState: number;
  readonly trophies: readonly NationalTrophy[];
} {
  if (input.suspended) {
    return {
      calledUp: false,
      records: [],
      rngState: input.rngState,
      trophies: [],
    };
  }

  const continental = input.planned.find(
    (tournament) =>
      tournament.age === input.age &&
      tournament.trophy === "national_continental",
  );
  const worldCup = input.planned.find(
    (tournament) =>
      tournament.age === input.age &&
      tournament.trophy === "world_cup",
  );
  const scheduled = [continental, worldCup].filter(
    (
      tournament,
    ): tournament is PlannedNationalTournament =>
      tournament !== undefined,
  );
  const hasQualifiedTournament = scheduled.some(
    (tournament) => tournament.selectionQualified,
  );

  if (!hasQualifiedTournament) {
    return {
      calledUp: false,
      records: scheduled.map((tournament) => ({
        status: "not_qualified",
        trophy: tournament.trophy,
      })),
      rngState: input.rngState,
      trophies: [],
    };
  }

  const participationTargetsCurrentTournament =
    input.nationalTournament !== undefined &&
    scheduled.some(
      (tournament) =>
        tournament.trophy === input.nationalTournament,
    );
  const skipsTournament =
    input.nationalTournamentParticipation === "skip" &&
    participationTargetsCurrentTournament;
  const missesSelection =
    input.overall <
      nationalCallUpThreshold(input.internationalReputation) &&
    input.nationalTournamentParticipation !== "force";

  if (skipsTournament || missesSelection) {
    return {
      calledUp: false,
      records: selectionRecords(scheduled, "not_selected"),
      rngState: input.rngState,
      trophies: [],
    };
  }

  const trophies: NationalTrophy[] = [];
  const outcomes = new Map<
    NationalTrophy,
    NationalTournamentResult
  >();
  let rngState = input.rngState;

  if (continental?.selectionQualified) {
    const resolution = resolveTournamentOutcome({
      exitDistribution:
        CONTINENTAL_EXIT_DISTRIBUTIONS[
          clampInteger(
            input.continentalReputation,
            0,
            CONTINENTAL_EXIT_DISTRIBUTIONS.length - 1,
          )
        ]!,
      override: input.nationalTrophyOverride,
      rngState,
      trophy: "national_continental",
      winProbability:
        CONTINENTAL_WIN_PROBABILITIES[
          clampInteger(
            input.continentalReputation,
            0,
            CONTINENTAL_WIN_PROBABILITIES.length - 1,
          )
        ]!,
    });
    rngState = resolution.rngState;
    outcomes.set("national_continental", resolution.result);

    if (resolution.result === "champion") {
      trophies.push("national_continental");
    }
  }

  if (worldCup?.selectionQualified) {
    const resolution = resolveTournamentOutcome({
      exitDistribution:
        WORLD_CUP_EXIT_DISTRIBUTIONS[
          clampInteger(
            input.fifaReputation,
            0,
            WORLD_CUP_EXIT_DISTRIBUTIONS.length - 1,
          )
        ]!,
      override: input.nationalTrophyOverride,
      rngState,
      trophy: "world_cup",
      winProbability:
        WORLD_CUP_WIN_PROBABILITIES[
          clampInteger(
            input.fifaReputation,
            0,
            WORLD_CUP_WIN_PROBABILITIES.length - 1,
          )
        ]!,
    });
    rngState = resolution.rngState;
    outcomes.set("world_cup", resolution.result);

    if (resolution.result === "champion") {
      trophies.push("world_cup");
    }
  }

  return {
    calledUp: true,
    records: scheduled.map((tournament) =>
      tournament.selectionQualified
        ? {
            result: outcomes.get(tournament.trophy)!,
            status: "played" as const,
            trophy: tournament.trophy,
          }
        : {
            status: "not_qualified" as const,
            trophy: tournament.trophy,
          },
    ),
    rngState,
    trophies: Object.freeze(trophies),
  };
}

export function simulateNationalTeamPeriod(input: {
  readonly careerId: string;
  readonly internationalReputation: number;
  readonly nationalityFifaCode: string;
  readonly periodIndex: number;
  readonly roleGroup: RoleGroup;
  readonly seasons: readonly NationalPeriodSeason[];
  readonly statsMultiplier?: number;
  readonly tournaments: readonly PlannedNationalTournament[];
}): NationalTeamPeriod | null {
  if (input.seasons.length === 0) {
    return null;
  }

  const callUpThreshold = nationalCallUpThreshold(
    input.internationalReputation,
  );
  const eligible = input.seasons.filter(
    (season) =>
      !season.suspended && season.overall >= callUpThreshold,
  );

  if (eligible.length === 0) {
    return null;
  }

  const baseOverall = nationalTeamBaseOverall(
    input.internationalReputation,
  );
  let rngState = deriveClassicRngState(
    input.careerId,
    "national-team-stats",
    input.periodIndex,
  );
  let stats = EMPTY_STATS;

  for (const season of eligible) {
    const simulated = simulateRoleSeason({
      appearanceMultiplier: 1,
      baseOverallOverride: baseOverall,
      clubContinentalReputation: 1,
      clubDomesticReputation: 2,
      clubInternationalReputation:
        input.internationalReputation,
      overall: season.overall,
      rngState,
      roleGroup: input.roleGroup,
      roleShift: 0,
      scoringMultiplier: NATIONAL_SCORING_MULTIPLIER,
      statsMultiplier: input.statsMultiplier ?? 1,
      strengthReputationOverride:
        input.internationalReputation,
      suspended: false,
    });
    rngState = simulated.rngState;
    stats = addStats(stats, simulated.stats);
  }

  const lastEligible = eligible[eligible.length - 1]!;
  const role = resolveClassicSquadRoleAgainstBase({
    baseOverall,
    overall: lastEligible.overall,
    roleGroup: input.roleGroup,
  });
  const tournamentScheduled = input.tournaments.some(
    (tournament) => tournament.selectionQualified,
  );
  const availableMatches =
    input.seasons.length * 8 + (tournamentScheduled ? 5 : 0);
  const availabilityRatio =
    eligible.length / input.seasons.length;
  const range = nationalAppearanceRange(
    role,
    input.roleGroup === "goalkeeper",
    availableMatches,
    availabilityRatio,
  );
  const appearanceDraw = classicRandomInteger(
    rngState,
    range[0],
    range[1],
  );
  rngState = appearanceDraw.state;
  stats = scaleStatsToAppearances(stats, appearanceDraw.value);

  const firstSeason = input.seasons[0]!;
  const lastSeason = input.seasons[input.seasons.length - 1]!;

  return {
    ageEnd: lastSeason.age,
    ageStart: firstSeason.age,
    id: `${input.careerId}-national-team-period-${input.periodIndex}`,
    nationalityFifaCode: input.nationalityFifaCode,
    overall: lastSeason.overall,
    periodIndex: input.periodIndex,
    rngState,
    stats,
  };
}

function resolveTournamentOutcome(input: {
  readonly exitDistribution: readonly number[];
  readonly override:
    | {
        readonly result: "force" | "skip";
        readonly trophy: NationalTrophy;
      }
    | undefined;
  readonly rngState: number;
  readonly trophy: NationalTrophy;
  readonly winProbability: number;
}): {
  readonly result: NationalTournamentResult;
  readonly rngState: number;
} {
  const championDraw = classicChance(
    input.rngState,
    input.winProbability,
  );
  const overrideApplies = input.override?.trophy === input.trophy;
  const champion = overrideApplies
    ? input.override?.result === "force"
    : championDraw.success;

  if (champion) {
    return {
      result: "champion",
      rngState: championDraw.state,
    };
  }

  return drawTournamentExit(
    championDraw.state,
    input.exitDistribution,
  );
}

function drawTournamentExit(
  rngState: number,
  distribution: readonly number[],
): {
  readonly result: Exclude<
    NationalTournamentResult,
    "champion"
  >;
  readonly rngState: number;
} {
  const results = [
    "group",
    "r16",
    "qf",
    "sf",
    "final",
  ] as const;
  const draw = nextClassicFloat(rngState);
  let cumulative = 0;

  for (let index = 0; index < results.length; index += 1) {
    cumulative += distribution[index] ?? 0;

    if (draw.value < cumulative) {
      return {
        result: results[index]!,
        rngState: draw.state,
      };
    }
  }

  return {
    result: "final",
    rngState: draw.state,
  };
}

function selectionRecords(
  tournaments: readonly PlannedNationalTournament[],
  qualifiedStatus: "not_selected",
): NationalTournamentRecord[] {
  return tournaments.map((tournament) => ({
    status: tournament.selectionQualified
      ? qualifiedStatus
      : "not_qualified",
    trophy: tournament.trophy,
  }));
}

function nationalAppearanceRange(
  role: ClassicSquadRole,
  goalkeeper: boolean,
  matches: number,
  availabilityRatio: number,
): readonly [number, number] {
  const ratios = goalkeeper
    ? GOALKEEPER_APPEARANCE_RATIOS[role]
    : OUTFIELD_APPEARANCE_RATIOS[role];

  return [
    Math.max(
      0,
      Math.round(matches * ratios[0] * availabilityRatio),
    ),
    Math.max(
      0,
      Math.round(matches * ratios[1] * availabilityRatio),
    ),
  ];
}

function addStats(
  left: ClassicSeasonStats,
  right: ClassicSeasonStats,
): ClassicSeasonStats {
  return {
    appearances: left.appearances + right.appearances,
    assists: left.assists + right.assists,
    cleanSheets: left.cleanSheets + right.cleanSheets,
    goals: left.goals + right.goals,
    goalsConceded:
      left.goalsConceded + right.goalsConceded,
  };
}

function scaleStatsToAppearances(
  stats: ClassicSeasonStats,
  appearances: number,
): ClassicSeasonStats {
  if (stats.appearances === 0) {
    return stats;
  }

  const ratio = appearances / stats.appearances;

  return {
    appearances,
    assists: Math.max(0, Math.round(stats.assists * ratio)),
    cleanSheets: Math.max(
      0,
      Math.round(stats.cleanSheets * ratio),
    ),
    goals: Math.max(0, Math.round(stats.goals * ratio)),
    goalsConceded: Math.max(
      0,
      Math.round(stats.goalsConceded * ratio),
    ),
  };
}

function isFourYearTournamentAge(
  age: number,
  firstAge: number,
): boolean {
  return age >= firstAge && (age - firstAge) % 4 === 0;
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.round(Math.min(maximum, Math.max(minimum, value)));
}
