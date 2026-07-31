import {
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest";

import { startClassicCareer } from "../classicEngine";
import { deterministicHash } from "../deterministicHash";
import {
  ECONOMY_MARKET_VALUE_NODES,
  createAnnualSalaryQuote,
  formatYuan,
  interpolateEconomyMarketValue,
  roundAnnualSalary,
} from "./economyPolicy";

describe("economy-v1 salary policy", () => {
  it("quotes the Premier League node at overall 50 exactly", () => {
    expect(
      createAnnualSalaryQuote({
        competitionId: "premier-league",
        overall: 50,
        peakOverall: 50,
      }),
    ).toEqual({
      annualSalary: 20_000,
      capped: false,
      competitionId: "premier-league",
      economyPolicyVersion: "2026-07-31-economy-v1",
      effectiveWealth: 1.35,
      interpolatedMarketValue: 100_000,
      rawSalary: 20_250,
    });
  });

  it("freezes every economy-v1 market-value node", () => {
    const exactNodes = [
      [50, 100_000],
      [55, 250_000],
      [60, 500_000],
      [65, 1_200_000],
      [70, 3_000_000],
      [75, 5_000_000],
      [80, 15_000_000],
      [85, 50_000_000],
      [90, 100_000_000],
      [95, 150_000_000],
      [99, 250_000_000],
    ] as const;

    expect(ECONOMY_MARKET_VALUE_NODES).toEqual(exactNodes);
    expect(
      exactNodes.map(([overall, value]) => [
        overall,
        interpolateEconomyMarketValue(overall),
        value,
      ]),
    ).toEqual(
      exactNodes.map(([overall, value]) => [
        overall,
        value,
        value,
      ]),
    );
  });

  it("uses linear interpolation at every node boundary ±1", () => {
    expect(
      [
        49, 51, 54, 56, 59, 61, 64, 66, 69, 71, 74, 76, 79,
        81, 84, 86, 89, 91, 94, 96, 98, 100,
      ].map((overall) => [
        overall,
        interpolateEconomyMarketValue(overall),
      ]),
    ).toEqual([
      [49, 100_000],
      [51, 130_000],
      [54, 220_000],
      [56, 300_000],
      [59, 450_000],
      [61, 640_000],
      [64, 1_060_000],
      [66, 1_560_000],
      [69, 2_640_000],
      [71, 3_400_000],
      [74, 4_600_000],
      [76, 7_000_000],
      [79, 13_000_000],
      [81, 22_000_000],
      [84, 43_000_000],
      [86, 60_000_000],
      [89, 90_000_000],
      [91, 110_000_000],
      [94, 140_000_000],
      [96, 175_000_000],
      [98, 225_000_000],
      [100, 250_000_000],
    ]);
  });

  it("applies every frozen league wealth coefficient", () => {
    const vectors = [
      ["premier-league", 1.35, 3_037_500, 3_000_000],
      ["championship", 0.35, 787_500, 790_000],
      ["laliga", 1.05, 2_362_500, 2_400_000],
      ["laliga-2", 0.25, 562_500, 560_000],
      ["serie-a", 1, 2_250_000, 2_300_000],
      ["bundesliga", 1, 2_250_000, 2_300_000],
      ["ligue-1", 0.95, 2_137_500, 2_100_000],
      ["csl", 0.9, 2_025_000, 2_000_000],
      ["china-league-one", 0.3, 675_000, 680_000],
      ["j1-league", 0.55, 1_237_500, 1_200_000],
      ["saudi-pro-league", 2, 4_500_000, 4_500_000],
      ["brasileirao", 0.5, 1_125_000, 1_100_000],
    ] as const;

    expect(
      vectors.map(([competitionId]) => {
          const quote = createAnnualSalaryQuote({
            competitionId,
            overall: 80,
            peakOverall: 79,
          });

          return [
            quote.competitionId,
            quote.effectiveWealth,
            quote.rawSalary,
            quote.annualSalary,
            quote.capped,
          ];
        },
      ),
    ).toEqual(
      vectors.map(
        ([
          competitionId,
          effectiveWealth,
          rawSalary,
          annualSalary,
        ]) => [
          competitionId,
          effectiveWealth,
          rawSalary,
          annualSalary,
          false,
        ],
      ),
    );
  });

  it("switches Saudi fame wealth at the exact peak-overall thresholds", () => {
    expect(
      [79, 80, 89, 90].map((peakOverall) => {
        const quote = createAnnualSalaryQuote({
          competitionId: "saudi-pro-league",
          overall: 80,
          peakOverall,
        });

        return [
          peakOverall,
          quote.effectiveWealth,
          quote.annualSalary,
        ];
      }),
    ).toEqual([
      [79, 2, 4_500_000],
      [80, 2.7, 6_100_000],
      [89, 2.7, 6_100_000],
      [90, 4, 9_000_000],
    ]);
  });

  it("applies the minimum and switches rounding precision at ¥1,000,000", () => {
    expect(
      [
        0, 4_999, 9_999, 994_999, 995_000, 999_999, 1_000_000,
        1_049_999, 1_050_000,
      ].map((rawSalary) => [
        rawSalary,
        roundAnnualSalary(rawSalary),
      ]),
    ).toEqual([
      [0, 10_000],
      [4_999, 10_000],
      [9_999, 10_000],
      [994_999, 990_000],
      [995_000, 1_000_000],
      [999_999, 1_000_000],
      [1_000_000, 1_000_000],
      [1_049_999, 1_000_000],
      [1_050_000, 1_100_000],
    ]);
  });

  it("formats only non-negative safe-integer yuan amounts", () => {
    expect(
      [0, 10_000, 123_456_789].map(formatYuan),
    ).toEqual(["¥0", "¥10,000", "¥123,456,789"]);
    expect(() => formatYuan(-1)).toThrow(RangeError);
    expect(() =>
      formatYuan(Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(RangeError);
    expect(() => formatYuan(1.5)).toThrow(RangeError);
  });

  it("rounds first and then applies the CSL and China League One caps", () => {
    expect(
      (["csl", "china-league-one"] as const).map((competitionId) => {
        const quote = createAnnualSalaryQuote({
          competitionId,
          overall: 99,
          peakOverall: 99,
        });

        return {
          annualSalary: quote.annualSalary,
          capped: quote.capped,
          competitionId,
          rawSalary: quote.rawSalary,
        };
      }),
    ).toEqual([
      {
        annualSalary: 3_000_000,
        capped: true,
        competitionId: "csl",
        rawSalary: 33_750_000,
      },
      {
        annualSalary: 800_000,
        capped: true,
        competitionId: "china-league-one",
        rawSalary: 11_250_000,
      },
    ]);
  });

  it("has no RNG seam and leaves the football cursor and core hash untouched", () => {
    type SalaryInput = Parameters<
      typeof createAnnualSalaryQuote
    >[0];
    expectTypeOf<SalaryInput>().not.toHaveProperty("rngState");

    const career = startClassicCareer({
      identity: {
        lastName: "林",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "economy-policy-no-rng",
    });
    const before = {
      hash: deterministicHash(career),
      rngState: career.rngState,
    };

    const quote = createAnnualSalaryQuote({
      competitionId: "csl",
      overall: career.overall,
      peakOverall: career.overall,
    });

    expect(JSON.parse(JSON.stringify(quote))).toEqual(quote);
    expect({
      hash: deterministicHash(career),
      rngState: career.rngState,
    }).toEqual(before);
  });

  it("repeats 10,000 fixed policy inputs with one frozen digest", () => {
    const competitionIds = [
      "premier-league",
      "championship",
      "laliga",
      "laliga-2",
      "serie-a",
      "bundesliga",
      "ligue-1",
      "csl",
      "china-league-one",
      "j1-league",
      "saudi-pro-league",
      "brasileirao",
    ] as const;
    const first = Array.from({ length: 10_000 }, (_, index) =>
      createAnnualSalaryQuote({
        competitionId:
          competitionIds[index % competitionIds.length]!,
        overall: 45 + ((index * 37) % 60),
        peakOverall: 45 + ((index * 53) % 60),
      }),
    );
    const second = Array.from({ length: 10_000 }, (_, index) =>
      createAnnualSalaryQuote({
        competitionId:
          competitionIds[index % competitionIds.length]!,
        overall: 45 + ((index * 37) % 60),
        peakOverall: 45 + ((index * 53) % 60),
      }),
    );

    expect(second).toEqual(first);
    expect({
      capped: first.filter((quote) => quote.capped).length,
      digest: deterministicHash(first),
      maximum: Math.max(
        ...first.map((quote) => quote.annualSalary),
      ),
      minimum: Math.min(
        ...first.map((quote) => quote.annualSalary),
      ),
      total: first.reduce(
        (total, quote) => total + quote.annualSalary,
        0,
      ),
    }).toEqual({
      capped: 667,
      digest: "fnv1a64:4e0f8d3cd8d607a8",
      maximum: 75_000_000,
      minimum: 10_000,
      total: 64_668_300_000,
    });
  });
});
