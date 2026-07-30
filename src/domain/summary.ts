import type { PersonalAward } from "./awards";
import type {
  ClubTrophy,
  NationalTrophy,
} from "./careerEvents";
import type { DevelopmentProfile } from "./development";
import type {
  ClassicPosition,
  ClassicSeasonStats,
} from "./role";

export const HIDDEN_TITLE_KEYS = [
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
] as const;

export type HiddenTitleKey = (typeof HIDDEN_TITLE_KEYS)[number];
export type BadgeTier =
  | "bronze"
  | "silver"
  | "gold"
  | "cyan"
  | "elite"
  | "special";
export type RetirementReason =
  | "retirement_age"
  | "voluntary"
  | "no_offers";
export type CareerTrophy = ClubTrophy | NationalTrophy;

export type ClassicSummarySeason = {
  readonly age: number;
  readonly awards: readonly PersonalAward[];
  readonly id: string;
  readonly index: number;
  readonly marketValue: number;
  readonly overall: number;
  readonly stats: ClassicSeasonStats;
  readonly suspended: boolean;
  readonly teamId: string;
  readonly trophies: readonly CareerTrophy[];
};

export type SummaryNationalTeamPeriod = {
  readonly stats: ClassicSeasonStats;
};

export type CareerTotals = ClassicSeasonStats & {
  readonly awards: number;
  readonly trophies: number;
};

export type CareerSummaryInput = {
  readonly nationalTeamPeriods: readonly SummaryNationalTeamPeriod[];
  readonly player: {
    readonly age: number;
    readonly developmentProfile: DevelopmentProfile;
    readonly marketValue: number;
    readonly nationalityFifaReputation: number;
    readonly nationalityIsoAlpha2: string;
    readonly overall: number;
    readonly position: ClassicPosition;
    readonly preferredNumber: number;
  };
  readonly retirementReason: RetirementReason;
  readonly seasons: readonly ClassicSummarySeason[];
  readonly totals: CareerTotals;
};

export type ClubCareerSummary = {
  readonly stats: ClassicSeasonStats;
  readonly teamId: string;
  readonly trophies: readonly ClubTrophy[];
};

export type CareerSummary = {
  readonly awards: readonly PersonalAward[];
  readonly badge: BadgeTier;
  readonly clubs: readonly ClubCareerSummary[];
  readonly ending: RetirementReason;
  readonly hiddenTitles: readonly HiddenTitleKey[];
  readonly maxMarketValue: number;
  readonly maxOverall: number;
  readonly nationalStats: ClassicSeasonStats;
  readonly nationalTrophies: readonly NationalTrophy[];
  readonly totals: CareerTotals;
};

const EMPTY_STATS: ClassicSeasonStats = {
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
};

export function aggregateCareerSummary(
  career: CareerSummaryInput,
): CareerSummary {
  const clubById = new Map<string, ClubCareerSummary>();
  const nationalTrophies: NationalTrophy[] = [];
  const awards: PersonalAward[] = [];
  let maxOverall = career.player.overall;
  let maxMarketValue = career.player.marketValue;

  for (const season of career.seasons) {
    maxOverall = Math.max(maxOverall, season.overall);
    maxMarketValue = Math.max(
      maxMarketValue,
      season.marketValue,
    );
    const existing = clubById.get(season.teamId) ?? {
      stats: EMPTY_STATS,
      teamId: season.teamId,
      trophies: [],
    };
    const clubTrophies = season.trophies.filter(isClubTrophy);

    clubById.set(season.teamId, {
      stats: addStats(existing.stats, season.stats),
      teamId: season.teamId,
      trophies: [...existing.trophies, ...clubTrophies],
    });
    nationalTrophies.push(
      ...season.trophies.filter(isNationalTrophy),
    );
    awards.push(...season.awards);
  }

  const nationalStats = career.nationalTeamPeriods.reduce(
    (totals, period) => addStats(totals, period.stats),
    EMPTY_STATS,
  );
  const hiddenTitles = evaluateHiddenTitles(career);

  return {
    awards: Object.freeze(awards),
    badge: badgeTierForOverall(maxOverall),
    clubs: Object.freeze([...clubById.values()]),
    ending: career.retirementReason,
    hiddenTitles,
    maxMarketValue,
    maxOverall,
    nationalStats,
    nationalTrophies: Object.freeze(nationalTrophies),
    totals: career.totals,
  };
}

export function calculateCareerTotals(
  seasons: readonly ClassicSummarySeason[],
  nationalTeamPeriods: readonly SummaryNationalTeamPeriod[],
): CareerTotals {
  let stats = EMPTY_STATS;
  let trophies = 0;
  let awards = 0;

  for (const season of seasons) {
    stats = addStats(stats, season.stats);
    trophies += season.trophies.length;
    awards += season.awards.length;
  }

  for (const period of nationalTeamPeriods) {
    stats = addStats(stats, period.stats);
  }

  return {
    ...stats,
    awards,
    trophies,
  };
}

export function validateCareerTotals(
  career: CareerSummaryInput,
): string[] {
  const expected = calculateCareerTotals(
    career.seasons,
    career.nationalTeamPeriods,
  );
  const errors: string[] = [];
  const keys = [
    "appearances",
    "goals",
    "assists",
    "cleanSheets",
    "goalsConceded",
    "trophies",
    "awards",
  ] as const;

  for (const key of keys) {
    if (career.totals[key] !== expected[key]) {
      errors.push(
        `totals.${key} expected ${expected[key]}, received ${career.totals[key]}`,
      );
    }
  }

  return errors;
}

export function evaluateHiddenTitles(
  career: CareerSummaryInput,
): HiddenTitleKey[] {
  const aggregation = aggregateForTitles(career);
  const titles: HiddenTitleKey[] = [];
  const lastAge =
    career.seasons[career.seasons.length - 1]?.age ??
    career.player.age;

  if (
    aggregation.nationalTrophies.includes("world_cup") &&
    career.player.nationalityFifaReputation <= 1
  ) {
    titles.push("national_miracle");
  }
  if (
    aggregation.clubCount === 1 &&
    career.seasons.length >= 16
  ) {
    titles.push("one_club_man");
  }
  if (aggregation.clubCount >= 10) {
    titles.push("journeyman");
  }
  if (
    aggregation.maxOverall >= 88 &&
    career.totals.trophies === 0
  ) {
    titles.push("uncrowned_king");
  }
  if (
    career.seasons.some((season) => season.suspended) &&
    aggregation.awards.includes("ballon_dor")
  ) {
    titles.push("redemption");
  }
  if (
    career.player.nationalityIsoAlpha2 === "AR" &&
    career.player.preferredNumber === 10 &&
    aggregation.maxOverall >= 90
  ) {
    titles.push("new_messi");
  }
  if (
    career.player.nationalityIsoAlpha2 === "BR" &&
    career.player.preferredNumber === 9 &&
    career.player.position === "ST" &&
    aggregation.maxOverall >= 90
  ) {
    titles.push("phenomenon");
  }
  if (career.totals.appearances >= 1_000) {
    titles.push("iron_man");
  }
  if (
    career.player.developmentProfile === "late" &&
    aggregation.maxOverall >= 88
  ) {
    titles.push("late_bloomer");
  }
  if (
    career.player.developmentProfile === "legend" &&
    aggregation.maxOverall >= 95
  ) {
    titles.push("king_of_football");
  }
  if (
    career.retirementReason === "voluntary" &&
    lastAge <= 33 &&
    aggregation.maxOverall >= 85
  ) {
    titles.push("go_out_on_top");
  }
  if (lastAge >= 42) {
    titles.push("evergreen");
  }

  return titles;
}

export function badgeTierForOverall(
  overall: number,
): BadgeTier {
  if (overall >= 99) {
    return "special";
  }
  if (overall >= 95) {
    return "elite";
  }
  if (overall >= 90) {
    return "cyan";
  }
  if (overall >= 80) {
    return "gold";
  }
  if (overall >= 70) {
    return "silver";
  }

  return "bronze";
}

function aggregateForTitles(career: CareerSummaryInput): {
  readonly awards: readonly PersonalAward[];
  readonly clubCount: number;
  readonly maxOverall: number;
  readonly nationalTrophies: readonly NationalTrophy[];
} {
  const clubIds = new Set<string>();
  const nationalTrophies: NationalTrophy[] = [];
  const awards: PersonalAward[] = [];
  let maxOverall = career.player.overall;

  for (const season of career.seasons) {
    clubIds.add(season.teamId);
    maxOverall = Math.max(maxOverall, season.overall);
    nationalTrophies.push(
      ...season.trophies.filter(isNationalTrophy),
    );
    awards.push(...season.awards);
  }

  return {
    awards,
    clubCount: clubIds.size,
    maxOverall,
    nationalTrophies,
  };
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

function isClubTrophy(
  trophy: CareerTrophy,
): trophy is ClubTrophy {
  return (
    trophy === "league" ||
    trophy === "cup" ||
    trophy === "continental_primary" ||
    trophy === "continental_secondary" ||
    trophy === "club_world_cup"
  );
}

function isNationalTrophy(
  trophy: CareerTrophy,
): trophy is NationalTrophy {
  return (
    trophy === "national_continental" ||
    trophy === "world_cup"
  );
}
