import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../../domain/classicEngine";
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
});
