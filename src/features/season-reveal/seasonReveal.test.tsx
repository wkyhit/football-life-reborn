import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../../domain/classicEngine";
import { useSeasonReveal } from "./seasonReveal";

describe("useSeasonReveal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits the complete engine result before revealing seasons", () => {
    vi.useFakeTimers();
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-3:season-reveal",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected the initial academy decision");
    }

    const committed = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const committedSnapshot = JSON.stringify(committed);
    const { result } = renderHook(() =>
      useSeasonReveal(initial, { stepMs: 650 }),
    );

    act(() => {
      result.current.commitCareer(committed);
    });

    expect(result.current.committedCareer).toBe(committed);
    expect(result.current.committedCareer.currentDecision).toBe(
      committed.currentDecision,
    );
    expect(result.current.visibleSeasonCount).toBe(0);
    expect(result.current.isRevealing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(649);
    });
    expect(result.current.visibleSeasonCount).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.visibleSeasonCount).toBe(1);
    expect(result.current.committedCareer).toBe(committed);

    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(result.current.visibleSeasonCount).toBe(2);
    expect(result.current.isRevealing).toBe(false);
    expect(JSON.stringify(result.current.committedCareer)).toBe(
      committedSnapshot,
    );
  });

  it("finishes immediately when reduced motion is enabled or changes", () => {
    vi.useFakeTimers();
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-4:reduced-motion",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected the initial academy decision");
    }

    const committed = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const { rerender, result } = renderHook(
      ({ reducedMotion }) =>
        useSeasonReveal(initial, {
          reducedMotion,
          stepMs: 650,
        }),
      {
        initialProps: { reducedMotion: false },
      },
    );

    act(() => {
      result.current.commitCareer(committed);
    });
    expect(result.current.isRevealing).toBe(true);

    rerender({ reducedMotion: true });
    expect(result.current.visibleSeasonCount).toBe(
      committed.seasons.length,
    );
    expect(result.current.isRevealing).toBe(false);

    const immediate = renderHook(() =>
      useSeasonReveal(initial, {
        reducedMotion: true,
        stepMs: 650,
      }),
    );
    act(() => {
      immediate.result.current.commitCareer(committed);
    });
    expect(immediate.result.current.visibleSeasonCount).toBe(
      committed.seasons.length,
    );
    expect(immediate.result.current.isRevealing).toBe(false);
  });
});
