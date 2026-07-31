import {
  applyClassicChoiceWithResult,
  startClassicCareer,
} from "../classicEngine";
import type {
  ClassicCareerState,
  ClassicChoiceTransition,
  ClassicDecision,
  ClassicDecisionOption,
} from "../classicEngine";
import { CLASSIC_CATALOG } from "../catalog/classicCatalog";
import { stableStringify } from "../deterministicHash";
import {
  createAnnualSalaryQuote,
  ECONOMY_LEAGUE_POLICIES,
  ECONOMY_POLICY_VERSION,
} from "./economyPolicy";
import type {
  AnnualSalaryQuote,
  EconomyCompetitionId,
} from "./economyPolicy";

export type CareerContract = {
  readonly annualSalary: number;
  readonly clubId: string;
  readonly competitionId: EconomyCompetitionId;
  readonly quote: AnnualSalaryQuote;
  readonly signedAtAge: number;
  readonly signedAtChoiceLogIndex: number;
};

export type CareerSeasonSalary = {
  readonly age: number;
  readonly annualSalary: number;
  readonly contractClubId: string;
  readonly income: number;
  readonly seasonId: string;
  readonly seasonIndex: number;
  readonly suspended: boolean;
  readonly teamId: string;
};

export type CareerEconomyLedgerEntry =
  | {
      readonly contract: CareerContract;
      readonly id: string;
      readonly kind: "contract_signed";
      readonly reason:
        | "academy"
        | "event_transfer"
        | "free_agent"
        | "post_loan"
        | "transfer";
    }
  | {
      readonly contract: CareerContract;
      readonly id: string;
      readonly kind: "contract_retained";
      readonly reason: "loan" | "stay";
    }
  | {
      readonly age: number;
      readonly contract: CareerContract;
      readonly id: string;
      readonly kind: "contract_ended";
      readonly reason: "not_renewed" | "retired";
    }
  | {
      readonly age: number;
      readonly id: string;
      readonly kind: "career_retired";
      readonly reason: "no_offers" | "voluntary";
    }
  | {
      readonly id: string;
      readonly kind: "salary_settled";
      readonly salary: CareerSeasonSalary;
    };

export type CareerEconomyOptionQuote =
  | {
      readonly certainty: "estimated" | "exact";
      readonly clubId: string;
      readonly kind: "new_contract";
      readonly optionId: string;
      readonly quote: AnnualSalaryQuote;
    }
  | {
      readonly contract: CareerContract;
      readonly kind: "contract_unchanged";
      readonly optionId: string;
      readonly reason: "career_choice" | "loan" | "stay";
    }
  | {
      readonly kind: "no_contract";
      readonly optionId: string;
      readonly reason: "free_agent" | "retire";
    };

export type CareerEconomyProjection = {
  readonly currentContract: CareerContract | null;
  readonly economyPolicyVersion: typeof ECONOMY_POLICY_VERSION;
  readonly ledger: readonly CareerEconomyLedgerEntry[];
  readonly optionQuotes: readonly CareerEconomyOptionQuote[];
  readonly seasonSalaries: readonly CareerSeasonSalary[];
  readonly totalIncome: number;
};

export type CareerEconomyChoiceResult =
  | {
      readonly certainty: "exact";
      readonly contract: CareerContract;
      readonly kind: "new_contract";
    }
  | {
      readonly contract: CareerContract;
      readonly kind: "contract_unchanged";
      readonly reason: "career_choice" | "loan" | "stay";
    }
  | {
      readonly kind: "no_contract";
      readonly reason: "free_agent" | "retire";
    };

export function createCareerEconomyProjection(
  career: ClassicCareerState,
): CareerEconomyProjection {
  let replayed = startClassicCareer({
    contentVersion: career.contentVersion,
    identity: career.identity,
    mode: career.mode,
    seed: career.seed,
  });
  let currentContract: CareerContract | null = null;
  const ledger: CareerEconomyLedgerEntry[] = [];
  const seasonSalaries: CareerSeasonSalary[] = [];

  career.choiceLog.forEach((choice, choiceLogIndex) => {
    const decision = replayed.currentDecision;

    if (decision === null) {
      throw new RangeError(
        "Economy replay reached a missing decision",
      );
    }

    const option = requireOption(
      decision.options,
      choice.optionId,
    );

    if (
      currentContract !== null &&
      endsExistingContract(decision)
    ) {
      ledger.push(
        Object.freeze({
          age: decision.age,
          contract: currentContract,
          id: `economy-contract-ended-${choiceLogIndex}`,
          kind: "contract_ended",
          reason: "not_renewed",
        }),
      );
      currentContract = null;
    }

    if (option.kind === "retire") {
      if (currentContract !== null) {
        ledger.push(
          Object.freeze({
            age: decision.age,
            contract: currentContract,
            id: `economy-contract-ended-${choiceLogIndex}`,
            kind: "contract_ended",
            reason: "retired",
          }),
        );
        currentContract = null;
      }

      ledger.push(
        Object.freeze({
          age: decision.age,
          id: `economy-retired-${choiceLogIndex}`,
          kind: "career_retired",
          reason:
            decision.type === "no_offers_retirement"
              ? "no_offers"
              : "voluntary",
        }),
      );
    }

    const previousSeasonCount = replayed.seasons.length;
    const transition = applyClassicChoiceWithResult(
      replayed,
      choice,
    );
    const addedSeasons = transition.career.seasons.slice(
      previousSeasonCount,
    );

    const loan = isLoanOption(decision, option);
    const retainedReason =
      option.kind === "stay"
        ? "stay"
        : loan
          ? "loan"
          : null;

    if (retainedReason !== null) {
      if (currentContract === null) {
        throw new RangeError(
          `Loan choice ${choice.optionId} has no parent contract`,
        );
      }

      ledger.push(
        Object.freeze({
          contract: currentContract,
          id: `economy-contract-retained-${choiceLogIndex}`,
          kind: "contract_retained",
          reason: retainedReason,
        }),
      );
    } else if (option.clubId !== undefined) {
      const club = CLASSIC_CATALOG.clubById.get(option.clubId);

      if (club === undefined) {
        throw new RangeError(
          `Unknown contract club: ${option.clubId}`,
        );
      }

      const competitionId = economyCompetitionId(
        club.competitionId,
      );
      const signingOverall =
        addedSeasons[0]?.overall ?? replayed.overall;
      const peakOverall = Math.max(
        signingOverall,
        ...replayed.seasons.map((season) => season.overall),
      );
      const quote = createAnnualSalaryQuote({
        competitionId,
        overall: signingOverall,
        peakOverall,
      });
      currentContract = Object.freeze({
        annualSalary: quote.annualSalary,
        clubId: club.id,
        competitionId,
        quote,
        signedAtAge: decision.age,
        signedAtChoiceLogIndex: choiceLogIndex,
      });
      ledger.push(
        Object.freeze({
          contract: currentContract,
          id: `economy-contract-${choiceLogIndex}-${club.id}`,
          kind: "contract_signed",
          reason: contractSignReason(decision),
        }),
      );
    }

    for (const season of addedSeasons) {
      if (currentContract === null) {
        throw new RangeError(
          `Season ${season.id} has no contract`,
        );
      }

      const salary = Object.freeze({
        age: season.age,
        annualSalary: currentContract.annualSalary,
        contractClubId: currentContract.clubId,
        income: season.suspended
          ? 0
          : currentContract.annualSalary,
        seasonId: season.id,
        seasonIndex: season.index,
        suspended: season.suspended,
        teamId: season.teamId,
      });
      seasonSalaries.push(salary);
      ledger.push(
        Object.freeze({
          id: `economy-salary-${season.index}`,
          kind: "salary_settled",
          salary,
        }),
      );
    }

    replayed = transition.career;
  });

  if (
    stableStringify(replayed) !== stableStringify(career)
  ) {
    throw new RangeError(
      "Career cannot be reproduced for economy projection",
    );
  }

  if (
    currentContract !== null &&
    replayed.currentDecision !== null &&
    endsExistingContract(replayed.currentDecision)
  ) {
    ledger.push(
      Object.freeze({
        age: replayed.currentDecision.age,
        contract: currentContract,
        id: `economy-contract-ended-${career.choiceLog.length}`,
        kind: "contract_ended",
        reason: "not_renewed",
      }),
    );
    currentContract = null;
  }

  return Object.freeze({
    currentContract,
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    ledger: Object.freeze(ledger),
    optionQuotes: createOptionQuotes(
      replayed,
      currentContract,
    ),
    seasonSalaries: Object.freeze(seasonSalaries),
    totalIncome: seasonSalaries.reduce(
      (total, salary) => total + salary.income,
      0,
    ),
  });
}

export function createCareerEconomyChoiceResult(
  previousCareer: ClassicCareerState,
  transition: ClassicChoiceTransition,
): CareerEconomyChoiceResult {
  const choiceLogIndex = previousCareer.choiceLog.length;
  const choice = transition.career.choiceLog[choiceLogIndex];

  if (
    transition.career.choiceLog.length !==
      choiceLogIndex + 1 ||
    choice === undefined ||
    stableStringify(
      transition.career.choiceLog.slice(
        0,
        choiceLogIndex,
      ),
    ) !== stableStringify(previousCareer.choiceLog) ||
    choice.decisionId !== transition.result.decision.id ||
    choice.decisionType !==
      transition.result.decision.type ||
    choice.optionId !== transition.result.option.id
  ) {
    throw new RangeError(
      "Economy choice result requires one appended committed choice",
    );
  }

  if (transition.result.option.kind === "retire") {
    return Object.freeze({
      kind: "no_contract",
      reason: "retire",
    });
  }

  const currentContract =
    createCareerEconomyProjection(previousCareer)
      .currentContract;

  if (
    isLoanOption(
      transition.result.decision,
      transition.result.option,
    )
  ) {
    return currentContract === null
      ? Object.freeze({
          kind: "no_contract",
          reason: "free_agent",
        })
      : Object.freeze({
          contract: currentContract,
          kind: "contract_unchanged",
          reason: "loan",
        });
  }

  if (transition.result.option.clubId !== undefined) {
    const canonicalTransition =
      applyClassicChoiceWithResult(
        previousCareer,
        choice,
      );
    const signed = createCareerEconomyProjection(
      canonicalTransition.career,
    ).ledger.find(
      (entry) =>
        entry.kind === "contract_signed" &&
        entry.contract.signedAtChoiceLogIndex ===
          choiceLogIndex,
    );

    if (signed?.kind !== "contract_signed") {
      throw new RangeError(
        "Committed club choice has no exact contract",
      );
    }

    return Object.freeze({
      certainty: "exact",
      contract: signed.contract,
      kind: "new_contract",
    });
  }

  if (currentContract === null) {
    return Object.freeze({
      kind: "no_contract",
      reason: "free_agent",
    });
  }

  return Object.freeze({
    contract: currentContract,
    kind: "contract_unchanged",
    reason:
      transition.result.option.kind === "stay"
        ? "stay"
        : "career_choice",
  });
}

function createOptionQuotes(
  state: ClassicCareerState,
  currentContract: CareerContract | null,
): readonly CareerEconomyOptionQuote[] {
  const decision = state.currentDecision;

  if (decision === null) {
    return Object.freeze([]);
  }

  const peakOverall = Math.max(
    state.overall,
    ...state.seasons.map((season) => season.overall),
  );

  return Object.freeze(
    decision.options.map((option) => {
      if (option.kind === "retire") {
        return Object.freeze({
          kind: "no_contract",
          optionId: option.id,
          reason: "retire",
        } as const);
      }

      if (isLoanOption(decision, option)) {
        return currentContract === null
          ? Object.freeze({
              kind: "no_contract",
              optionId: option.id,
              reason: "free_agent",
            } as const)
          : Object.freeze({
              contract: currentContract,
              kind: "contract_unchanged",
              optionId: option.id,
              reason: "loan",
            } as const);
      }

      if (option.clubId !== undefined) {
        const club = CLASSIC_CATALOG.clubById.get(
          option.clubId,
        );

        if (club === undefined) {
          throw new RangeError(
            `Unknown contract club: ${option.clubId}`,
          );
        }

        return Object.freeze({
          certainty:
            decision.type === "career_event"
              ? "estimated"
              : "exact",
          clubId: club.id,
          kind: "new_contract",
          optionId: option.id,
          quote: createAnnualSalaryQuote({
            competitionId: economyCompetitionId(
              club.competitionId,
            ),
            overall: state.overall,
            peakOverall,
          }),
        } as const);
      }

      return currentContract === null
        ? Object.freeze({
            kind: "no_contract",
            optionId: option.id,
            reason: "free_agent",
          } as const)
        : Object.freeze({
            contract: currentContract,
            kind: "contract_unchanged",
            optionId: option.id,
            reason:
              option.kind === "stay"
                ? "stay"
                : "career_choice",
          } as const);
    }),
  );
}

function requireOption(
  options: readonly ClassicDecisionOption[],
  optionId: string,
): ClassicDecisionOption {
  const option = options.find(
    (candidate) => candidate.id === optionId,
  );

  if (option === undefined) {
    throw new RangeError(`Unknown economy option: ${optionId}`);
  }

  return option;
}

function economyCompetitionId(
  competitionId: string,
): EconomyCompetitionId {
  if (competitionId in ECONOMY_LEAGUE_POLICIES) {
    return competitionId as EconomyCompetitionId;
  }

  throw new RangeError(
    `Unsupported economy competition: ${competitionId}`,
  );
}

function endsExistingContract(
  decision: ClassicDecision,
): boolean {
  return (
    decision.type === "contract_nonrenewal" ||
    decision.type === "no_offers_retirement"
  );
}

function contractSignReason(
  decision: ClassicDecision,
):
  | "academy"
  | "event_transfer"
  | "free_agent"
  | "post_loan"
  | "transfer" {
  switch (decision.type) {
    case "academy_offer":
      return "academy";
    case "career_event":
      return "event_transfer";
    case "contract_nonrenewal":
      return "free_agent";
    case "post_loan_not_retained":
    case "post_loan_retained":
      return "post_loan";
    case "transfer":
      return "transfer";
    case "loan_offer":
    case "no_offers_retirement":
      throw new RangeError(
        `Decision ${decision.type} cannot sign a contract`,
      );
  }
}

function isLoanOption(
  decision: ClassicDecision,
  option: ClassicDecisionOption,
): boolean {
  return (
    option.clubId !== undefined &&
    (decision.type === "loan_offer" ||
      (decision.type === "post_loan_not_retained" &&
        option.id.startsWith("loan:")))
  );
}
