import {
  classicPickWeighted,
  nextClassicFloat,
} from "./classicRng";
import type {
  ClassicCatalog,
  ConfederationId,
} from "./catalog/classicCatalog";
import {
  overallScoringMultiplier,
  resolveClassicSquadRole,
} from "./role";
import type {
  ClassicSquadRole,
  RoleGroup,
} from "./role";

export type PacingMode = "long" | "normal" | "express";

export type TransferCandidate = {
  readonly competitionId: string;
  readonly confederation: ConfederationId;
  readonly continentalReputation: number;
  readonly countryFifaCode: string;
  readonly domesticReputation: number;
  readonly id: string;
  readonly internationalReputation: number;
  readonly tier: 1 | 2;
};

export type TransferPlayer = {
  readonly age: number;
  readonly currentClubId: string;
  readonly nationalityConfederation: ConfederationId;
  readonly nationalityFifaCode: string;
  readonly overall: number;
};

export type TransferOfferResult = {
  readonly offers: readonly TransferCandidate[];
  readonly rngState: number;
};

export type TransferCandidateProvider = {
  all(): readonly TransferCandidate[];
};

const PLAYER_REPUTATION_THRESHOLDS = [
  50,
  65,
  73,
  78,
  83,
  87,
] as const;

export function createCatalogTransferCandidateProvider(
  catalog: ClassicCatalog,
): TransferCandidateProvider {
  const candidates = Object.freeze(
    catalog.clubs.map((club) =>
      Object.freeze({
        competitionId: club.competitionId,
        confederation: club.confederation,
        continentalReputation: club.continentalReputation,
        countryFifaCode: club.countryFifaCode,
        domesticReputation: club.domesticReputation,
        id: club.id,
        internationalReputation: club.internationalReputation,
        tier: club.tier,
      }),
    ),
  );

  return Object.freeze({
    all: () => candidates,
  });
}

export function playerReputationLevel(overall: number): number {
  for (
    let level = PLAYER_REPUTATION_THRESHOLDS.length - 1;
    level >= 1;
    level -= 1
  ) {
    if (overall >= PLAYER_REPUTATION_THRESHOLDS[level]!) {
      return level;
    }
  }

  return 0;
}

export function ageAdjustedTransferOverall(
  overall: number,
  age: number,
): number {
  if (age <= 25) {
    return overall + Math.round((26 - age) * 1.2);
  }

  if (age >= 30) {
    return Math.max(
      overall - Math.round((age - 29) * 1.5),
      Math.min(overall, 50),
    );
  }

  return overall;
}

export function careerRetirementMinimum(age: number): number {
  if (age < 30) {
    return 50;
  }
  if (age < 34) {
    return 58;
  }
  if (age < 37) {
    return 64;
  }
  if (age < 40) {
    return 68;
  }

  return 68 + (age - 39) * 3;
}

export function generateTransferOffers(input: {
  readonly candidates: readonly TransferCandidate[];
  readonly count?: number;
  readonly player: TransferPlayer;
  readonly rngState: number;
}): TransferOfferResult {
  const adjustedOverall = ageAdjustedTransferOverall(
    input.player.overall,
    input.player.age,
  );
  const reputationDraw = drawNearbyReputation(
    input.rngState,
    playerReputationLevel(adjustedOverall),
  );
  const origin = input.candidates.find(
    (candidate) => candidate.id === input.player.currentClubId,
  );
  const offers: TransferCandidate[] = [];
  let rngState = reputationDraw.rngState;

  for (const reputation of nearbyReputations(reputationDraw.reputation)) {
    const pool = input.candidates.filter(
      (candidate) =>
        candidate.id !== input.player.currentClubId &&
        !offers.some((offer) => offer.id === candidate.id) &&
        candidate.internationalReputation === reputation,
    );
    const selection = selectDistinctWeighted({
      candidates: pool,
      count: (input.count ?? 2) - offers.length,
      rngState,
      weight: (candidate) =>
        transferAffinityWeight({
          adjustedOverall,
          candidate,
          origin,
          player: input.player,
        }),
    });

    offers.push(...selection.offers);
    rngState = selection.rngState;

    if (offers.length >= (input.count ?? 2)) {
      break;
    }
  }

  return {
    offers: Object.freeze(offers),
    rngState,
  };
}

export function loanOfferProbability(input: {
  readonly activeLoan: boolean;
  readonly age: number;
  readonly completedLoan: boolean;
  readonly hasEnoughSuitableClubs: boolean;
  readonly predictedRole: ClassicSquadRole;
}): number {
  if (
    input.activeLoan ||
    input.completedLoan ||
    input.age < 18 ||
    input.age > 24 ||
    !input.hasEnoughSuitableClubs
  ) {
    return 0;
  }

  if (input.predictedRole === "low_rotation") {
    return 0.3;
  }

  if (
    input.predictedRole === "substitute" ||
    input.predictedRole === "third_keeper"
  ) {
    return 0.7;
  }

  return 0;
}

export function generateLoanOffers(input: {
  readonly candidates: readonly TransferCandidate[];
  readonly count?: number;
  readonly currentClubId: string;
  readonly nationalityConfederation: ConfederationId;
  readonly nationalityFifaCode: string;
  readonly overall: number;
  readonly rngState: number;
  readonly roleGroup?: RoleGroup;
}): TransferOfferResult | null {
  const count = input.count ?? 3;
  const reputation = playerReputationLevel(input.overall);
  const suitable = input.candidates.filter((candidate) => {
    if (
      candidate.id === input.currentClubId ||
      candidate.internationalReputation !== reputation
    ) {
      return false;
    }

    const role = resolveClassicSquadRole({
      clubInternationalReputation:
        candidate.internationalReputation,
      overall: input.overall,
      roleGroup: input.roleGroup ?? "attacker",
    });

    return role === "starter" || role === "high_rotation";
  });

  const selection = selectDistinctWeighted({
    candidates: suitable,
    count,
    rngState: input.rngState,
    weight: (candidate) =>
      candidate.countryFifaCode === input.nationalityFifaCode
        ? 90
        : candidate.confederation ===
            input.nationalityConfederation
          ? 10
          : 0,
  });

  return selection.offers.length === count ? selection : null;
}

export function resolveLoanReturn(
  predictedRole: ClassicSquadRole,
): "retained" | "not_retained" {
  return predictedRole === "starter" ||
    predictedRole === "high_rotation"
    ? "retained"
    : "not_retained";
}

export function shouldTriggerContractNonRenewal(input: {
  readonly age: number;
  readonly lowRoleStreak: number;
  readonly mode: PacingMode;
  readonly substituteStreak: number;
}): boolean {
  if (input.age < 26) {
    return false;
  }

  const thresholds =
    input.mode === "long"
      ? { lowRole: 3, substitute: 2 }
      : { lowRole: 2, substitute: 1 };

  return (
    input.lowRoleStreak >= thresholds.lowRole ||
    input.substituteStreak >= thresholds.substitute
  );
}

export function generateFreeAgentOffers(
  input: TransferPlayer & {
    readonly candidates: readonly TransferCandidate[];
    readonly rngState: number;
  },
): TransferOfferResult & { readonly allowRetire: boolean } {
  const count = input.age >= 32 ? 2 : 3;
  const adjustedOverall = ageAdjustedTransferOverall(
    input.overall,
    input.age,
  );
  const maximumReputation =
    playerReputationLevel(adjustedOverall);
  const origin = input.candidates.find(
    (candidate) => candidate.id === input.currentClubId,
  );
  const offers: TransferCandidate[] = [];
  let rngState = input.rngState;

  while (offers.length < count) {
    const draw = nextClassicFloat(rngState);
    rngState = draw.state;
    const preferredReputation = Math.max(
      0,
      maximumReputation - (draw.value < 0.5 ? 0 : 1),
    );
    const available = input.candidates.filter(
      (candidate) =>
        candidate.id !== input.currentClubId &&
        !offers.some((offer) => offer.id === candidate.id) &&
        candidate.internationalReputation <= maximumReputation,
    );
    const preferred = available.filter(
      (candidate) =>
        candidate.internationalReputation ===
        preferredReputation,
    );
    const pool =
      preferred.length > 0
        ? preferred
        : available.sort(
            (left, right) =>
              right.internationalReputation -
              left.internationalReputation,
          );

    if (pool.length === 0) {
      break;
    }

    const weighted = pool.filter(
      (candidate) =>
        transferAffinityWeight({
          adjustedOverall,
          candidate,
          origin,
          player: input,
        }) > 0,
    );
    const candidates = weighted.length > 0 ? weighted : pool;
    const picked = classicPickWeighted(
      rngState,
      candidates.map((candidate) => ({
        item: candidate,
        weight:
          weighted.length > 0
            ? transferAffinityWeight({
                adjustedOverall,
                candidate,
                origin,
                player: input,
              })
            : 1,
      })),
    );

    offers.push(picked.item);
    rngState = picked.state;
  }

  return {
    allowRetire: input.age >= 32,
    offers: Object.freeze(offers),
    rngState,
  };
}

export function relegationProbability(
  overall: number,
  clubDomesticReputation: number,
): number {
  const effectiveReputation =
    overall >= 90 && clubDomesticReputation < 3
      ? clubDomesticReputation + 1
      : clubDomesticReputation;

  if (
    clubDomesticReputation !== 0 ||
    effectiveReputation >= 1
  ) {
    return 0;
  }

  return clamp(
    0.05 +
      0.1 *
        ((1.1 - overallScoringMultiplier(overall)) / 0.5),
    0.05,
    0.15,
  );
}

export function resolveTierChange(input: {
  readonly clubDomesticReputation: number;
  readonly currentTier: 1 | 2;
  readonly hasLowerTier: boolean;
  readonly hasTopTier: boolean;
  readonly overall: number;
  readonly relegationRoll: number;
  readonly suspended: boolean;
  readonly wonLeague: boolean;
}): {
  readonly relegated: boolean;
  readonly tierOverride: 1 | 2 | null;
} {
  if (
    input.currentTier === 2 &&
    input.hasTopTier &&
    input.wonLeague &&
    !input.suspended
  ) {
    return { relegated: false, tierOverride: 1 };
  }

  const relegated =
    input.currentTier === 1 &&
    input.hasLowerTier &&
    input.relegationRoll <
      relegationProbability(
        input.overall,
        input.clubDomesticReputation,
      );

  return {
    relegated,
    tierOverride: relegated ? 2 : null,
  };
}

function drawNearbyReputation(
  rngState: number,
  reputation: number,
): {
  readonly reputation: number;
  readonly rngState: number;
} {
  const draw = nextClassicFloat(rngState);

  if (reputation === 0) {
    return {
      reputation: draw.value < 0.8 ? 0 : 1,
      rngState: draw.state,
    };
  }

  if (reputation === 5) {
    return {
      reputation: draw.value < 0.8 ? 5 : 4,
      rngState: draw.state,
    };
  }

  return {
    reputation:
      draw.value < 0.1
        ? reputation + 1
        : draw.value < 0.9
          ? reputation
          : reputation - 1,
    rngState: draw.state,
  };
}

function nearbyReputations(reputation: number): number[] {
  const levels: number[] = [];

  for (let distance = 0; distance <= 5; distance += 1) {
    const lower = reputation - distance;
    const upper = reputation + distance;

    if (lower >= 0 && !levels.includes(lower)) {
      levels.push(lower);
    }
    if (upper <= 5 && !levels.includes(upper)) {
      levels.push(upper);
    }
  }

  return levels;
}

function selectDistinctWeighted(input: {
  readonly candidates: readonly TransferCandidate[];
  readonly count: number;
  readonly rngState: number;
  readonly weight: (candidate: TransferCandidate) => number;
}): TransferOfferResult {
  const remaining = [...input.candidates];
  const offers: TransferCandidate[] = [];
  let rngState = input.rngState;

  while (offers.length < input.count && remaining.length > 0) {
    const weighted = remaining
      .map((candidate) => ({
        item: candidate,
        weight: input.weight(candidate),
      }))
      .filter((candidate) => candidate.weight > 0);

    if (weighted.length === 0) {
      break;
    }

    const picked = classicPickWeighted(rngState, weighted);
    offers.push(picked.item);
    rngState = picked.state;
    remaining.splice(remaining.indexOf(picked.item), 1);
  }

  return {
    offers: Object.freeze(offers),
    rngState,
  };
}

function transferAffinityWeight(input: {
  readonly adjustedOverall: number;
  readonly candidate: TransferCandidate;
  readonly origin: TransferCandidate | undefined;
  readonly player: Pick<
    TransferPlayer,
    "nationalityConfederation" | "nationalityFifaCode"
  >;
}): number {
  if (input.adjustedOverall >= 83) {
    return 100;
  }

  if (input.adjustedOverall >= 78) {
    return (
      50 +
      (input.origin?.confederation ===
      input.candidate.confederation
        ? 25
        : 0) +
      (input.player.nationalityConfederation ===
      input.candidate.confederation
        ? 25
        : 0)
    );
  }

  if (input.adjustedOverall >= 73) {
    return (
      (input.origin?.confederation ===
      input.candidate.confederation
        ? 50
        : 0) +
      (input.player.nationalityConfederation ===
      input.candidate.confederation
        ? 50
        : 0)
    );
  }

  if (input.adjustedOverall >= 50) {
    return (
      (input.origin?.countryFifaCode ===
      input.candidate.countryFifaCode
        ? 50
        : 0) +
      (input.player.nationalityFifaCode ===
      input.candidate.countryFifaCode
        ? 50
        : 0)
    );
  }

  return 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
