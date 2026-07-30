import { classicChance } from "./classicRng";
import type {
  ClassicCatalog,
  Club,
  ConfederationId,
} from "./catalog/classicCatalog";
import type {
  CareerEventModifiers,
  ClubTrophy,
} from "./careerEvents";
import { clubBaseOverall } from "./role";
import type { RoleGroup } from "./role";

export type PersonalAward =
  | "ballon_dor"
  | "golden_boot"
  | "golden_glove";

export type ClubTrophyContext = {
  readonly confederation: ConfederationId;
  readonly hasContinentalSecondary: boolean;
  readonly hasDomesticCup: boolean;
  readonly hasTopTier: boolean;
  readonly tier: 1 | 2;
};

export type PreviousClubSeason = {
  readonly teamId: string;
  readonly trophies: readonly ClubTrophy[];
};

const LEAGUE_TROPHY_PROBABILITIES = [
  0,
  0.01,
  0.04,
  0.18,
  0.33,
  0.5,
] as const;
const CUP_TROPHY_PROBABILITIES = [
  0.01,
  0.03,
  0.08,
  0.18,
  0.25,
  0.3,
] as const;
const PRIMARY_TROPHY_PROBABILITIES = [
  0,
  0.000_01,
  0.04,
  0.1,
  0.14,
  0.2,
] as const;
const SECONDARY_TROPHY_PROBABILITIES = [
  0,
  0.05,
  0.15,
  0.02,
  0,
  0,
] as const;
const CLUB_WORLD_CUP_PROBABILITIES: Partial<
  Readonly<Record<ConfederationId, readonly number[]>>
> = {
  UEFA: [0, 0, 0.005, 0.05, 0.1, 0.15],
  CONMEBOL: [0, 0, 0, 0.002, 0.005, 0],
  CONCACAF: [0, 0, 0, 0.000_1, 0, 0],
  AFC: [0, 0, 0, 0.001, 0.003, 0],
};
const PROMOTION_LEAGUE_PROBABILITIES = [
  [64, 0.03],
  [69, 0.04],
  [74, 0.06],
  [79, 0.09],
  [84, 0.13],
  [87, 0.18],
  [89, 0.25],
  [99, 0.3],
] as const;

export function createCatalogClubTrophyContext(
  catalog: ClassicCatalog,
  clubId: string,
  tierOverride?: 1 | 2,
): ClubTrophyContext {
  const club = catalog.clubById.get(clubId);

  if (club === undefined) {
    throw new RangeError(`Unknown Classic club: ${clubId}`);
  }

  const competition = catalog.competitionById.get(
    club.competitionId,
  );

  if (competition === undefined) {
    throw new RangeError(
      `Missing competition for Classic club: ${clubId}`,
    );
  }

  const tier = tierOverride ?? competition.tier;

  return {
    confederation: competition.confederation,
    hasContinentalSecondary:
      catalog.confederations[competition.confederation]
        .continentalSecondary !== null,
    hasDomesticCup: catalog.domesticCupById.has(
      competition.domesticCupId,
    ),
    hasTopTier: catalog.competitions.some(
      (candidate) =>
        candidate.countryFifaCode ===
          competition.countryFifaCode && candidate.tier === 1,
    ),
    tier,
  };
}

export function clubLeagueTrophyProbability(
  reputation: number,
): number {
  return LEAGUE_TROPHY_PROBABILITIES[
    clampInteger(reputation, 0, 5)
  ]!;
}

export function clubCupTrophyProbability(
  reputation: number,
): number {
  return CUP_TROPHY_PROBABILITIES[
    clampInteger(reputation, 0, 5)
  ]!;
}

export function clubPrimaryTrophyProbability(
  reputation: number,
): number {
  return PRIMARY_TROPHY_PROBABILITIES[
    clampInteger(reputation, 0, 5)
  ]!;
}

export function clubSecondaryTrophyProbability(
  reputation: number,
): number {
  return SECONDARY_TROPHY_PROBABILITIES[
    clampInteger(reputation, 0, 5)
  ]!;
}

export function promotionLeagueTrophyProbability(
  overall: number,
): number {
  return (
    PROMOTION_LEAGUE_PROBABILITIES.find(
      ([maximum]) => overall <= maximum,
    )?.[1] ?? 0.3
  );
}

export function trophyRoleMultiplier(
  overallDifference: number,
): number {
  if (overallDifference >= 10) {
    return 1.6;
  }
  if (overallDifference >= 6) {
    return 1.3;
  }
  if (overallDifference >= 3) {
    return 1.1;
  }

  return 1;
}

export function simulateClubTrophies(input: {
  readonly age: number;
  readonly club: Club;
  readonly context: ClubTrophyContext;
  readonly modifiers: CareerEventModifiers;
  readonly overall: number;
  readonly previousSeason: PreviousClubSeason | null;
  readonly rngState: number;
}): {
  readonly rngState: number;
  readonly trophies: readonly ClubTrophy[];
} {
  const roleMultiplier = trophyRoleMultiplier(
    input.overall -
      clubBaseOverall(input.club.internationalReputation),
  );
  const domesticReputation = effectiveTrophyReputation(
    input.overall,
    input.club.domesticReputation,
  );
  const continentalReputation = effectiveTrophyReputation(
    input.overall,
    input.club.continentalReputation,
  );
  const promotionLeague =
    input.context.tier === 2 && input.context.hasTopTier;
  const leagueProbability = promotionLeague
    ? Math.min(
        0.3,
        promotionLeagueTrophyProbability(input.overall) *
          input.modifiers
            .leagueTrophyProbabilityMultiplier,
      )
    : clubLeagueTrophyProbability(domesticReputation) *
      input.modifiers.leagueTrophyProbabilityMultiplier;
  const cupProbability = input.context.hasDomesticCup
    ? clubCupTrophyProbability(domesticReputation) *
      input.modifiers.domesticCupTrophyProbabilityMultiplier
    : null;
  const previous =
    input.previousSeason?.teamId === input.club.id
      ? input.previousSeason
      : null;
  const previousLeague = previous?.trophies.includes("league") ?? false;
  const previousPrimary =
    previous?.trophies.includes("continental_primary") ?? false;
  const previousSecondary =
    previous?.trophies.includes("continental_secondary") ?? false;
  const continentalEligible =
    continentalReputation >= 3 ||
    previousLeague ||
    previousPrimary ||
    previousSecondary;
  const candidates: Array<{
    applyRoleMultiplier: boolean;
    probability: number;
    trophy: ClubTrophy;
  }> = [
    {
      applyRoleMultiplier: !promotionLeague,
      probability: leagueProbability,
      trophy: "league",
    },
  ];

  if (cupProbability !== null) {
    candidates.push({
      applyRoleMultiplier: true,
      probability: cupProbability,
      trophy: "cup",
    });
  }

  if (continentalEligible) {
    candidates.push({
      applyRoleMultiplier: true,
      probability:
        clubPrimaryTrophyProbability(continentalReputation) *
        input.modifiers
          .continentalPrimaryTrophyProbabilityMultiplier,
      trophy: "continental_primary",
    });
  }

  candidates.push({
    applyRoleMultiplier: true,
    probability:
      clubSecondaryTrophyProbability(continentalReputation) *
      input.modifiers
        .continentalSecondaryTrophyProbabilityMultiplier,
    trophy: "continental_secondary",
  });

  if (isFourYearClubWorldCupAge(input.age)) {
    const probabilities =
      CLUB_WORLD_CUP_PROBABILITIES[
        input.context.confederation
      ];
    candidates.push({
      applyRoleMultiplier: true,
      probability:
        (probabilities?.[
          clampInteger(continentalReputation, 0, 5)
        ] ?? 0) *
        input.modifiers
          .clubWorldCupTrophyProbabilityMultiplier,
      trophy: "club_world_cup",
    });
  }

  const trophies: ClubTrophy[] = [];
  let rngState = input.rngState;
  let primaryWon = false;

  for (const candidate of candidates) {
    if (
      candidate.trophy === "continental_secondary" &&
      !input.context.hasContinentalSecondary
    ) {
      continue;
    }

    if (
      candidate.trophy === "continental_secondary" &&
      input.modifiers.clubTrophyOverride?.trophy !==
        "continental_secondary" &&
      (primaryWon ||
        previousLeague ||
        previousPrimary ||
        previousSecondary)
    ) {
      continue;
    }

    const probability = Math.min(
      1,
      candidate.probability *
        (candidate.applyRoleMultiplier ? roleMultiplier : 1),
    );
    const draw = classicChance(rngState, probability);
    rngState = draw.state;
    const override = input.modifiers.clubTrophyOverride;
    const won =
      override?.trophy === candidate.trophy
        ? override.result === "force"
        : draw.success;

    if (won) {
      trophies.push(candidate.trophy);

      if (candidate.trophy === "continental_primary") {
        primaryWon = true;
      }
    }
  }

  return {
    rngState,
    trophies: Object.freeze(trophies),
  };
}

export function ballonDorProbability(
  overall: number,
  wonLeague: boolean,
  wonContinentalPrimary: boolean,
): number {
  if (overall >= 97) {
    return 1;
  }

  if (overall >= 94) {
    if (wonLeague && wonContinentalPrimary) {
      return 1;
    }
    if (wonContinentalPrimary) {
      return 0.8;
    }
    if (wonLeague) {
      return 0.65;
    }
    return 0.5;
  }

  if (overall >= 90) {
    if (wonLeague && wonContinentalPrimary) {
      return 0.3;
    }
    if (wonContinentalPrimary) {
      return 0.2;
    }
    if (wonLeague) {
      return 0.15;
    }
    return 0.1;
  }

  if (overall >= 85) {
    if (wonLeague && wonContinentalPrimary) {
      return 0.05;
    }
    if (wonContinentalPrimary) {
      return 0.03;
    }
    if (wonLeague) {
      return 0.01;
    }
  }

  return 0;
}

export function goldenBootProbability(
  goals: number,
  eligible: boolean,
): number {
  if (!eligible) {
    return 0;
  }
  if (goals >= 40) {
    return 1;
  }
  if (goals >= 32) {
    return 0.5;
  }
  if (goals >= 25) {
    return 0.2;
  }

  return 0;
}

export function simulatePersonalAwards(input: {
  readonly clubTrophies: readonly ClubTrophy[];
  readonly goldenBootEligible: boolean;
  readonly goals: number;
  readonly overall: number;
  readonly rngState: number;
  readonly roleGroup: RoleGroup;
}): {
  readonly awards: readonly PersonalAward[];
  readonly rngState: number;
} {
  const awards: PersonalAward[] = [];
  const wonLeague = input.clubTrophies.includes("league");
  const wonContinentalPrimary = input.clubTrophies.includes(
    "continental_primary",
  );
  const headlineProbability =
    ballonDorProbability(
      input.overall,
      wonLeague,
      wonContinentalPrimary,
    ) * awardRoleMultiplier(input.roleGroup);
  const headline = classicChance(
    input.rngState,
    headlineProbability,
  );
  let rngState = headline.state;

  if (headline.success) {
    awards.push(
      input.roleGroup === "goalkeeper"
        ? "golden_glove"
        : "ballon_dor",
    );
  }

  if (input.roleGroup !== "goalkeeper") {
    const boot = classicChance(
      rngState,
      goldenBootProbability(
        input.goals,
        input.goldenBootEligible,
      ),
    );
    rngState = boot.state;

    if (boot.success) {
      awards.push("golden_boot");
    }
  }

  return {
    awards: Object.freeze(awards),
    rngState,
  };
}

function awardRoleMultiplier(roleGroup: RoleGroup): number {
  if (roleGroup === "support") {
    return 0.5;
  }
  if (roleGroup === "defensive") {
    return 0.25;
  }

  return 1;
}

function effectiveTrophyReputation(
  overall: number,
  reputation: number,
): number {
  return overall >= 90 && reputation < 3
    ? Math.min(5, reputation + 1)
    : reputation;
}

function isFourYearClubWorldCupAge(age: number): boolean {
  return age >= 18 && (age - 18) % 4 === 0;
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.round(Math.min(maximum, Math.max(minimum, value)));
}
