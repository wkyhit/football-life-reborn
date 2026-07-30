import { describe, expect, it } from "vitest";

import { careerReducer, createInitialCareerState } from "./careerReducer";
import type {
  CareerState,
  ChoiceLogEntry,
  Phase1EventType,
} from "./model";

const expectedEventSequence: readonly Phase1EventType[] = [
  "academy_offer",
  "training_extra",
  "transfer",
  "season_load",
  "loan_offer",
  "post_loan_retained",
  "transfer",
  "loan_offer",
  "post_loan_not_retained",
  "training_extra",
  "season_load",
  "no_offers_retirement",
];

function startChineseStriker(seed: string): CareerState {
  let state = createInitialCareerState(seed);
  state = careerReducer(state, { type: "begin_setup" });
  state = careerReducer(state, {
    nationality: "CHN",
    type: "select_nationality",
  });
  state = careerReducer(state, { type: "continue_setup" });
  state = careerReducer(state, {
    foot: "left",
    name: "林一鸣",
    number: "9",
    type: "update_identity",
  });
  state = careerReducer(state, { type: "continue_setup" });
  state = careerReducer(state, {
    position: "ST",
    type: "select_position",
  });
  return careerReducer(state, { type: "start_career" });
}

function playFirstOptions(seed: string): {
  eventTypes: Phase1EventType[];
  state: CareerState;
} {
  let state = startChineseStriker(seed);
  const eventTypes: Phase1EventType[] = [];
  let decisions = 0;

  while (state.phase !== "retired") {
    if (state.phase === "period_result") {
      state = careerReducer(state, { type: "continue_career" });
      continue;
    }

    expect(state.phase).toBe("decision");
    expect(state.activeDecision).not.toBeNull();

    const decision = state.activeDecision!;
    const option = decision.options[0];

    expect(option).toBeDefined();
    eventTypes.push(decision.type);
    state = careerReducer(state, {
      decisionId: decision.id,
      optionId: option!.id,
      type: "choose_decision",
    });
    decisions += 1;

    if (decisions > 20) {
      throw new Error("Golden career exceeded the decision safety bound");
    }
  }

  return { eventTypes, state };
}

function replayChoices(
  seed: string,
  choiceLog: readonly ChoiceLogEntry[],
): CareerState {
  let state = startChineseStriker(seed);

  for (const choice of choiceLog) {
    if (state.phase === "period_result") {
      state = careerReducer(state, { type: "continue_career" });
    }

    state = careerReducer(state, {
      decisionId: choice.decisionId,
      optionId: choice.optionId,
      type: "choose_decision",
    });
  }

  return state;
}

describe("Phase 1 golden vertical career", () => {
  it("covers all eight event types and replays byte-for-byte to retirement", () => {
    const seed = "phase-1:golden-career";
    const firstRun = playFirstOptions(seed);

    expect(firstRun.eventTypes).toEqual(expectedEventSequence);
    expect(new Set(firstRun.eventTypes).size).toBe(8);
    expect(firstRun.state.phase).toBe("retired");
    expect(firstRun.state.choiceLog).toHaveLength(12);
    expect(firstRun.state.career.age).toBe(38);
    expect(firstRun.state.career.seasons).toHaveLength(22);
    expect(firstRun.state.career.ability).toBeGreaterThanOrEqual(40);
    expect(firstRun.state.career.ability).toBeLessThanOrEqual(99);
    expect(firstRun.state.career.valueEuro).toBeGreaterThanOrEqual(100_000);
    expect(firstRun.state.career.totals.appearances).toBeGreaterThan(0);
    expect(firstRun.state.career.retirementReason).toBe(
      "连续两个赛季没有收到职业合同",
    );
    expect({
      ability: firstRun.state.career.ability,
      clubId: firstRun.state.career.clubId,
      rngState: firstRun.state.rngState,
      role: firstRun.state.career.role,
      totals: firstRun.state.career.totals,
      trophyCount: firstRun.state.career.trophies.length,
      valueEuro: firstRun.state.career.valueEuro,
    }).toEqual({
      ability: 77,
      clubId: null,
      rngState: 2_566_044_783,
      role: "free_agent",
      totals: {
        appearances: 615,
        assists: 152,
        goals: 337,
      },
      trophyCount: 10,
      valueEuro: 45_680_000,
    });

    const replay = replayChoices(seed, firstRun.state.choiceLog);
    const secondReplay = replayChoices(seed, firstRun.state.choiceLog);

    expect(JSON.stringify(replay)).toBe(JSON.stringify(firstRun.state));
    expect(JSON.stringify(secondReplay)).toBe(
      JSON.stringify(firstRun.state),
    );
  });
});
