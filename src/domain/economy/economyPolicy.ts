import {
  baseMarketValue,
  MARKET_VALUE_CURVE,
} from "../economics";

export const ECONOMY_POLICY_VERSION =
  "2026-07-31-economy-v1" as const;
export const ECONOMY_MARKET_VALUE_NODES =
  MARKET_VALUE_CURVE;
export const ECONOMY_BASE_SALARY_RATE = 0.15;
export const ECONOMY_MINIMUM_ANNUAL_SALARY = 10_000;
export const ECONOMY_ROUNDING_SWITCH = 1_000_000;
export const ECONOMY_LOW_ROUNDING_INCREMENT = 10_000;
export const ECONOMY_HIGH_ROUNDING_INCREMENT = 100_000;

export const ECONOMY_LEAGUE_POLICIES = Object.freeze({
  "premier-league": Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 1.35,
  }),
  championship: Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 0.35,
  }),
  laliga: Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 1.05,
  }),
  "laliga-2": Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 0.25,
  }),
  "serie-a": Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 1,
  }),
  bundesliga: Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 1,
  }),
  "ligue-1": Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 0.95,
  }),
  csl: Object.freeze({
    fameCompetition: false,
    salaryCap: 3_000_000,
    wealth: 0.9,
  }),
  "china-league-one": Object.freeze({
    fameCompetition: false,
    salaryCap: 800_000,
    wealth: 0.3,
  }),
  "j1-league": Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 0.55,
  }),
  "saudi-pro-league": Object.freeze({
    fameCompetition: true,
    salaryCap: null,
    wealth: 2,
  }),
  brasileirao: Object.freeze({
    fameCompetition: false,
    salaryCap: null,
    wealth: 0.5,
  }),
} as const);

export const ECONOMY_FAME_WEALTH_THRESHOLDS = Object.freeze([
  Object.freeze({
    effectiveWealth: 4,
    minimumPeakOverall: 90,
  }),
  Object.freeze({
    effectiveWealth: 2.7,
    minimumPeakOverall: 80,
  }),
] as const);

export type EconomyCompetitionId =
  keyof typeof ECONOMY_LEAGUE_POLICIES;
export const ECONOMY_COMPETITION_IDS = Object.freeze(
  Object.keys(
    ECONOMY_LEAGUE_POLICIES,
  ) as EconomyCompetitionId[],
);

export type AnnualSalaryQuote = {
  readonly annualSalary: number;
  readonly capped: boolean;
  readonly competitionId: EconomyCompetitionId;
  readonly economyPolicyVersion: typeof ECONOMY_POLICY_VERSION;
  readonly effectiveWealth: number;
  readonly interpolatedMarketValue: number;
  readonly rawSalary: number;
};

export function interpolateEconomyMarketValue(
  overall: number,
): number {
  return baseMarketValue(overall);
}

export function createAnnualSalaryQuote(input: {
  readonly competitionId: EconomyCompetitionId;
  readonly overall: number;
  readonly peakOverall: number;
}): AnnualSalaryQuote {
  const policy = ECONOMY_LEAGUE_POLICIES[input.competitionId];
  const interpolatedMarketValue =
    interpolateEconomyMarketValue(input.overall);
  const effectiveWealth = policy.fameCompetition
    ? fameEffectiveWealth(input.peakOverall, policy.wealth)
    : policy.wealth;
  const rawSalary =
    interpolatedMarketValue *
    ECONOMY_BASE_SALARY_RATE *
    effectiveWealth;
  const roundedSalary = roundAnnualSalary(rawSalary);
  const annualSalary =
    policy.salaryCap === null
      ? roundedSalary
      : Math.min(roundedSalary, policy.salaryCap);

  return Object.freeze({
    annualSalary,
    capped: annualSalary < roundedSalary,
    competitionId: input.competitionId,
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    effectiveWealth,
    interpolatedMarketValue,
    rawSalary,
  });
}

export function roundAnnualSalary(rawSalary: number): number {
  const increment =
    rawSalary >= ECONOMY_ROUNDING_SWITCH
      ? ECONOMY_HIGH_ROUNDING_INCREMENT
      : ECONOMY_LOW_ROUNDING_INCREMENT;

  return Math.max(
    ECONOMY_MINIMUM_ANNUAL_SALARY,
    Math.round(rawSalary / increment) * increment,
  );
}

function fameEffectiveWealth(
  peakOverall: number,
  fallbackWealth: number,
): number {
  return (
    ECONOMY_FAME_WEALTH_THRESHOLDS.find(
      ({ minimumPeakOverall }) =>
        peakOverall >= minimumPeakOverall,
    )?.effectiveWealth ?? fallbackWealth
  );
}
