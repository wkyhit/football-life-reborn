import { describe, expect, it } from "vitest";

import {
  projectClassicGoldenState,
  replayClassicCareer,
} from "../../src/domain/classicEngine";
import { CLASSIC_GOLDEN_FIXTURES } from "./fixtures";

const MODES = ["long", "normal", "express"] as const;
const ROLE_GROUPS = [
  "attacker",
  "creator",
  "support",
  "defensive",
  "goalkeeper",
] as const;
const NATIONAL_BANDS = ["high", "low"] as const;
const SPECIAL_PATHS = [
  "authorized-legend",
  "loan-heavy",
  "suspension-redemption",
  "late-bloomer",
  "veteran-no-offers",
  "journeyman",
] as const;

describe("Classic golden career parity", () => {
  it("contains the reviewed 30-case matrix plus six special paths", () => {
    expect(CLASSIC_GOLDEN_FIXTURES).toHaveLength(36);

    const matrixKeys = CLASSIC_GOLDEN_FIXTURES.filter(
      (fixture) => fixture.category === "matrix",
    ).map(
      (fixture) =>
        `${fixture.mode}:${fixture.roleGroup}:${fixture.nationalBand}`,
    );
    const expectedMatrix = MODES.flatMap((mode) =>
      ROLE_GROUPS.flatMap((roleGroup) =>
        NATIONAL_BANDS.map(
          (nationalBand) =>
            `${mode}:${roleGroup}:${nationalBand}`,
        ),
      ),
    );

    expect(matrixKeys.sort()).toEqual(expectedMatrix.sort());
    expect(
      CLASSIC_GOLDEN_FIXTURES.filter(
        (fixture) => fixture.category === "special",
      )
        .map((fixture) => fixture.specialPath)
        .sort(),
    ).toEqual([...SPECIAL_PATHS].sort());
  });

  it.each(CLASSIC_GOLDEN_FIXTURES)(
    "$id replays the reviewed final state",
    (fixture) => {
      const replay = replayClassicCareer({
        choices: fixture.choices,
        contentVersion: fixture.contentVersion,
        identity: fixture.identity,
        mode: fixture.mode,
        seed: fixture.seed,
      });

      expect(replay.phase).toBe("summary");
      expect(replay.choiceCursor).toBe(fixture.choices.length);
      expect(projectClassicGoldenState(replay)).toEqual(
        fixture.expected,
      );
    },
  );

  it("serializes all 36 replays identically across two complete runs", () => {
    const run = () =>
      JSON.stringify(
        CLASSIC_GOLDEN_FIXTURES.map((fixture) =>
          projectClassicGoldenState(
            replayClassicCareer({
              choices: fixture.choices,
              contentVersion: fixture.contentVersion,
              identity: fixture.identity,
              mode: fixture.mode,
              seed: fixture.seed,
            }),
          ),
        ),
      );

    expect(run()).toBe(run());
  });

  it("rejects content-version drift and a misaligned choice log", () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES[0];
    const firstChoice = fixture.choices[0]!;

    expect(() =>
      replayClassicCareer({
        choices: fixture.choices,
        contentVersion: "future-classic-content",
        identity: fixture.identity,
        mode: fixture.mode,
        seed: fixture.seed,
      }),
    ).toThrow(/Unsupported Classic content version/);
    expect(() =>
      replayClassicCareer({
        choices: [
          {
            ...firstChoice,
            decisionId: "misaligned-decision",
          },
        ],
        contentVersion: fixture.contentVersion,
        identity: fixture.identity,
        mode: fixture.mode,
        seed: fixture.seed,
      }),
    ).toThrow(/Choice expected decision/);
  });

  it("proves every named special path instead of relying on labels", () => {
    const special = Object.fromEntries(
      CLASSIC_GOLDEN_FIXTURES.filter(
        (fixture) => fixture.category === "special",
      ).map((fixture) => [fixture.specialPath, fixture]),
    );

    expect(
      special["authorized-legend"]?.expected
        .developmentProfile,
    ).toBe("legend");
    expect(
      special["loan-heavy"]?.choices.filter((choice) =>
        choice.optionId.startsWith("loan:"),
      ).length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      special["suspension-redemption"]?.expected
        .suspendedSeasonCount,
    ).toBeGreaterThan(0);
    expect(
      special["suspension-redemption"]?.expected.hiddenTitles,
    ).toContain("redemption");
    expect(
      special["late-bloomer"]?.expected.hiddenTitles,
    ).toContain("late_bloomer");
    expect(
      special["veteran-no-offers"]?.expected.ending,
    ).toBe("no_offers");
    expect(
      special["veteran-no-offers"]?.expected.finalAge,
    ).toBeGreaterThanOrEqual(34);
    expect(
      special.journeyman?.expected.clubIds.length,
    ).toBeGreaterThanOrEqual(10);
    expect(
      special.journeyman?.expected.hiddenTitles,
    ).toContain("journeyman");
  });
});
