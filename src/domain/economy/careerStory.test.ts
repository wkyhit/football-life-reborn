import { describe, expect, it } from "vitest";

import {
  replayClassicCareer,
  startClassicCareer,
} from "../classicEngine";
import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import { createCareerEconomyProjection } from "./careerEconomyProjection";
import { createCareerStory } from "./careerStory";

describe("deterministic career story", () => {
  it("keeps ending, simulated percentile, narrative, and income stable across replay", () => {
    const fixture = requireFixture("special-journeyman");
    const career = replayClassicCareer(fixture);
    const replayed = replayClassicCareer({
      choices: career.choiceLog,
      contentVersion: career.contentVersion,
      identity: career.identity,
      mode: career.mode,
      seed: career.seed,
    });
    const story = createCareerStory(career);
    const projection =
      createCareerEconomyProjection(career);

    expect(createCareerStory(career)).toEqual(story);
    expect(createCareerStory(replayed)).toEqual(story);
    expect(story).toMatchObject({
      ending: {
        reason: career.retirementReason,
      },
      highestHonor: expect.any(String),
      simulatedPercentile: {
        label: "模拟生涯分位",
        maxOverall: career.summary?.maxOverall,
        sampleCount: 10_000,
        value: expect.any(Number),
      },
      totalIncome: projection.totalIncome,
    });
    expect(story.narrative).toContain("漂泊轨迹");
    expect(story.narrative).toContain(
      `巅峰能力 ${career.summary?.maxOverall}`,
    );
    expect(story.narrative).toContain(
      `总收入 ¥${projection.totalIncome.toLocaleString("en-US")}`,
    );
    expect(Object.isFrozen(story)).toBe(true);
    expect(Object.isFrozen(story.ending)).toBe(true);
    expect(
      Object.isFrozen(story.simulatedPercentile),
    ).toBe(true);
  });

  it("produces explainable differences for distinct replays", () => {
    const journeyman = createCareerStory(
      replayClassicCareer(
        requireFixture("special-journeyman"),
      ),
    );
    const redemption = createCareerStory(
      replayClassicCareer(
        requireFixture("special-suspension-redemption"),
      ),
    );

    expect(redemption).not.toEqual(journeyman);
    expect(redemption.narrative).not.toBe(
      journeyman.narrative,
    );
    expect(redemption.simulatedPercentile.value).not.toBe(
      journeyman.simulatedPercentile.value,
    );
    expect(redemption.highestHonor).not.toBe(
      journeyman.highestHonor,
    );
  });

  it("rejects a career that has not reached its ending", () => {
    const active = startClassicCareer({
      identity: {
        lastName: "未完",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "issue-18:unfinished-story",
    });

    expect(() => createCareerStory(active)).toThrow(
      "A completed Classic career is required for its story",
    );
  });
});

function requireFixture(
  id: string,
): (typeof CLASSIC_GOLDEN_FIXTURES)[number] {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    (candidate) => candidate.id === id,
  );

  if (fixture === undefined) {
    throw new Error(`Missing fixture: ${id}`);
  }

  return fixture;
}
