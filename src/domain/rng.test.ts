import { describe, expect, it } from "vitest";

import { createRngState, nextUint32 } from "./rng";

function drawSequence(seed: string, count: number): number[] {
  let state = createRngState(seed);
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const draw = nextUint32(state);
    state = draw.state;
    values.push(draw.value);
  }

  return values;
}

describe("seeded RNG", () => {
  it("replays the frozen sequence for one seed and diverges for another", () => {
    const expected = [
      2_649_758_305, 3_747_087_266, 306_173_627, 2_022_212_238,
      768_456_135,
    ];

    expect(createRngState("phase-1:lin-yiming")).toBe(2_570_140_681);
    expect(drawSequence("phase-1:lin-yiming", expected.length)).toEqual(
      expected,
    );
    expect(drawSequence("phase-1:lin-yiming", expected.length)).toEqual(
      expected,
    );
    expect(drawSequence("phase-1:other-player", expected.length)).not.toEqual(
      expected,
    );
  });
});
