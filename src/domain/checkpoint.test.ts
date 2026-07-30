import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  replayClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
} from "./classicEngine";
import {
  createCareerBranch,
  createDecisionCheckpoints,
  type DecisionCheckpoint,
} from "./checkpoint";

describe("decision checkpoints", () => {
  it("creates an immutable replayable checkpoint at every decision boundary", () => {
    const parent = advanceCareer(
      createCareer("phase-5:checkpoints"),
      2,
    );
    const checkpoints = createDecisionCheckpoints(parent);

    expect(checkpoints).toHaveLength(
      parent.choiceLog.length + 1,
    );
    expect(Object.isFrozen(checkpoints)).toBe(true);
    expect(checkpoints[0]).toMatchObject({
      age: 16,
      choiceLogLength: 0,
      contentVersion: parent.contentVersion,
      decisionId: "decision-0-16-academy_offer",
      decisionType: "academy_offer",
      rngState: expect.any(Number),
      seed: parent.seed,
      stateHash: expect.stringMatching(/^fnv1a64:[0-9a-f]{16}$/),
    });
    expect(Object.isFrozen(checkpoints[0])).toBe(true);
    expect(checkpoints.at(-1)).toMatchObject({
      choiceLogLength: parent.choiceLog.length,
      decisionId: parent.currentDecision!.id,
      rngState: parent.rngState,
    });
    expect(createDecisionCheckpoints(parent)).toEqual(
      checkpoints,
    );

    for (const checkpoint of checkpoints) {
      const replayed = replayToCheckpoint(parent, checkpoint);
      expect(replayed.currentDecision?.id).toBe(
        checkpoint.decisionId,
      );
      expect(replayed.playerAge).toBe(checkpoint.age);
      expect(replayed.rngState).toBe(checkpoint.rngState);
    }
  });

  it("forks a historical checkpoint with the same deterministic inputs and a diverging choice", () => {
    const parent = advanceCareer(
      createCareer("phase-5:branch"),
      2,
    );
    const parentBefore = JSON.stringify(parent);
    const checkpoint = createDecisionCheckpoints(parent)[0]!;
    const preDecision = replayToCheckpoint(
      parent,
      checkpoint,
    );
    const originalChoice =
      parent.choiceLog[checkpoint.choiceLogLength]!;
    const alternative = preDecision.currentDecision!.options.find(
      (option) => option.id !== originalChoice.optionId,
    );

    if (alternative === undefined) {
      throw new Error("Expected an alternative choice");
    }

    const choice: ClassicChoiceLogEntry = {
      decisionId: checkpoint.decisionId,
      decisionType: checkpoint.decisionType,
      optionId: alternative.id,
    };
    const branch = createCareerBranch({
      branchId: "branch-alternative",
      checkpoint,
      choice,
      parent,
      parentCareerId: "career-parent",
    });

    expect(branch).toMatchObject({
      id: "branch-alternative",
      parentCareerId: "career-parent",
      parentCheckpointId: checkpoint.id,
      originalChoice,
    });
    expect(branch.career.seed).toBe(parent.seed);
    expect(branch.career.contentVersion).toBe(
      parent.contentVersion,
    );
    expect(branch.career.identity).toEqual(parent.identity);
    expect(branch.career.choiceLog).toEqual([choice]);
    expect(branch.career.choiceLog).not.toEqual(
      parent.choiceLog.slice(0, 1),
    );
    expect(JSON.stringify(parent)).toBe(parentBefore);

    const replayedBranch = replayClassicCareer({
      choices: branch.career.choiceLog,
      contentVersion: branch.career.contentVersion,
      identity: branch.career.identity,
      mode: branch.career.mode,
      seed: branch.career.seed,
    });
    expect(JSON.stringify(replayedBranch)).toBe(
      JSON.stringify(branch.career),
    );
  });

  it("preserves the parent prefix when forking a later checkpoint", () => {
    const parent = advanceCareer(
      createCareer("phase-5:later-branch"),
      3,
    );
    const checkpoint =
      createDecisionCheckpoints(parent)[1]!;
    const preDecision = replayToCheckpoint(
      parent,
      checkpoint,
    );
    const originalChoice =
      parent.choiceLog[checkpoint.choiceLogLength]!;
    const alternative = preDecision.currentDecision!.options.find(
      (option) => option.id !== originalChoice.optionId,
    );

    if (alternative === undefined) {
      throw new Error("Expected an alternative choice");
    }

    const branch = createCareerBranch({
      branchId: "branch-later",
      checkpoint,
      choice: {
        decisionId: checkpoint.decisionId,
        decisionType: checkpoint.decisionType,
        optionId: alternative.id,
      },
      parent,
      parentCareerId: "career-parent",
    });

    expect(
      branch.career.choiceLog.slice(
        0,
        checkpoint.choiceLogLength,
      ),
    ).toEqual(
      parent.choiceLog.slice(
        0,
        checkpoint.choiceLogLength,
      ),
    );
    expect(
      branch.career.choiceLog[checkpoint.choiceLogLength],
    ).not.toEqual(originalChoice);
  });

  it("rejects tampered checkpoints and non-diverging branch choices", () => {
    const parent = advanceCareer(
      createCareer("phase-5:branch-rejections"),
      1,
    );
    const checkpoint = createDecisionCheckpoints(parent)[0]!;
    const originalChoice = parent.choiceLog[0]!;

    expect(() =>
      createCareerBranch({
        branchId: "branch-tampered",
        checkpoint: {
          ...checkpoint,
          stateHash: "fnv1a64:0000000000000000",
        },
        choice: originalChoice,
        parent,
        parentCareerId: "career-parent",
      }),
    ).toThrow("Checkpoint does not belong to the parent career");
    expect(() =>
      createCareerBranch({
        branchId: "branch-same-choice",
        checkpoint,
        choice: originalChoice,
        parent,
        parentCareerId: "career-parent",
      }),
    ).toThrow("Branch choice must diverge");
  });
});

function createCareer(seed: string): ClassicCareerState {
  return startClassicCareer({
    identity: {
      lastName: "林一鸣",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed,
  });
}

function advanceCareer(
  initial: ClassicCareerState,
  choiceCount: number,
): ClassicCareerState {
  let career = initial;

  for (let index = 0; index < choiceCount; index += 1) {
    const decision = career.currentDecision;

    if (decision === null) {
      throw new Error("Expected another career decision");
    }

    career = applyClassicChoice(career, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
  }

  return career;
}

function replayToCheckpoint(
  parent: ClassicCareerState,
  checkpoint: DecisionCheckpoint,
): ClassicCareerState {
  return replayClassicCareer({
    choices: parent.choiceLog.slice(
      0,
      checkpoint.choiceLogLength,
    ),
    contentVersion: parent.contentVersion,
    identity: parent.identity,
    mode: parent.mode,
    seed: parent.seed,
  });
}
