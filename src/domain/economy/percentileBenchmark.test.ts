import { describe, expect, it } from "vitest";

import {
  MAX_OVERALL_PERCENTILE_TABLE,
  PERCENTILE_BENCHMARK_METADATA,
} from "./percentileTable.generated";
import {
  calculateSimulatedCareerPercentile,
  generatePercentileBenchmark,
} from "./percentileBenchmark";

describe("simulated career percentile benchmark", () => {
  it("rebuilds the frozen 10,000-career artifact and hash identically", () => {
    const first = generatePercentileBenchmark();
    const second = generatePercentileBenchmark();

    expect(second).toEqual(first);
    expect(first).toEqual({
      maxOverallPercentiles:
        MAX_OVERALL_PERCENTILE_TABLE,
      metadata: PERCENTILE_BENCHMARK_METADATA,
    });
    expect(first.metadata).toMatchObject({
      artifactHash: expect.stringMatching(
        /^fnv1a64:[0-9a-f]{16}$/,
      ),
      countryCount: 61,
      modeCount: 3,
      positionCount: 12,
      sampleCount: 10_000,
      strategy: "fnv1a64-uniform-valid-option-v1",
      version: "2026-07-31-max-overall-v1",
    });
    expect(first.maxOverallPercentiles).toHaveLength(100);
    expect(
      first.maxOverallPercentiles.every(
        (threshold, index, table) =>
          threshold >= 50 &&
          threshold <= 99 &&
          (index === 0 ||
            threshold >= table[index - 1]!),
      ),
    ).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(
      Object.isFrozen(first.maxOverallPercentiles),
    ).toBe(true);
    expect(Object.isFrozen(first.metadata)).toBe(true);
  }, 60_000);

  it("maps below-table, exact-threshold, duplicate, and maximum boundaries", () => {
    const first = MAX_OVERALL_PERCENTILE_TABLE[0]!;
    const duplicateThreshold =
      MAX_OVERALL_PERCENTILE_TABLE.find(
        (threshold, index, table) =>
          index > 0 && threshold === table[index - 1],
      );

    expect(
      calculateSimulatedCareerPercentile(first - 1),
    ).toBe(0);
    expect(
      calculateSimulatedCareerPercentile(first),
    ).toBeGreaterThan(0);

    if (duplicateThreshold !== undefined) {
      const expected =
        MAX_OVERALL_PERCENTILE_TABLE.lastIndexOf(
          duplicateThreshold,
        ) + 1;
      expect(
        calculateSimulatedCareerPercentile(
          duplicateThreshold,
        ),
      ).toBe(expected);
    }

    expect(calculateSimulatedCareerPercentile(99)).toBe(
      100,
    );
    expect(() =>
      calculateSimulatedCareerPercentile(39),
    ).toThrow(RangeError);
    expect(() =>
      calculateSimulatedCareerPercentile(100),
    ).toThrow(RangeError);
  });
});
