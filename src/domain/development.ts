import {
  classicRandomInteger,
  deriveClassicRngState,
  nextClassicFloat,
} from "./classicRng";
import type {
  ClassicSquadRole,
  RoleGroup,
} from "./role";

export type DevelopmentProfile =
  | "early"
  | "normal"
  | "late"
  | "legend";

export type DevelopmentCycle = {
  readonly annualDeltas: readonly [number, number];
  readonly nextPart: 0 | 1;
  readonly targetAge: number;
};

type DevelopmentRange = readonly [number, number];

const OUTFIELD_DEVELOPMENT: Readonly<
  Record<
    DevelopmentProfile,
    Readonly<Record<number, DevelopmentRange>>
  >
> = {
  early: {
    18: [7, 16],
    20: [6, 16],
    22: [4, 10],
    24: [0, 7],
    26: [-2, 1],
    28: [-2, -1],
    30: [-2, 0],
    32: [-4, 0],
    34: [-6, -1],
    36: [-8, -2],
    38: [-10, -3],
    40: [-11, -4],
    42: [-12, -5],
    44: [-13, -6],
  },
  normal: {
    18: [4, 14],
    20: [3, 14],
    22: [2, 10],
    24: [1, 8],
    26: [0, 3],
    28: [-1, 0],
    30: [-1, 0],
    32: [-3, 0],
    34: [-5, -1],
    36: [-7, -2],
    38: [-10, -3],
    40: [-11, -4],
    42: [-12, -5],
    44: [-13, -6],
  },
  late: {
    18: [2, 12],
    20: [1, 12],
    22: [1, 9],
    24: [2, 9],
    26: [1, 5],
    28: [0, 1],
    30: [0, 1],
    32: [-2, 0],
    34: [-5, -1],
    36: [-7, -2],
    38: [-10, -3],
    40: [-11, -4],
    42: [-12, -5],
    44: [-13, -6],
  },
  legend: {
    18: [5, 16],
    20: [4, 16],
    22: [2, 10],
    24: [1, 8],
    26: [0, 4],
    28: [0, 1],
    30: [0, 1],
    32: [-2, 0],
    34: [-5, -1],
    36: [-7, -2],
    38: [-10, -3],
    40: [-11, -4],
    42: [-12, -5],
    44: [-13, -6],
  },
};

const GOALKEEPER_DEVELOPMENT: Readonly<
  Record<number, DevelopmentRange>
> = {
  18: [2, 10],
  20: [2, 10],
  22: [2, 9],
  24: [2, 8],
  26: [1, 7],
  28: [1, 5],
  30: [0, 0],
  32: [-1, 0],
  34: [-2, 0],
  36: [-4, -1],
  38: [-6, -2],
  40: [-8, -3],
  42: [-10, -4],
  44: [-12, -5],
};

export function resolveDevelopmentProfile(
  seed: string,
  roleGroup: RoleGroup,
  override?: DevelopmentProfile,
): DevelopmentProfile {
  if (roleGroup === "goalkeeper") {
    return "normal";
  }
  if (override) {
    return override;
  }

  const draw = nextClassicFloat(
    deriveClassicRngState(seed, "development-profile"),
  );

  if (draw.value < 0.1) {
    return "early";
  }
  if (draw.value < 0.2) {
    return "late";
  }
  return "normal";
}

export function authorizedLegendProfile(identity: {
  isoAlpha2: string;
  lastName: string;
  preferredNumber: number;
}): DevelopmentProfile | undefined {
  return identity.lastName === "贝利" &&
    identity.isoAlpha2 === "BR" &&
    identity.preferredNumber === 10
    ? "legend"
    : undefined;
}

export function developmentRange(
  profile: DevelopmentProfile,
  roleGroup: RoleGroup,
  targetAge: number,
): DevelopmentRange | null {
  const range =
    roleGroup === "goalkeeper"
      ? GOALKEEPER_DEVELOPMENT[targetAge]
      : OUTFIELD_DEVELOPMENT[profile][targetAge];

  if (range) {
    return range;
  }

  if (targetAge > 44) {
    return roleGroup === "goalkeeper" ? [-12, -5] : [-14, -7];
  }

  return null;
}

export function planDevelopmentCycle(input: {
  age: number;
  developmentProfile: DevelopmentProfile;
  overall: number;
  rngState: number;
  role: ClassicSquadRole;
  roleGroup: RoleGroup;
}): {
  readonly cycle: DevelopmentCycle | null;
  readonly rngState: number;
} {
  const targetAge = input.age % 2 === 0 ? input.age + 2 : input.age + 1;
  const delta = drawDevelopmentDelta({
    ...input,
    targetAge,
  });

  if (delta === null) {
    return {
      cycle: null,
      rngState: input.rngState,
    };
  }

  const magnitude = Math.abs(delta.delta);
  const nextPart = (input.age % 2 === 0 ? 0 : 1) as 0 | 1;

  if (magnitude === 0) {
    return {
      cycle: {
        annualDeltas: [0, 0],
        nextPart,
        targetAge,
      },
      rngState: delta.rngState,
    };
  }

  const minimumFirstPart =
    magnitude >= 4 ? Math.ceil(magnitude * 0.25) : 0;
  const maximumFirstPart =
    magnitude >= 4 ? Math.floor(magnitude * 0.75) : magnitude;
  const split = classicRandomInteger(
    delta.rngState,
    minimumFirstPart,
    maximumFirstPart,
  );
  const sign = Math.sign(delta.delta);
  const firstPart = split.value * sign;

  return {
    cycle: {
      annualDeltas: [firstPart, delta.delta - firstPart],
      nextPart,
      targetAge,
    },
    rngState: split.state,
  };
}

export function applyAnnualDevelopment(input: {
  age: number;
  blockPositiveGrowth?: boolean;
  cycle: DevelopmentCycle | null;
  developmentProfile: DevelopmentProfile;
  overall: number;
  rngState: number;
  role: ClassicSquadRole;
  roleGroup: RoleGroup;
}): {
  readonly cycle: DevelopmentCycle | null;
  readonly overall: number;
  readonly rngState: number;
} {
  const targetAge = input.age % 2 === 0 ? input.age + 2 : input.age + 1;
  const planned =
    input.cycle?.targetAge === targetAge
      ? {
          cycle: input.cycle,
          rngState: input.rngState,
        }
      : planDevelopmentCycle(input);

  if (!planned.cycle) {
    return {
      cycle: null,
      overall: input.overall,
      rngState: planned.rngState,
    };
  }

  const part = planned.cycle.nextPart;
  const rawDelta = planned.cycle.annualDeltas[part] ?? 0;
  const appliedDelta =
    input.blockPositiveGrowth && rawDelta > 0 ? 0 : rawDelta;

  return {
    cycle:
      part === 0
        ? {
            ...planned.cycle,
            nextPart: 1,
          }
        : null,
    overall: clamp(input.overall + appliedDelta, 40, 99),
    rngState: planned.rngState,
  };
}

function drawDevelopmentDelta(input: {
  developmentProfile: DevelopmentProfile;
  rngState: number;
  role: ClassicSquadRole;
  roleGroup: RoleGroup;
  targetAge: number;
}): { readonly delta: number; readonly rngState: number } | null {
  const range = developmentRange(
    input.developmentProfile,
    input.roleGroup,
    input.targetAge,
  );

  if (!range) {
    return null;
  }

  const first = classicRandomInteger(
    input.rngState,
    range[0],
    range[1],
  );
  let delta = first.value;
  let rngState = first.state;

  if (
    Math.floor((input.targetAge - 16) / 2) >= 1 &&
    isBenchRole(input.role)
  ) {
    const second = classicRandomInteger(
      rngState,
      range[0],
      range[1],
    );
    rngState = second.state;
    delta = Math.min(delta, second.value);
  }

  if (input.role === "starter" && delta > 0) {
    delta += 1;
  }

  return {
    delta,
    rngState,
  };
}

function isBenchRole(role: ClassicSquadRole): boolean {
  return (
    role === "low_rotation" ||
    role === "substitute" ||
    role === "third_keeper"
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
