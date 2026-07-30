import { describe, expect, it } from "vitest";

import { runClassicCareerInvariantBatch } from "../../src/domain/classicProperties";

describe("Classic generated-career invariants", () => {
  it(
    "replays 10,000 generated careers without a global invariant failure",
    () => {
      const report = runClassicCareerInvariantBatch({
        count: 10_000,
        seedNamespace: "phase-2:property",
      });

      expect(report.executed).toBe(10_000);
      expect(report.replayed).toBe(10_000);
      expect(report.failures, formatFailures(report.failures)).toEqual(
        [],
      );
      expect(report.digest).toBe("d652c21d");
    },
    60_000,
  );
});

function formatFailures(
  failures: readonly {
    readonly errors: readonly string[];
    readonly index: number;
    readonly seed: string;
  }[],
): string {
  return failures
    .map(
      (failure) =>
        `index=${failure.index} seed=${failure.seed}: ${failure.errors.join("; ")}`,
    )
    .join("\n");
}
