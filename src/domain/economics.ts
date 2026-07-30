import { classicRandomFloat } from "./classicRng";

type MarketValuePoint = readonly [
  overall: number,
  value: number,
];

const MARKET_VALUE_CURVE: readonly MarketValuePoint[] = [
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

export function simulateMarketValue(input: {
  readonly age: number;
  readonly overall: number;
  readonly rngState: number;
}): {
  readonly rngState: number;
  readonly value: number;
} {
  const random = classicRandomFloat(
    input.rngState,
    0.95,
    1.05,
  );

  return {
    rngState: random.state,
    value: roundMarketValue(
      baseMarketValue(input.overall) *
        marketValueAgeMultiplier(input.age) *
        random.value,
    ),
  };
}

export function baseMarketValue(overall: number): number {
  const bounded = clamp(overall, 50, 99);
  let lower = MARKET_VALUE_CURVE[0]!;
  let upper =
    MARKET_VALUE_CURVE[MARKET_VALUE_CURVE.length - 1]!;

  for (const point of MARKET_VALUE_CURVE) {
    if (point[0] <= bounded) {
      lower = point;
    }
  }

  for (
    let index = MARKET_VALUE_CURVE.length - 1;
    index >= 0;
    index -= 1
  ) {
    const point = MARKET_VALUE_CURVE[index]!;

    if (point[0] >= bounded) {
      upper = point;
    }
  }

  if (upper[0] === lower[0]) {
    return lower[1];
  }

  const progress =
    (bounded - lower[0]) / (upper[0] - lower[0]);
  return lower[1] + (upper[1] - lower[1]) * progress;
}

export function marketValueAgeMultiplier(age: number): number {
  if (age <= 18) {
    return 1.5;
  }
  if (age <= 22) {
    return 1.2;
  }
  if (age <= 26) {
    return 1;
  }
  if (age <= 30) {
    return 0.9;
  }
  if (age <= 32) {
    return 0.8;
  }
  if (age <= 34) {
    return 0.6;
  }

  return 0.2;
}

function roundMarketValue(value: number): number {
  if (value >= 10_000_000) {
    return Math.round(value / 1_000_000) * 1_000_000;
  }
  if (value >= 1_000_000) {
    return Math.round(value / 100_000) * 100_000;
  }

  return Math.round(value / 10_000) * 10_000;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}
