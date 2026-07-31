import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  replayClassicCareer,
  startClassicCareer,
} from "../../domain/classicEngine";
import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import { createCareerPresentation } from "./careerPresentation";

describe("Classic career presentation", () => {
  it("separates committed engine state from the visible reveal cursor", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-3:career-presentation",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected an academy decision");
    }

    const committed = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const immediate = createCareerPresentation({
      career: committed,
      isRevealing: true,
      visibleSeasonCount: 0,
    });

    expect(immediate.header.age).toBe(committed.playerAge);
    expect(immediate.header.overall).toBe(committed.overall);
    expect(immediate.totals).toEqual({
      appearances: 0,
      assists: 0,
      goals: 0,
      trophies: 0,
    });
    expect(immediate.panel).toEqual({ kind: "simulating" });
    expect(
      immediate.timeline.filter((row) => row.kind === "season"),
    ).toHaveLength(0);

    const firstSeason = committed.seasons[0]!;
    const partial = createCareerPresentation({
      career: committed,
      isRevealing: true,
      visibleSeasonCount: 1,
    });

    expect(partial.header).toMatchObject({
      age: firstSeason.age,
      marketValue: firstSeason.marketValue,
      overall: firstSeason.overall,
    });
    expect(partial.totals).toMatchObject({
      appearances: firstSeason.stats.appearances,
      assists: firstSeason.stats.assists,
      goals: firstSeason.stats.goals,
    });
    expect(
      partial.timeline.filter((row) => row.kind === "season"),
    ).toHaveLength(1);

    const revealed = createCareerPresentation({
      career: committed,
      isRevealing: false,
      visibleSeasonCount: committed.seasons.length,
    });

    expect(revealed.header.age).toBe(committed.playerAge);
    expect(revealed.panel.kind).toBe("decision");
    expect(
      revealed.timeline.filter((row) => row.kind === "current"),
    ).toEqual([
      { age: committed.currentDecision?.age, kind: "current" },
    ]);
  });

  it("presents a career event with specific labels and exact consequences", () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "matrix-long-support-high",
    );

    if (fixture === undefined) {
      throw new Error("Missing season-load golden fixture");
    }

    const eventChoiceIndex = fixture.choices.findIndex(
      ({ optionId }) =>
        optionId === "event:season_load:accept",
    );
    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, eventChoiceIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const presentation = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: career.seasons.length,
    });

    if (
      presentation.panel.kind !== "decision" ||
      career.currentDecision?.event?.eventKey !== "season_load"
    ) {
      throw new Error("Expected a season-load decision");
    }

    const accept = presentation.panel.options.find(
      ({ id }) => id === "event:season_load:accept",
    );
    const expected =
      career.currentDecision.event.variantKey === "double_session"
        ? {
            label: "接受双倍训练",
            negativeProbability: 0.35,
            positiveProbability: 0.65,
          }
        : {
            label: "承担更多负荷",
            negativeProbability: 0.3,
            positiveProbability: 0.7,
          };

    expect(accept).toMatchObject({
      outcomePreviews: [
        {
          outcomeKind: "positive",
          probability: expected.positiveProbability,
          text: "成为绝对主力",
        },
        {
          outcomeKind: "negative",
          probability: expected.negativeProbability,
          text: "降为替补",
        },
      ],
      title: expected.label,
    });
    expect(accept?.subtitle).not.toBe(accept?.title);
  });
});
