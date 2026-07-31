import {
  applyClassicChoice,
  startClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
} from "../../domain/classicEngine";
import { deterministicHash } from "../../domain/deterministicHash";
import {
  createCareerEconomyProjection,
  type CareerEconomyProjection,
} from "../../domain/economy/careerEconomyProjection";
import { ECONOMY_POLICY_VERSION } from "../../domain/economy/economyPolicy";
import type {
  ReplayChoice,
  ReplayPayload,
} from "./codec";

export type ChallengeReplayResult =
  | {
      readonly career: ClassicCareerState;
      readonly economy: CareerEconomyProjection;
      readonly economyPolicyVersion:
        typeof ECONOMY_POLICY_VERSION;
      readonly stateHash: string;
      readonly status: "ready";
    }
  | {
      readonly actualEconomyPolicyVersion: unknown;
      readonly expectedEconomyPolicyVersion:
        typeof ECONOMY_POLICY_VERSION;
      readonly reason: "economy_policy";
      readonly status: "invalid";
    }
  | {
      readonly detail: string;
      readonly reason: "invalid_setup";
      readonly status: "invalid";
    }
  | {
      readonly choiceIndex: number;
      readonly reason: "choice_after_retirement";
      readonly status: "invalid";
    }
  | {
      readonly choiceIndex: number;
      readonly decisionId: string;
      readonly optionId: string;
      readonly reason: "choice_not_available";
      readonly status: "invalid";
    }
  | {
      readonly choiceIndex: number;
      readonly decisionId: string;
      readonly detail: string;
      readonly optionId: string;
      readonly reason: "choice_rejected";
      readonly status: "invalid";
    }
  | {
      readonly actualStateHash: string;
      readonly expectedStateHash: string;
      readonly reason: "state_hash";
      readonly status: "invalid";
    };

export function createReplayPayload(input: {
  readonly career: ClassicCareerState;
  readonly challengeId: string;
}): ReplayPayload {
  const identity = Object.freeze({
    ...(input.career.identity.firstName === undefined
      ? {}
      : { firstName: input.career.identity.firstName }),
    lastName: input.career.identity.lastName,
    nationalityFifaCode:
      input.career.identity.nationalityFifaCode,
    position: input.career.identity.position,
    preferredNumber:
      input.career.identity.preferredNumber,
  });
  const choiceLog = Object.freeze(
    input.career.choiceLog.map(toReplayChoice),
  );

  return Object.freeze({
    challengeId: input.challengeId,
    choiceLog,
    contentVersion: input.career.contentVersion,
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    identity,
    mode: input.career.mode,
    seed: input.career.seed,
    stateHash: deterministicHash(input.career),
  });
}

export function replayChallengePayload(
  payload: ReplayPayload,
): ChallengeReplayResult {
  if (
    payload.economyPolicyVersion !== ECONOMY_POLICY_VERSION
  ) {
    return Object.freeze({
      actualEconomyPolicyVersion:
        payload.economyPolicyVersion,
      expectedEconomyPolicyVersion:
        ECONOMY_POLICY_VERSION,
      reason: "economy_policy",
      status: "invalid",
    });
  }

  let career: ClassicCareerState;

  try {
    career = startClassicCareer({
      contentVersion: payload.contentVersion,
      identity: payload.identity,
      mode: payload.mode,
      seed: payload.seed,
    });
  } catch (error) {
    return Object.freeze({
      detail: readableError(error),
      reason: "invalid_setup",
      status: "invalid",
    });
  }

  for (
    let choiceIndex = 0;
    choiceIndex < payload.choiceLog.length;
    choiceIndex += 1
  ) {
    const compactChoice = payload.choiceLog[choiceIndex]!;
    const decision = career.currentDecision;

    if (career.phase === "summary" || decision === null) {
      return Object.freeze({
        choiceIndex,
        reason: "choice_after_retirement",
        status: "invalid",
      });
    }

    if (
      !decision.options.some(
        (option) => option.id === compactChoice.optionId,
      )
    ) {
      return Object.freeze({
        choiceIndex,
        decisionId: decision.id,
        optionId: compactChoice.optionId,
        reason: "choice_not_available",
        status: "invalid",
      });
    }

    const choice: ClassicChoiceLogEntry = {
      decisionId: decision.id,
      decisionType: decision.type,
      ...(compactChoice.forcedOutcome === undefined
        ? {}
        : {
            forcedOutcome: compactChoice.forcedOutcome,
          }),
      optionId: compactChoice.optionId,
    };

    try {
      career = applyClassicChoice(career, choice);
    } catch (error) {
      return Object.freeze({
        choiceIndex,
        decisionId: decision.id,
        detail: readableError(error),
        optionId: compactChoice.optionId,
        reason: "choice_rejected",
        status: "invalid",
      });
    }
  }

  const stateHash = deterministicHash(career);

  if (stateHash !== payload.stateHash) {
    return Object.freeze({
      actualStateHash: stateHash,
      expectedStateHash: payload.stateHash,
      reason: "state_hash",
      status: "invalid",
    });
  }

  return Object.freeze({
    career,
    economy: createCareerEconomyProjection(career),
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    stateHash,
    status: "ready",
  });
}

function toReplayChoice(
  choice: ClassicChoiceLogEntry,
): ReplayChoice {
  return Object.freeze({
    ...(choice.forcedOutcome === undefined
      ? {}
      : { forcedOutcome: choice.forcedOutcome }),
    optionId: choice.optionId,
  });
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
