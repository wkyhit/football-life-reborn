import type { PersonalAward } from "../../domain/awards";
import type {
  ClassicCareerState,
  ClassicChoiceLogEntry,
} from "../../domain/classicEngine";
import type {
  CareerTrophy,
  NationalTrophy,
} from "../../domain/careerEvents";
import { stableStringify } from "../../domain/deterministicHash";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";
import type { NationalTournamentResult } from "../../domain/nationalTeam";
import type { ClassicSeasonStats } from "../../domain/role";
import {
  calculateCareerTotals,
  type CareerTotals,
  type RetirementReason,
} from "../../domain/summary";

const TROPHY_TYPES = [
  "league",
  "cup",
  "continental_primary",
  "continental_secondary",
  "club_world_cup",
  "national_continental",
  "world_cup",
] as const satisfies readonly CareerTrophy[];

const NATIONAL_TROPHY_TYPES = [
  "national_continental",
  "world_cup",
] as const satisfies readonly NationalTrophy[];

const NATIONAL_RESULT_CATEGORIES = [
  "not_qualified",
  "not_selected",
  "group",
  "r16",
  "qf",
  "sf",
  "final",
  "champion",
] as const;

type NationalResultCategory =
  | NationalTournamentResult
  | "not_qualified"
  | "not_selected";

const AWARD_TYPES = [
  "ballon_dor",
  "golden_boot",
  "golden_glove",
] as const satisfies readonly PersonalAward[];

export type ComparableBranch = {
  readonly career: ClassicCareerState;
  readonly displayName: string;
  readonly id: string;
};

export type NumericComparison = {
  readonly delta: number;
  readonly left: number;
  readonly right: number;
};

export type CurveComparisonPoint = {
  readonly age: number;
  readonly delta: number | null;
  readonly left: number | null;
  readonly right: number | null;
};

export type ClubComparisonItem = {
  readonly ageEnd: number;
  readonly ageStart: number;
  readonly seasonCount: number;
  readonly teamId: string;
};

export type CategoryComparisonRow<TCategory extends string> = {
  readonly category: TCategory;
  readonly delta: number;
  readonly left: number;
  readonly right: number;
};

export type BranchIncompatibility =
  | {
      readonly code: "content_version";
      readonly left: string;
      readonly right: string;
    }
  | {
      readonly code: "identity";
      readonly left: ClassicCareerState["identity"];
      readonly right: ClassicCareerState["identity"];
    }
  | {
      readonly code: "mode";
      readonly left: ClassicCareerState["mode"];
      readonly right: ClassicCareerState["mode"];
    }
  | {
      readonly code: "seed";
      readonly left: string;
      readonly right: string;
    };

export type ReadyBranchComparison = {
  readonly abilityCurve: readonly CurveComparisonPoint[];
  readonly awards: {
    readonly rows: readonly CategoryComparisonRow<PersonalAward>[];
  };
  readonly branches: {
    readonly left: Omit<ComparableBranch, "career">;
    readonly right: Omit<ComparableBranch, "career">;
  };
  readonly clubs: {
    readonly left: readonly ClubComparisonItem[];
    readonly right: readonly ClubComparisonItem[];
  };
  readonly commonChoiceCount: number;
  readonly divergenceChoiceIndex: number | null;
  readonly ending: {
    readonly left: RetirementReason | null;
    readonly right: RetirementReason | null;
  };
  readonly economy: {
    readonly totalIncome: NumericComparison;
  };
  readonly nationalTeam: {
    readonly results: {
      readonly rows: readonly CategoryComparisonRow<NationalResultCategory>[];
    };
    readonly stats: Readonly<
      Record<keyof ClassicSeasonStats, NumericComparison>
    >;
    readonly trophies: {
      readonly rows: readonly CategoryComparisonRow<NationalTrophy>[];
    };
  };
  readonly status: "ready";
  readonly totals: Readonly<
    Record<keyof CareerTotals, NumericComparison>
  >;
  readonly trophies: {
    readonly rows: readonly CategoryComparisonRow<CareerTrophy>[];
  };
  readonly valueCurve: readonly CurveComparisonPoint[];
};

export type BranchComparison =
  | ReadyBranchComparison
  | {
      readonly reasons: readonly BranchIncompatibility[];
      readonly status: "incompatible";
    };

export function compareBranches(
  left: ComparableBranch,
  right: ComparableBranch,
): BranchComparison {
  const reasons = compatibilityReasons(
    left.career,
    right.career,
  );

  if (reasons.length > 0) {
    return Object.freeze({
      reasons: Object.freeze(reasons),
      status: "incompatible",
    });
  }

  const choiceAlignment = alignChoices(
    left.career.choiceLog,
    right.career.choiceLog,
  );
  const leftNationalStats = nationalStats(left.career);
  const rightNationalStats = nationalStats(right.career);
  const leftEconomy = createCareerEconomyProjection(
    left.career,
  );
  const rightEconomy = createCareerEconomyProjection(
    right.career,
  );

  return Object.freeze({
    abilityCurve: createCurve(
      left.career,
      right.career,
      (season) => season.overall,
    ),
    awards: Object.freeze({
      rows: categoryRows(
        AWARD_TYPES,
        left.career.seasons.flatMap(
          (season) => season.awards,
        ),
        right.career.seasons.flatMap(
          (season) => season.awards,
        ),
      ),
    }),
    branches: Object.freeze({
      left: Object.freeze({
        displayName: left.displayName,
        id: left.id,
      }),
      right: Object.freeze({
        displayName: right.displayName,
        id: right.id,
      }),
    }),
    clubs: Object.freeze({
      left: clubTimeline(left.career),
      right: clubTimeline(right.career),
    }),
    commonChoiceCount: choiceAlignment.commonChoiceCount,
    divergenceChoiceIndex:
      choiceAlignment.divergenceChoiceIndex,
    ending: Object.freeze({
      left: left.career.retirementReason,
      right: right.career.retirementReason,
    }),
    economy: Object.freeze({
      totalIncome: numeric(
        leftEconomy.totalIncome,
        rightEconomy.totalIncome,
      ),
    }),
    nationalTeam: Object.freeze({
      results: Object.freeze({
        rows: categoryRows(
          NATIONAL_RESULT_CATEGORIES,
          nationalResults(left.career),
          nationalResults(right.career),
        ),
      }),
      stats: compareStats(
        leftNationalStats,
        rightNationalStats,
      ),
      trophies: Object.freeze({
        rows: categoryRows(
          NATIONAL_TROPHY_TYPES,
          nationalTrophies(left.career),
          nationalTrophies(right.career),
        ),
      }),
    }),
    status: "ready",
    totals: compareTotals(
      calculateCareerTotals(
        left.career.seasons,
        left.career.nationalTeamPeriods,
      ),
      calculateCareerTotals(
        right.career.seasons,
        right.career.nationalTeamPeriods,
      ),
    ),
    trophies: Object.freeze({
      rows: categoryRows(
        TROPHY_TYPES,
        left.career.seasons.flatMap(
          (season) => season.trophies,
        ),
        right.career.seasons.flatMap(
          (season) => season.trophies,
        ),
      ),
    }),
    valueCurve: createCurve(
      left.career,
      right.career,
      (season) => season.marketValue,
    ),
  });
}

function compatibilityReasons(
  left: ClassicCareerState,
  right: ClassicCareerState,
): BranchIncompatibility[] {
  const reasons: BranchIncompatibility[] = [];

  if (left.contentVersion !== right.contentVersion) {
    reasons.push(
      Object.freeze({
        code: "content_version",
        left: left.contentVersion,
        right: right.contentVersion,
      }),
    );
  }

  if (
    stableStringify(left.identity) !==
    stableStringify(right.identity)
  ) {
    reasons.push(
      Object.freeze({
        code: "identity",
        left: left.identity,
        right: right.identity,
      }),
    );
  }

  if (left.mode !== right.mode) {
    reasons.push(
      Object.freeze({
        code: "mode",
        left: left.mode,
        right: right.mode,
      }),
    );
  }

  if (left.seed !== right.seed) {
    reasons.push(
      Object.freeze({
        code: "seed",
        left: left.seed,
        right: right.seed,
      }),
    );
  }

  return reasons;
}

function alignChoices(
  left: readonly ClassicChoiceLogEntry[],
  right: readonly ClassicChoiceLogEntry[],
): {
  readonly commonChoiceCount: number;
  readonly divergenceChoiceIndex: number | null;
} {
  const limit = Math.min(left.length, right.length);
  let commonChoiceCount = 0;

  while (
    commonChoiceCount < limit &&
    stableStringify(left[commonChoiceCount]) ===
      stableStringify(right[commonChoiceCount])
  ) {
    commonChoiceCount += 1;
  }

  return {
    commonChoiceCount,
    divergenceChoiceIndex:
      commonChoiceCount < limit
        ? commonChoiceCount
        : null,
  };
}

function createCurve(
  left: ClassicCareerState,
  right: ClassicCareerState,
  select: (
    season: ClassicCareerState["seasons"][number],
  ) => number,
): readonly CurveComparisonPoint[] {
  const leftByAge = new Map(
    left.seasons.map((season) => [
      season.age,
      select(season),
    ]),
  );
  const rightByAge = new Map(
    right.seasons.map((season) => [
      season.age,
      select(season),
    ]),
  );
  const ages = [
    ...new Set([
      ...leftByAge.keys(),
      ...rightByAge.keys(),
    ]),
  ].sort((a, b) => a - b);

  return Object.freeze(
    ages.map((age) => {
      const leftValue = leftByAge.get(age) ?? null;
      const rightValue = rightByAge.get(age) ?? null;

      return Object.freeze({
        age,
        delta:
          leftValue === null || rightValue === null
            ? null
            : leftValue - rightValue,
        left: leftValue,
        right: rightValue,
      });
    }),
  );
}

function clubTimeline(
  career: ClassicCareerState,
): readonly ClubComparisonItem[] {
  const clubs = new Map<
    string,
    {
      ageEnd: number;
      ageStart: number;
      seasonCount: number;
      teamId: string;
    }
  >();

  for (const season of career.seasons) {
    const existing = clubs.get(season.teamId);

    if (existing === undefined) {
      clubs.set(season.teamId, {
        ageEnd: season.age,
        ageStart: season.age,
        seasonCount: 1,
        teamId: season.teamId,
      });
    } else {
      existing.ageEnd = season.age;
      existing.seasonCount += 1;
    }
  }

  return Object.freeze(
    [...clubs.values()].map((club) =>
      Object.freeze({ ...club }),
    ),
  );
}

function compareTotals(
  left: CareerTotals,
  right: CareerTotals,
): Readonly<Record<keyof CareerTotals, NumericComparison>> {
  return Object.freeze({
    appearances: numeric(
      left.appearances,
      right.appearances,
    ),
    assists: numeric(left.assists, right.assists),
    awards: numeric(left.awards, right.awards),
    cleanSheets: numeric(
      left.cleanSheets,
      right.cleanSheets,
    ),
    goals: numeric(left.goals, right.goals),
    goalsConceded: numeric(
      left.goalsConceded,
      right.goalsConceded,
    ),
    trophies: numeric(left.trophies, right.trophies),
  });
}

function compareStats(
  left: ClassicSeasonStats,
  right: ClassicSeasonStats,
): Readonly<
  Record<keyof ClassicSeasonStats, NumericComparison>
> {
  return Object.freeze({
    appearances: numeric(
      left.appearances,
      right.appearances,
    ),
    assists: numeric(left.assists, right.assists),
    cleanSheets: numeric(
      left.cleanSheets,
      right.cleanSheets,
    ),
    goals: numeric(left.goals, right.goals),
    goalsConceded: numeric(
      left.goalsConceded,
      right.goalsConceded,
    ),
  });
}

function numeric(
  left: number,
  right: number,
): NumericComparison {
  return Object.freeze({
    delta: left - right,
    left,
    right,
  });
}

function categoryRows<TCategory extends string>(
  categories: readonly TCategory[],
  leftValues: readonly TCategory[],
  rightValues: readonly TCategory[],
): readonly CategoryComparisonRow<TCategory>[] {
  return Object.freeze(
    categories.map((category) => {
      const left = count(leftValues, category);
      const right = count(rightValues, category);

      return Object.freeze({
        category,
        delta: left - right,
        left,
        right,
      });
    }),
  );
}

function count<TValue>(
  values: readonly TValue[],
  target: TValue,
): number {
  return values.reduce(
    (total, value) =>
      total + (value === target ? 1 : 0),
    0,
  );
}

function nationalStats(
  career: ClassicCareerState,
): ClassicSeasonStats {
  return career.nationalTeamPeriods.reduce<ClassicSeasonStats>(
    (totals, period) =>
      Object.freeze({
        appearances:
          totals.appearances +
          period.stats.appearances,
        assists: totals.assists + period.stats.assists,
        cleanSheets:
          totals.cleanSheets +
          period.stats.cleanSheets,
        goals: totals.goals + period.stats.goals,
        goalsConceded:
          totals.goalsConceded +
          period.stats.goalsConceded,
      }),
    Object.freeze({
      appearances: 0,
      assists: 0,
      cleanSheets: 0,
      goals: 0,
      goalsConceded: 0,
    }),
  );
}

function nationalTrophies(
  career: ClassicCareerState,
): readonly NationalTrophy[] {
  return career.seasons
    .flatMap((season) => season.trophies)
    .filter(
      (trophy): trophy is NationalTrophy =>
        trophy === "national_continental" ||
        trophy === "world_cup",
    );
}

function nationalResults(
  career: ClassicCareerState,
): readonly NationalResultCategory[] {
  return career.seasons.flatMap((season) =>
    season.nationalTournamentRecords.map((record) =>
      record.status === "played"
        ? record.result
        : record.status,
    ),
  );
}
