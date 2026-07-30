export type ClassicRngDraw = {
  readonly state: number;
  readonly value: number;
};

const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export function createClassicRngState(seed: string): number {
  let state = FNV_OFFSET_BASIS;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, FNV_PRIME);
  }

  return (state >>> 0) || 1;
}

export function deriveClassicRngState(
  seed: string,
  ...parts: readonly (number | string)[]
): number {
  return createClassicRngState(`${seed}:${parts.join(":")}`);
}

export function nextClassicFloat(state: number): ClassicRngDraw {
  let nextState = state | 0;
  nextState ^= nextState << 13;
  nextState ^= nextState >>> 17;
  nextState ^= nextState << 5;
  const normalizedState = (nextState >>> 0) || 1;

  return {
    state: normalizedState,
    value: normalizedState / 0x1_0000_0000,
  };
}

export function classicRandomFloat(
  state: number,
  minimum = 0,
  maximum = 1,
): ClassicRngDraw {
  const draw = nextClassicFloat(state);

  return {
    state: draw.state,
    value: minimum + draw.value * (maximum - minimum),
  };
}

export function classicRandomInteger(
  state: number,
  minimum: number,
  maximum: number,
): ClassicRngDraw {
  const draw = nextClassicFloat(state);

  return {
    state: draw.state,
    value:
      minimum +
      Math.floor(draw.value * (maximum - minimum + 1)),
  };
}

export function classicChance(
  state: number,
  probability: number,
): { state: number; success: boolean } {
  const draw = nextClassicFloat(state);

  return {
    state: draw.state,
    success: draw.value < clamp(probability, 0, 1),
  };
}

export function classicPick<T>(
  state: number,
  values: readonly T[],
): { item: T; state: number } {
  if (values.length === 0) {
    throw new RangeError("Cannot pick from an empty list");
  }

  const draw = classicRandomInteger(state, 0, values.length - 1);
  const item = values[draw.value];

  if (item === undefined) {
    throw new RangeError("Classic RNG produced an invalid list index");
  }

  return {
    item,
    state: draw.state,
  };
}

export function classicPickWeighted<T>(
  state: number,
  values: readonly { item: T; weight: number }[],
): { item: T; state: number } {
  const totalWeight = values.reduce(
    (total, value) => total + Math.max(0, value.weight),
    0,
  );

  if (values.length === 0 || totalWeight <= 0) {
    throw new RangeError("Cannot pick from an empty weighted list");
  }

  const draw = classicRandomFloat(state, 0, totalWeight);
  let cursor = 0;

  for (const value of values) {
    cursor += Math.max(0, value.weight);

    if (draw.value <= cursor) {
      return {
        item: value.item,
        state: draw.state,
      };
    }
  }

  return {
    item: values[values.length - 1]!.item,
    state: draw.state,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
