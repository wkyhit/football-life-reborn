import { getCslClub } from "./catalog/csl";
import { nextUint32 } from "./rng";

export type SquadRole = "reserve" | "rotation" | "starter" | "star";

export type SeasonRecord = {
  abilityAfter: number;
  abilityBefore: number;
  age: number;
  appearances: number;
  assists: number;
  clubId: string;
  goals: number;
  role: SquadRole;
  trophies: readonly string[];
  valueEuroAfter: number;
  valueEuroBefore: number;
};

export type StandardPeriodInput = {
  ability: number;
  age: number;
  clubId: string;
  rngState: number;
  role: SquadRole;
  valueEuro: number;
};

export type StandardPeriodResult = StandardPeriodInput & {
  seasons: readonly SeasonRecord[];
  totals: {
    appearances: number;
    assists: number;
    goals: number;
  };
  trophies: readonly string[];
};

type SeasonContext = StandardPeriodInput;

type SeasonSimulation = {
  next: SeasonContext;
  record: SeasonRecord;
};

export function simulateStandardPeriod(
  input: StandardPeriodInput,
): StandardPeriodResult {
  const club = getCslClub(input.clubId);

  if (!club) {
    throw new RangeError(`Unknown CSL club: ${input.clubId}`);
  }

  let ability = input.ability;
  let age = input.age;
  let rngState = input.rngState;
  let role = input.role;
  let valueEuro = input.valueEuro;
  const seasons: SeasonRecord[] = [];

  let seasonsRemaining = 2;

  while (seasonsRemaining > 0) {
    const simulation = simulateSeason(
      {
        ability,
        age,
        clubId: input.clubId,
        rngState,
        role,
        valueEuro,
      },
      club.strength,
    );

    seasons.push(simulation.record);
    ability = simulation.next.ability;
    age = simulation.next.age;
    rngState = simulation.next.rngState;
    role = simulation.next.role;
    valueEuro = simulation.next.valueEuro;
    seasonsRemaining -= 1;
  }

  return {
    ability,
    age,
    clubId: input.clubId,
    rngState,
    role,
    seasons,
    totals: {
      appearances: sum(seasons, "appearances"),
      assists: sum(seasons, "assists"),
      goals: sum(seasons, "goals"),
    },
    trophies: seasons.flatMap((season) => season.trophies),
    valueEuro,
  };
}

function simulateSeason(
  context: SeasonContext,
  clubStrength: 1 | 2 | 3 | 4 | 5,
): SeasonSimulation {
  const appearanceDraw = drawInteger(context.rngState, -3, 4);
  const goalDraw = drawInteger(appearanceDraw.state, -2, 2);
  const assistDraw = drawInteger(goalDraw.state, -1, 2);
  const [minimumGrowth, maximumGrowth] = growthRange(context.age);
  const growthDraw = drawInteger(
    assistDraw.state,
    minimumGrowth,
    maximumGrowth,
  );
  const trophyDraw = drawInteger(growthDraw.state, 0, 99);
  const appearances = clamp(
    APPEARANCE_BASE[context.role] + appearanceDraw.value,
    0,
    38,
  );
  const goals = Math.max(
    0,
    Math.floor(appearances * (0.12 + context.ability / 170)) +
      goalDraw.value,
  );
  const assists = Math.max(
    0,
    Math.floor(appearances * (0.08 + context.ability / 500)) +
      assistDraw.value,
  );
  const abilityAfter = clamp(
    context.ability + growthDraw.value,
    40,
    99,
  );
  const trophies =
    trophyDraw.value <
    clubStrength * 7 + ROLE_SCORE[context.role] * 4
      ? ["中超冠军"]
      : [];
  const performanceGain =
    appearances * 15_000 +
    goals * 70_000 +
    assists * 40_000 +
    Math.max(growthDraw.value, 0) * 250_000 +
    trophies.length * 300_000;
  const depreciation =
    Math.max(-growthDraw.value, 0) * 400_000 +
    Math.max(context.age - 31, 0) * 50_000;
  const valueEuroAfter = Math.max(
    100_000,
    Math.round(
      (context.valueEuro + performanceGain - depreciation) / 10_000,
    ) * 10_000,
  );

  return {
    next: {
      ability: abilityAfter,
      age: context.age + 1,
      clubId: context.clubId,
      rngState: trophyDraw.state,
      role: roleForAbility(abilityAfter),
      valueEuro: valueEuroAfter,
    },
    record: {
      abilityAfter,
      abilityBefore: context.ability,
      age: context.age,
      appearances,
      assists,
      clubId: context.clubId,
      goals,
      role: context.role,
      trophies,
      valueEuroAfter,
      valueEuroBefore: context.valueEuro,
    },
  };
}

const APPEARANCE_BASE: Readonly<Record<SquadRole, number>> = {
  reserve: 12,
  rotation: 22,
  star: 31,
  starter: 29,
};

const ROLE_SCORE: Readonly<Record<SquadRole, number>> = {
  reserve: 0,
  rotation: 1,
  star: 3,
  starter: 2,
};

function drawInteger(
  state: number,
  minimum: number,
  maximum: number,
): { state: number; value: number } {
  const draw = nextUint32(state);
  const span = maximum - minimum + 1;

  return {
    state: draw.state,
    value: minimum + Math.floor((draw.value / 0x1_0000_0000) * span),
  };
}

function growthRange(age: number): readonly [number, number] {
  if (age <= 19) {
    return [2, 5];
  }

  if (age <= 23) {
    return [1, 3];
  }

  if (age <= 28) {
    return [0, 2];
  }

  if (age <= 31) {
    return [-1, 1];
  }

  if (age <= 34) {
    return [-2, 0];
  }

  return [-3, -1];
}

function roleForAbility(ability: number): SquadRole {
  if (ability < 58) {
    return "reserve";
  }

  if (ability < 68) {
    return "rotation";
  }

  if (ability < 82) {
    return "starter";
  }

  return "star";
}

function sum(
  seasons: readonly SeasonRecord[],
  key: "appearances" | "assists" | "goals",
): number {
  return seasons.reduce((total, season) => total + season[key], 0);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
