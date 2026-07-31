import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import {
  applyClassicChoiceWithResult,
  replayClassicCareer,
  startClassicCareer,
  type ClassicChoiceTransition,
} from "../../domain/classicEngine";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";
import {
  createEventResultReveal,
  useSeasonReveal,
} from "./seasonReveal";

describe("useSeasonReveal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits first, then reveals ordinary seasons before the next decision", () => {
    vi.useFakeTimers();
    const initial = startCareer("issue-14:ordinary-0");
    const decision = initial.currentDecision!;
    const transition = applyClassicChoiceWithResult(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const committedSnapshot = JSON.stringify(
      transition.career,
    );
    const { result } = renderHook(() =>
      useSeasonReveal(initial),
    );

    act(() => {
      result.current.commitTransition(transition);
    });

    expect(result.current.committedCareer).toBe(
      transition.career,
    );
    expect(result.current.revealQueue.map(({ kind }) => kind)).toEqual([
      "season",
      "season",
      "decision_ready",
    ]);
    expect(result.current.activeItem).toMatchObject({
      dwellMs: 550,
      kind: "season",
      seasonIndex: 0,
    });
    expect(result.current.visibleSeasonCount).toBe(0);
    expect(result.current.isRevealing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(549);
    });
    expect(result.current.visibleSeasonCount).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.visibleSeasonCount).toBe(1);
    expect(result.current.activeItem).toMatchObject({
      kind: "season",
      seasonIndex: 1,
    });

    act(() => {
      vi.advanceTimersByTime(550);
    });
    expect(result.current.visibleSeasonCount).toBe(2);
    expect(result.current.activeItem).toBeNull();
    expect(result.current.isRevealing).toBe(false);
    expect(JSON.stringify(result.current.committedCareer)).toBe(
      committedSnapshot,
    );
  });

  it("orders actual event result and milestone holds after its season", () => {
    vi.useFakeTimers();
    const { before, transition } = milestoneTransition();
    const { result } = renderHook(() =>
      useSeasonReveal(before),
    );

    act(() => {
      result.current.commitTransition(transition);
    });

    expect(result.current.revealQueue.map(({ kind }) => kind)).toEqual([
      "season",
      "event_result",
      "milestone",
      "decision_ready",
    ]);

    act(() => {
      vi.advanceTimersByTime(550);
    });
    expect(result.current.activeItem).toMatchObject({
      contractResult: {
        kind: "contract_unchanged",
      },
      dwellMs: 1_600,
      kind: "event_result",
      result: {
        eventKey: "season_load",
        outcomeKind: "positive",
      },
    });
    expect(result.current.visibleSeasonCount).toBe(
      before.seasons.length + 1,
    );

    act(() => {
      vi.advanceTimersByTime(1_599);
    });
    expect(result.current.activeItem?.kind).toBe("event_result");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.activeItem).toMatchObject({
      dwellMs: 1_700,
      kind: "milestone",
    });

    act(() => {
      vi.advanceTimersByTime(1_700);
    });
    expect(result.current.activeItem).toBeNull();
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.recentEventResult).toBe(
      transition.result,
    );
    expect(
      result.current.recentEventContractResult,
    ).toMatchObject({
      kind: "contract_unchanged",
    });
    expect(result.current.announcement).toContain(
      "双倍训练结果",
    );
  });

  it("replaces an estimated event offer with the exact signed contract in the actual-result reveal", () => {
    const { before, transition } = eventTransferTransition();
    const choiceLogIndex = before.choiceLog.length;
    const signed = createCareerEconomyProjection(
      transition.career,
    ).ledger.find(
      (entry) =>
        entry.kind === "contract_signed" &&
        entry.contract.signedAtChoiceLogIndex ===
          choiceLogIndex,
    );

    if (signed?.kind !== "contract_signed") {
      throw new Error("Expected exact event contract");
    }

    const { result } = renderHook(() =>
      useSeasonReveal(before),
    );
    act(() => {
      result.current.commitTransition(transition);
    });
    const eventItem = result.current.revealQueue.find(
      (item) => item.kind === "event_result",
    );

    expect(eventItem).toMatchObject({
      contractResult: {
        contract: {
          annualSalary: signed.contract.annualSalary,
          clubId: "eibar",
        },
        kind: "new_contract",
      },
      kind: "event_result",
    });
    expect(
      createEventResultReveal(
        transition.result,
        eventItem?.kind === "event_result"
          ? eventItem.contractResult
          : null,
      ),
    ).toMatchObject({
      contractSummary: `实际合同：新合同生效 · 年薪 ¥${signed.contract.annualSalary.toLocaleString("en-US")}`,
      summary: expect.any(String),
    });
  });

  it("finishes immediately for reduced motion and cancels its timer on unmount", () => {
    vi.useFakeTimers();
    const { before, transition } = milestoneTransition();
    const immediate = renderHook(() =>
      useSeasonReveal(before, { reducedMotion: true }),
    );

    act(() => {
      immediate.result.current.commitTransition(transition);
    });
    expect(immediate.result.current.visibleSeasonCount).toBe(
      transition.career.seasons.length,
    );
    expect(immediate.result.current.isRevealing).toBe(false);
    expect(immediate.result.current.activeItem).toBeNull();
    expect(immediate.result.current.recentEventResult).toBe(
      transition.result,
    );
    expect(immediate.result.current.announcement).toContain(
      "成为绝对主力",
    );
    immediate.unmount();

    const timed = renderHook(() => useSeasonReveal(before));
    act(() => {
      timed.result.current.commitTransition(transition);
    });
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      timed.result.current.commitTransition(transition);
    });
    expect(
      timed.result.current.revealQueue.map(({ kind }) => kind),
    ).toEqual([
      "event_result",
      "decision_ready",
    ]);
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(550);
    });
    expect(timed.result.current.activeItem?.kind).toBe(
      "event_result",
    );

    timed.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function startCareer(seed: string) {
  return startClassicCareer({
    identity: {
      lastName: "李",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 10,
    },
    mode: "normal",
    seed,
  });
}

function milestoneTransition(): {
  before: ReturnType<typeof replayClassicCareer>;
  transition: ClassicChoiceTransition;
} {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "matrix-long-support-high",
  );

  if (fixture === undefined) {
    throw new Error("Missing season-load golden fixture");
  }

  const choiceIndex = fixture.choices.findIndex(
    ({ optionId }) =>
      optionId === "event:season_load:accept",
  );
  const before = replayClassicCareer({
    choices: fixture.choices.slice(0, choiceIndex),
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });
  const choice = fixture.choices[choiceIndex];

  if (choice === undefined) {
    throw new Error("Missing season-load choice");
  }

  const resolved = applyClassicChoiceWithResult(before, {
    ...choice,
    forcedOutcome: "positive",
  });
  const firstNewSeasonIndex = before.seasons.length;
  const career = {
    ...resolved.career,
    seasons: resolved.career.seasons.map((season, index) =>
      index === firstNewSeasonIndex
        ? {
            ...season,
            trophies: [
              ...season.trophies,
              "league" as const,
            ],
          }
        : season,
    ),
  };

  return {
    before,
    transition: {
      career,
      result: resolved.result,
    },
  };
}

function eventTransferTransition(): {
  before: ReturnType<typeof replayClassicCareer>;
  transition: ClassicChoiceTransition;
} {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "special-journeyman",
  );

  if (fixture === undefined) {
    throw new Error("Missing event-transfer golden fixture");
  }

  const choiceIndex = fixture.choices.findIndex(
    ({ optionId }) => optionId === "join:eibar",
  );
  const before = replayClassicCareer({
    choices: fixture.choices.slice(0, choiceIndex),
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });
  const choice = fixture.choices[choiceIndex];

  if (choice === undefined) {
    throw new Error("Missing event-transfer choice");
  }

  return {
    before,
    transition: applyClassicChoiceWithResult(
      before,
      choice,
    ),
  };
}
