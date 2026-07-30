import { describe, expect, it } from "vitest";

import { careerReducer, createInitialCareerState } from "./careerReducer";
import type { CareerDecision, CareerState } from "./model";

const academyDecision: CareerDecision = {
  age: 16,
  description: "两家中超俱乐部邀请你加入青训。",
  id: "academy-offer-16",
  options: [
    { id: "join-beijing", label: "加盟北京国安" },
    { id: "join-shanghai", label: "加盟上海申花" },
  ],
  title: "青训报价",
  type: "academy_offer",
};

function reachIdentity(seed = "phase-1:reducer"): CareerState {
  const initial = createInitialCareerState(seed);
  const nationality = careerReducer(initial, { type: "begin_setup" });
  const selected = careerReducer(nationality, {
    nationality: "CHN",
    type: "select_nationality",
  });
  return careerReducer(selected, { type: "continue_setup" });
}

describe("career reducer", () => {
  it("rejects invalid phases and options while keeping valid transitions immutable", () => {
    const initial = createInitialCareerState("phase-1:reducer");
    const invalidPhase = careerReducer(initial, {
      name: "林一鸣",
      type: "update_identity",
    });

    expect(invalidPhase).toBe(initial);

    const identity = reachIdentity();
    const originalPlayer = { ...identity.player };
    const updated = careerReducer(identity, {
      foot: "left",
      name: "林一鸣",
      number: "9",
      type: "update_identity",
    });

    expect(updated).not.toBe(identity);
    expect(updated.player).not.toBe(identity.player);
    expect(identity.player).toEqual(originalPlayer);
    expect(updated.player).toMatchObject({
      foot: "left",
      name: "林一鸣",
      number: "9",
    });

    const invalidIdentity = careerReducer(updated, {
      name: "   ",
      type: "update_identity",
    });
    expect(
      careerReducer(invalidIdentity, { type: "continue_setup" }),
    ).toBe(invalidIdentity);

    const decisionState: CareerState = {
      ...updated,
      activeDecision: academyDecision,
      phase: "decision",
    };
    const unknownDecision = careerReducer(decisionState, {
      decisionId: "another-decision",
      optionId: "join-beijing",
      type: "choose_decision",
    });
    const unknownOption = careerReducer(decisionState, {
      decisionId: academyDecision.id,
      optionId: "join-unknown",
      type: "choose_decision",
    });

    expect(unknownDecision).toBe(decisionState);
    expect(unknownOption).toBe(decisionState);

    const resolved = careerReducer(decisionState, {
      decisionId: academyDecision.id,
      optionId: "join-beijing",
      type: "choose_decision",
    });

    expect(resolved).not.toBe(decisionState);
    expect(decisionState.activeDecision).toBe(academyDecision);
    expect(decisionState.choiceLog).toEqual([]);
    expect(resolved.activeDecision).toBeNull();
    expect(resolved.phase).toBe("period_result");
    expect(resolved.choiceLog).toEqual([
      {
        age: 16,
        decisionId: academyDecision.id,
        eventType: "academy_offer",
        optionId: "join-beijing",
      },
    ]);
  });
});
