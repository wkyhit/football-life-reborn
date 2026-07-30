import { describe, expect, it } from "vitest";

import { CLASSIC_GOLDEN_FIXTURES } from "../../tests/golden/fixtures";
import {
  replayClassicCareer,
  type ClassicCareerState,
} from "./classicEngine";
import {
  createCareerLedger,
  type CareerLedgerEntry,
} from "./ledger";

const LEDGER_TYPES = [
  "award",
  "event",
  "growth",
  "injury",
  "role",
  "suspension",
  "trophy",
  "value",
] as const;

describe("career causal ledger", () => {
  it("explains every growth, role, event, injury, suspension, value, trophy, and award outcome", () => {
    const suspensionCareer = replayFixture(
      fixtureBySpecialPath("suspension-redemption"),
    );
    const injuryCareer = replayFixture(
      fixtureWithChoice("event:injury:"),
    );
    const suspensionLedger = createCareerLedger(
      suspensionCareer,
    );
    const injuryLedger = createCareerLedger(injuryCareer);
    const combined = [...suspensionLedger, ...injuryLedger];

    expect(
      [...new Set(combined.map((entry) => entry.type))].sort(),
    ).toEqual([...LEDGER_TYPES].sort());
    expect(
      countType(suspensionLedger, "event"),
    ).toBe(
      suspensionCareer.choiceLog.filter(
        (choice) => choice.decisionType === "career_event",
      ).length,
    );
    expect(
      countType(suspensionLedger, "role"),
    ).toBe(suspensionCareer.seasons.length);
    expect(
      countType(suspensionLedger, "suspension"),
    ).toBe(
      suspensionCareer.seasons.filter(
        (season) => season.suspended,
      ).length,
    );
    expect(
      countType(suspensionLedger, "trophy"),
    ).toBe(
      suspensionCareer.seasons.reduce(
        (total, season) =>
          total + season.trophies.length,
        0,
      ),
    );
    expect(
      countType(suspensionLedger, "award"),
    ).toBe(
      suspensionCareer.seasons.reduce(
        (total, season) => total + season.awards.length,
        0,
      ),
    );

    const injury = injuryLedger.find(
      (entry) => entry.type === "injury",
    );
    expect(injury).toMatchObject({
      injuryType: expect.any(String),
      overallAfter: expect.any(Number),
      overallBefore: expect.any(Number),
      overallDelta: expect.any(Number),
      source: "career_event",
      type: "injury",
    });
    expect(
      injuryLedger.filter(
        (entry) => entry.type === "injury",
      ),
    ).toHaveLength(
      injuryCareer.choiceLog.filter(
        (choice) =>
          choice.optionId.startsWith("event:injury:") ||
          choice.optionId.startsWith(
            "event:injury_at_peak:",
          ),
      ).length,
    );
  });

  it("is immutable, deterministic, resume-safe, and leaves the frozen Classic outcome byte-identical", () => {
    const fixture = fixtureBySpecialPath(
      "suspension-redemption",
    );
    const career = replayFixture(fixture);
    const before = JSON.stringify(career);
    const ledger = createCareerLedger(career);

    expect(Object.isFrozen(ledger)).toBe(true);
    expect(
      ledger.every((entry) => Object.isFrozen(entry)),
    ).toBe(true);
    expect(createCareerLedger(career)).toEqual(ledger);
    expect(JSON.stringify(career)).toBe(before);

    const partialChoiceCount = 10;
    const partial = replayClassicCareer({
      choices: fixture.choices.slice(0, partialChoiceCount),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    expect(createCareerLedger(partial)).toEqual(
      ledger.filter(
        (entry) =>
          entry.choiceLogIndex < partialChoiceCount,
      ),
    );
  });

  it("rejects a career whose visible outcome cannot be reproduced from its deterministic inputs", () => {
    const career = replayFixture(
      fixtureWithChoice("event:injury:"),
    );
    const tampered = {
      ...career,
      marketValue: career.marketValue + 1,
    } as ClassicCareerState;

    expect(() => createCareerLedger(tampered)).toThrow(
      "Career cannot be reproduced for ledger creation",
    );
  });
});

function countType(
  ledger: readonly CareerLedgerEntry[],
  type: CareerLedgerEntry["type"],
): number {
  return ledger.filter((entry) => entry.type === type).length;
}

function fixtureBySpecialPath(
  specialPath:
    | "authorized-legend"
    | "journeyman"
    | "late-bloomer"
    | "loan-heavy"
    | "suspension-redemption"
    | "veteran-no-offers",
) {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    (candidate) =>
      candidate.category === "special" &&
      candidate.specialPath === specialPath,
  );

  if (fixture === undefined) {
    throw new Error(`Missing fixture: ${specialPath}`);
  }

  return fixture;
}

function fixtureWithChoice(optionPrefix: string) {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    (candidate) =>
      candidate.choices.some((choice) =>
        choice.optionId.startsWith(optionPrefix),
      ),
  );

  if (fixture === undefined) {
    throw new Error(
      `Missing fixture choice: ${optionPrefix}`,
    );
  }

  return fixture;
}

function replayFixture(
  fixture: (typeof CLASSIC_GOLDEN_FIXTURES)[number],
): ClassicCareerState {
  return replayClassicCareer({
    choices: fixture.choices,
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });
}
