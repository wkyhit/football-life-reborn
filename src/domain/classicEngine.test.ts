import { describe, expect, it } from "vitest";

import { CLASSIC_GOLDEN_FIXTURES } from "../../tests/golden/fixtures";
import {
  applyClassicChoice,
  applyClassicChoiceWithResult,
  replayClassicCareer,
  type ClassicChoiceLogEntry,
} from "./classicEngine";

describe("Classic decision transition results", () => {
  it("returns the committed career and actual positive or negative event result without a second draw", () => {
    const { before, choice, decision } = seasonLoadDecision();

    for (const forcedOutcome of [
      "positive",
      "negative",
    ] as const) {
      const forcedChoice = {
        ...choice,
        forcedOutcome,
      };
      const transition = applyClassicChoiceWithResult(
        before,
        forcedChoice,
      );

      expect(transition.result).toMatchObject({
        decision,
        effects: {
          deferredOverallDelta: 0,
          immediateOverallDelta: 0,
          permanentOverallDelta: 0,
          roleOverride:
            forcedOutcome === "positive"
              ? "starter"
              : "substitute",
          roleShift: 0,
          suspensionSeasons: 0,
        },
        eventKey: "season_load",
        option: {
          id: "event:season_load:accept",
          optionKey: "accept",
        },
        outcomeKind: forcedOutcome,
      });
      expect(transition.career).toEqual(
        applyClassicChoice(before, forcedChoice),
      );
      expect(Object.isFrozen(transition)).toBe(true);
      expect(Object.isFrozen(transition.result)).toBe(true);
      expect(Object.isFrozen(transition.result.effects)).toBe(true);
    }

    const divergentBefore = {
      ...before,
      rngState: 45,
    };
    const natural = applyClassicChoiceWithResult(
      divergentBefore,
      choice,
    );
    const firstCommittedSeason = natural.career.seasons[
      divergentBefore.seasons.length
    ];

    expect(natural.result.outcomeKind).toBe("positive");
    expect(natural.result.effects?.roleOverride).toBe("starter");
    expect(firstCommittedSeason?.role).toBe("starter");
  });
});

function seasonLoadDecision(): {
  before: ReturnType<typeof replayClassicCareer>;
  choice: ClassicChoiceLogEntry;
  decision: NonNullable<
    ReturnType<typeof replayClassicCareer>["currentDecision"]
  >;
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
  const decision = before.currentDecision;
  const choice = fixture.choices[choiceIndex];

  if (
    decision === null ||
    decision.event?.eventKey !== "season_load" ||
    choice === undefined
  ) {
    throw new Error("Expected a season-load decision");
  }

  return { before, choice, decision };
}
