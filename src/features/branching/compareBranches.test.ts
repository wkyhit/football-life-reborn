import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  defaultClassicChoicePolicy,
  startClassicCareer,
  type ClassicCareerState,
} from "../../domain/classicEngine";
import {
  compareBranches,
  type ComparableBranch,
} from "./compareBranches";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";

const IDENTITY = {
  lastName: "林一鸣",
  nationalityFifaCode: "CHN",
  position: "ST",
  preferredNumber: 9,
} as const;

describe("parallel-life branch comparison", () => {
  it("normalizes every approved comparison category for compatible diverging careers", () => {
    const [left, right] = createDivergingCareers(
      "phase-5:comparison",
      "normal",
    );
    const comparison = compareBranches(
      branch("left", "稳健人生", left),
      branch("right", "冒险人生", right),
    );

    expect(comparison.status).toBe("ready");

    if (comparison.status !== "ready") {
      throw new Error("Expected compatible branches");
    }

    expect(comparison.commonChoiceCount).toBe(0);
    expect(comparison.divergenceChoiceIndex).toBe(0);
    expect(comparison.abilityCurve.length).toBeGreaterThan(0);
    expect(comparison.valueCurve.length).toBeGreaterThan(0);
    expect(
      comparison.abilityCurve.map((point) => point.age),
    ).toEqual(
      [...comparison.abilityCurve]
        .map((point) => point.age)
        .sort((a, b) => a - b),
    );
    expect(comparison.clubs.left.length).toBeGreaterThan(0);
    expect(comparison.clubs.right.length).toBeGreaterThan(0);
    expect(comparison.totals.appearances).toEqual({
      delta:
        comparison.totals.appearances.left -
        comparison.totals.appearances.right,
      left: expect.any(Number),
      right: expect.any(Number),
    });
    expect(
      comparison.trophies.rows.reduce(
        (total, row) => total + row.left,
        0,
      ),
    ).toBe(
      left.seasons.reduce(
        (total, season) =>
          total + season.trophies.length,
        0,
      ),
    );
    expect(
      comparison.awards.rows.reduce(
        (total, row) => total + row.right,
        0,
      ),
    ).toBe(
      right.seasons.reduce(
        (total, season) => total + season.awards.length,
        0,
      ),
    );
    expect(comparison.nationalTeam.stats.appearances).toEqual({
      delta:
        (left.summary?.nationalStats.appearances ?? 0) -
        (right.summary?.nationalStats.appearances ?? 0),
      left: left.summary?.nationalStats.appearances ?? 0,
      right: right.summary?.nationalStats.appearances ?? 0,
    });
    expect(
      comparison.nationalTeam.results.rows.reduce(
        (total, row) => total + row.left,
        0,
      ),
    ).toBe(
      left.seasons.reduce(
        (total, season) =>
          total +
          season.nationalTournamentRecords.length,
        0,
      ),
    );
    expect(comparison.ending).toEqual({
      left: left.retirementReason,
      right: right.retirementReason,
    });
    expect(comparison.economy.totalIncome).toEqual({
      delta:
        createCareerEconomyProjection(left).totalIncome -
        createCareerEconomyProjection(right).totalIncome,
      left: createCareerEconomyProjection(left).totalIncome,
      right: createCareerEconomyProjection(right).totalIncome,
    });
    expect(Object.isFrozen(comparison)).toBe(true);
    expect(compareBranches(
      branch("left", "稳健人生", left),
      branch("right", "冒险人生", right),
    )).toEqual(comparison);
  });

  it("returns every incompatibility reason instead of comparing unrelated careers", () => {
    const career = startClassicCareer({
      identity: IDENTITY,
      mode: "normal",
      seed: "phase-5:incompatible-left",
    });
    const incompatible = {
      ...startClassicCareer({
        identity: {
          ...IDENTITY,
          preferredNumber: 10,
        },
        mode: "express",
        seed: "phase-5:incompatible-right",
      }),
      contentVersion: "future-classic-content",
    } as unknown as ClassicCareerState;
    const comparison = compareBranches(
      branch("left", "左侧", career),
      branch("right", "右侧", incompatible),
    );

    expect(comparison).toEqual({
      reasons: [
        {
          code: "content_version",
          left: career.contentVersion,
          right: "future-classic-content",
        },
        {
          code: "identity",
          left: career.identity,
          right: incompatible.identity,
        },
        {
          code: "mode",
          left: "normal",
          right: "express",
        },
        {
          code: "seed",
          left: "phase-5:incompatible-left",
          right: "phase-5:incompatible-right",
        },
      ],
      status: "incompatible",
    });
  });

  it("keeps empty and long-career datasets safe for chart rendering", () => {
    const empty = startClassicCareer({
      identity: IDENTITY,
      mode: "normal",
      seed: "phase-5:comparison-empty",
    });
    const emptyComparison = compareBranches(
      branch("empty-a", "空白 A", empty),
      branch("empty-b", "空白 B", empty),
    );

    expect(emptyComparison.status).toBe("ready");

    if (emptyComparison.status !== "ready") {
      throw new Error("Expected empty branches to compare");
    }

    expect(emptyComparison).toMatchObject({
      abilityCurve: [],
      clubs: { left: [], right: [] },
      ending: { left: null, right: null },
      valueCurve: [],
    });
    expect(
      Object.values(emptyComparison.totals).every(
        (metric) =>
          metric.left === 0 &&
          metric.right === 0 &&
          metric.delta === 0,
      ),
    ).toBe(true);
    expect(
      emptyComparison.trophies.rows.every(
        (row) => row.left === 0 && row.right === 0,
      ),
    ).toBe(true);

    const [longLeft, longRight] = createDivergingCareers(
      "phase-5:comparison-long",
      "long",
    );
    const longComparison = compareBranches(
      branch("long-a", "漫长 A", longLeft),
      branch("long-b", "漫长 B", longRight),
    );

    expect(longComparison.status).toBe("ready");

    if (longComparison.status !== "ready") {
      throw new Error("Expected long branches to compare");
    }

    expect(longComparison.abilityCurve).toHaveLength(
      new Set([
        ...longLeft.seasons.map((season) => season.age),
        ...longRight.seasons.map((season) => season.age),
      ]).size,
    );
    expect(
      longComparison.abilityCurve.every(
        (point) =>
          point.left === null ||
          Number.isFinite(point.left),
      ),
    ).toBe(true);
  });
});

function branch(
  id: string,
  displayName: string,
  career: ClassicCareerState,
): ComparableBranch {
  return { career, displayName, id };
}

function createDivergingCareers(
  seed: string,
  mode: "long" | "normal",
): readonly [ClassicCareerState, ClassicCareerState] {
  const initial = startClassicCareer({
    identity: IDENTITY,
    mode,
    seed,
  });
  const decision = initial.currentDecision!;
  const first = decision.options[0]!;
  const second = decision.options[1]!;

  return [
    finish(
      applyClassicChoice(initial, {
        decisionId: decision.id,
        decisionType: decision.type,
        optionId: first.id,
      }),
    ),
    finish(
      applyClassicChoice(initial, {
        decisionId: decision.id,
        decisionType: decision.type,
        optionId: second.id,
      }),
    ),
  ];
}

function finish(initial: ClassicCareerState): ClassicCareerState {
  let career = initial;

  for (
    let choiceCount = 0;
    career.phase !== "summary" && choiceCount < 128;
    choiceCount += 1
  ) {
    const decision = career.currentDecision!;
    career = applyClassicChoice(career, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: defaultClassicChoicePolicy(career, decision),
    });
  }

  if (career.phase !== "summary") {
    throw new Error("Career did not retire");
  }

  return career;
}
