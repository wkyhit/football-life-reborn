import {
  applyClassicChoice,
  replayClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
  type ClassicDecisionType,
} from "./classicEngine";
import {
  deterministicHash,
  stableStringify,
} from "./deterministicHash";

export type DecisionCheckpoint = {
  readonly age: number;
  readonly choiceLogLength: number;
  readonly contentVersion: string;
  readonly decisionId: string;
  readonly decisionType: ClassicDecisionType;
  readonly id: string;
  readonly rngState: number;
  readonly seed: string;
  readonly stateHash: string;
};

export type CareerBranch = {
  readonly career: ClassicCareerState;
  readonly id: string;
  readonly originalChoice: ClassicChoiceLogEntry;
  readonly parentCareerId: string;
  readonly parentCheckpointId: string;
};

export function createDecisionCheckpoint(
  career: ClassicCareerState,
): DecisionCheckpoint {
  const decision = career.currentDecision;

  if (career.phase !== "decision" || decision === null) {
    throw new RangeError(
      "A checkpoint requires a pre-decision career state",
    );
  }

  const stateHash = deterministicHash(career);

  return Object.freeze({
    age: career.playerAge,
    choiceLogLength: career.choiceLog.length,
    contentVersion: career.contentVersion,
    decisionId: decision.id,
    decisionType: decision.type,
    id: `checkpoint-${career.choiceLog.length}-${stateHash.slice(-12)}`,
    rngState: career.rngState,
    seed: career.seed,
    stateHash,
  });
}

export function createDecisionCheckpoints(
  career: ClassicCareerState,
): readonly DecisionCheckpoint[] {
  let replayed = startClassicCareer({
    contentVersion: career.contentVersion,
    identity: career.identity,
    mode: career.mode,
    seed: career.seed,
  });
  const checkpoints: DecisionCheckpoint[] = [];

  for (const choice of career.choiceLog) {
    checkpoints.push(
      createDecisionCheckpoint(replayed),
    );
    replayed = applyClassicChoice(replayed, choice);
  }

  if (career.phase === "decision") {
    checkpoints.push(
      createDecisionCheckpoint(replayed),
    );
  }

  if (
    stableStringify(replayed) !== stableStringify(career)
  ) {
    throw new RangeError(
      "Career cannot be reproduced for checkpoint creation",
    );
  }

  return Object.freeze(checkpoints);
}

export function createCareerBranch(input: {
  readonly branchId: string;
  readonly checkpoint: DecisionCheckpoint;
  readonly choice: ClassicChoiceLogEntry;
  readonly parent: ClassicCareerState;
  readonly parentCareerId: string;
}): CareerBranch {
  const expectedCheckpoint = createDecisionCheckpoints(
    input.parent,
  ).find(
    (candidate) =>
      candidate.id === input.checkpoint.id,
  );

  if (
    expectedCheckpoint === undefined ||
    stableStringify(expectedCheckpoint) !==
      stableStringify(input.checkpoint)
  ) {
    throw new RangeError(
      "Checkpoint does not belong to the parent career",
    );
  }

  const originalChoice =
    input.parent.choiceLog[
      input.checkpoint.choiceLogLength
    ];

  if (originalChoice === undefined) {
    throw new RangeError(
      "Checkpoint has no historical parent choice",
    );
  }

  if (
    stableStringify(originalChoice) ===
    stableStringify(input.choice)
  ) {
    throw new RangeError("Branch choice must diverge");
  }

  const preDecision = replayClassicCareer({
    choices: input.parent.choiceLog.slice(
      0,
      input.checkpoint.choiceLogLength,
    ),
    contentVersion: input.parent.contentVersion,
    identity: input.parent.identity,
    mode: input.parent.mode,
    seed: input.parent.seed,
  });

  if (
    deterministicHash(preDecision) !==
    input.checkpoint.stateHash
  ) {
    throw new RangeError(
      "Checkpoint state hash cannot be reproduced",
    );
  }

  const career = applyClassicChoice(
    preDecision,
    input.choice,
  );

  return Object.freeze({
    career,
    id: input.branchId,
    originalChoice,
    parentCareerId: input.parentCareerId,
    parentCheckpointId: input.checkpoint.id,
  });
}
