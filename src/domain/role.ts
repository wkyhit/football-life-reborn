import {
  classicRandomFloat,
  classicRandomInteger,
} from "./classicRng";

export const POSITION_ROLE_GROUPS = {
  attacker: ["LW", "ST", "RW"],
  creator: ["LM", "CAM", "RM"],
  support: ["LB", "CM", "RB"],
  defensive: ["CDM", "CB"],
  goalkeeper: ["GK"],
} as const;

export type RoleGroup = keyof typeof POSITION_ROLE_GROUPS;
export type ClassicPosition =
  | "LW"
  | "ST"
  | "RW"
  | "LM"
  | "CAM"
  | "RM"
  | "LB"
  | "CM"
  | "RB"
  | "CDM"
  | "CB"
  | "GK";

export type ClassicSquadRole =
  | "substitute"
  | "low_rotation"
  | "high_rotation"
  | "starter"
  | "third_keeper";

export type ClassicSeasonStats = {
  readonly appearances: number;
  readonly assists: number;
  readonly cleanSheets: number;
  readonly goals: number;
  readonly goalsConceded: number;
};

export const APPEARANCE_RANGES: Readonly<
  Record<ClassicSquadRole, readonly [number, number]>
> = {
  starter: [40, 50],
  high_rotation: [25, 39],
  low_rotation: [15, 24],
  substitute: [5, 14],
  third_keeper: [5, 14],
};

const GOALKEEPER_APPEARANCE_RANGES: Readonly<
  Record<ClassicSquadRole, readonly [number, number]>
> = {
  starter: [42, 50],
  high_rotation: [2, 12],
  low_rotation: [2, 12],
  substitute: [2, 12],
  third_keeper: [0, 4],
};

const CLUB_BASE_OVERALL = [52, 68, 75, 80, 84, 88] as const;
const OUTFIELD_ROLE_THRESHOLDS = [
  [0, "starter"],
  [-4, "high_rotation"],
  [-8, "low_rotation"],
] as const;
const GOALKEEPER_ROLE_THRESHOLDS = [
  [0, "starter"],
  [-6, "substitute"],
] as const;
const OUTFIELD_ROLE_ORDER: readonly ClassicSquadRole[] = [
  "substitute",
  "low_rotation",
  "high_rotation",
  "starter",
];
const GOALKEEPER_ROLE_ORDER: readonly ClassicSquadRole[] = [
  "third_keeper",
  "substitute",
  "starter",
];
const GOAL_RATES: Readonly<
  Record<RoleGroup, readonly number[]>
> = {
  attacker: [0.75, 0.58, 0.45, 0.34, 0.2, 0.1, 0.04],
  creator: [0.55, 0.4, 0.3, 0.2, 0.13, 0.07, 0.03],
  support: [0.1, 0.07, 0.05, 0.03, 0.015, 0, 0],
  defensive: [0.07, 0.05, 0.04, 0.03, 0.01, 0, 0],
  goalkeeper: [0, 0, 0, 0, 0, 0, 0],
};
const ASSIST_RATES: Readonly<
  Record<RoleGroup, readonly number[]>
> = {
  attacker: [0.3, 0.22, 0.15, 0.11, 0.08, 0.06, 0.04],
  creator: [0.45, 0.34, 0.26, 0.19, 0.11, 0.06, 0.04],
  support: [0.26, 0.19, 0.14, 0.09, 0.05, 0.02, 0.015],
  defensive: [0.07, 0.05, 0.04, 0.02, 0.01, 0, 0],
  goalkeeper: [0, 0, 0, 0, 0, 0, 0],
};
const CLUB_SCORING_MULTIPLIER = [0.55, 0.75, 0.95, 1, 1.1, 1.2];
const GOALKEEPER_CONCEDING_MULTIPLIER = [1.4, 1.3, 1.1, 0.9, 0.7, 0.5];

export function roleGroupForPosition(
  position: ClassicPosition,
): RoleGroup {
  for (const [group, positions] of Object.entries(
    POSITION_ROLE_GROUPS,
  ) as Array<[RoleGroup, readonly ClassicPosition[]]>) {
    if (positions.includes(position)) {
      return group;
    }
  }

  throw new RangeError(`Unsupported Classic position: ${position}`);
}

export function clubBaseOverall(
  internationalReputation: number,
): number {
  return CLUB_BASE_OVERALL[clampInteger(internationalReputation, 0, 5)]!;
}

export function resolveClassicSquadRole(input: {
  clubInternationalReputation: number;
  overall: number;
  roleGroup: RoleGroup;
}): ClassicSquadRole {
  return resolveRoleFromDifference(
    input.overall - clubBaseOverall(input.clubInternationalReputation),
    input.roleGroup === "goalkeeper",
  );
}

export function shiftClassicSquadRole(
  role: ClassicSquadRole,
  roleGroup: RoleGroup,
  shift: number,
): ClassicSquadRole {
  if (shift === 0) {
    return role;
  }

  const order =
    roleGroup === "goalkeeper"
      ? GOALKEEPER_ROLE_ORDER
      : OUTFIELD_ROLE_ORDER;
  const index = order.indexOf(role);

  if (index === -1) {
    return role;
  }

  return order[clampInteger(index + shift, 0, order.length - 1)] ?? role;
}

export function appearanceRangeForRole(
  role: ClassicSquadRole,
  goalkeeper: boolean,
): readonly [number, number] {
  return goalkeeper
    ? GOALKEEPER_APPEARANCE_RANGES[role]
    : APPEARANCE_RANGES[role];
}

export function simulateRoleSeason(input: {
  appearanceMultiplier?: number;
  clubContinentalReputation: number;
  clubDomesticReputation: number;
  clubInternationalReputation: number;
  overall: number;
  rngState: number;
  roleGroup: RoleGroup;
  roleOverride?: ClassicSquadRole;
  roleShift?: number;
  scoringMultiplier?: number;
  statsMultiplier?: number;
  suspended?: boolean;
}): {
  readonly rngState: number;
  readonly role: ClassicSquadRole;
  readonly stats: ClassicSeasonStats;
} {
  const goalkeeper = input.roleGroup === "goalkeeper";
  const resolvedRole =
    input.roleOverride ??
    shiftClassicSquadRole(
      resolveClassicSquadRole(input),
      input.roleGroup,
      input.roleShift ?? 0,
    );
  const range = appearanceRangeForRole(resolvedRole, goalkeeper);
  const appearanceDraw = classicRandomInteger(
    input.rngState,
    range[0],
    range[1],
  );
  const appearances = input.suspended
    ? 0
    : Math.round(
        appearanceDraw.value *
          clubAppearanceMultiplier(
            input.clubDomesticReputation,
            input.clubContinentalReputation,
          ) *
          (input.appearanceMultiplier ?? 1),
      );
  const statsMultiplier = input.statsMultiplier ?? 1;

  if (goalkeeper) {
    const random = classicRandomFloat(
      appearanceDraw.state,
      0.9,
      1.1,
    );
    const clubStrength =
      GOALKEEPER_CONCEDING_MULTIPLIER[
        clampInteger(input.clubDomesticReputation, 0, 5)
      ]!;
    const difference =
      input.overall -
      clubBaseOverall(input.clubInternationalReputation);
    const goalsConceded = Math.max(
      0,
      Math.round(
        appearances *
          clubStrength *
          goalkeeperDifferenceMultiplier(difference) *
          random.value,
      ),
    );
    const cleanSheetRate = clamp(
      0.42 -
        (appearances === 0 ? 0 : goalsConceded / appearances) * 0.12,
      0.05,
      0.5,
    );

    return {
      rngState: random.state,
      role: resolvedRole,
      stats: {
        appearances,
        assists: 0,
        cleanSheets:
          appearances === 0
            ? 0
            : Math.max(
                0,
                Math.round(
                  appearances * cleanSheetRate * statsMultiplier,
                ),
              ),
        goals: 0,
        goalsConceded: Math.max(
          0,
          Math.round(goalsConceded * statsMultiplier),
        ),
      },
    };
  }

  const random = classicRandomFloat(
    appearanceDraw.state,
    0.9,
    1.1,
  );
  const difference =
    input.overall -
    clubBaseOverall(input.clubInternationalReputation);
  const rateIndex = differenceBucket(difference);
  const multiplier =
    random.value *
    statsMultiplier *
    CLUB_SCORING_MULTIPLIER[
      clampInteger(input.clubDomesticReputation, 0, 5)
    ]! *
    overallScoringMultiplier(input.overall) *
    (input.scoringMultiplier ?? 1);

  return {
    rngState: random.state,
    role: resolvedRole,
    stats: {
      appearances,
      assists: Math.max(
        0,
        Math.round(
          appearances *
            (ASSIST_RATES[input.roleGroup][rateIndex] ?? 0) *
            multiplier,
        ),
      ),
      cleanSheets: 0,
      goals: Math.max(
        0,
        Math.round(
          appearances *
            (GOAL_RATES[input.roleGroup][rateIndex] ?? 0) *
            multiplier,
        ),
      ),
      goalsConceded: 0,
    },
  };
}

function resolveRoleFromDifference(
  difference: number,
  goalkeeper: boolean,
): ClassicSquadRole {
  const thresholds = goalkeeper
    ? GOALKEEPER_ROLE_THRESHOLDS
    : OUTFIELD_ROLE_THRESHOLDS;

  for (const [minimum, role] of thresholds) {
    if (difference >= minimum) {
      return role;
    }
  }

  return goalkeeper ? "third_keeper" : "substitute";
}

function clubAppearanceMultiplier(
  domesticReputation: number,
  continentalReputation: number,
): number {
  if (domesticReputation === 0) {
    return 0.7;
  }
  if (domesticReputation === 1) {
    return 0.8;
  }
  if (continentalReputation === 0) {
    return 0.9;
  }
  return 1;
}

function differenceBucket(difference: number): number {
  if (difference >= 10) {
    return 0;
  }
  if (difference >= 6) {
    return 1;
  }
  if (difference >= 3) {
    return 2;
  }
  if (difference >= -2) {
    return 3;
  }
  if (difference >= -5) {
    return 4;
  }
  if (difference >= -9) {
    return 5;
  }
  return 6;
}

function overallScoringMultiplier(overall: number): number {
  const bounded = clamp(overall, 40, 99);

  if (bounded <= 65) {
    return 0.6;
  }
  if (bounded <= 80) {
    return 0.6 + ((bounded - 65) / 15) * 0.25;
  }
  if (bounded <= 85) {
    return 0.85 + ((bounded - 80) / 5) * 0.15;
  }
  if (bounded <= 95) {
    return 1 + ((bounded - 85) / 10) * 0.1;
  }
  return 1.1;
}

function goalkeeperDifferenceMultiplier(difference: number): number {
  if (difference >= 10) {
    return 0.5;
  }
  if (difference >= 6) {
    return 0.75;
  }
  if (difference >= 3) {
    return 0.9;
  }
  if (difference >= -2) {
    return 1;
  }
  if (difference >= -5) {
    return 1.1;
  }
  if (difference >= -9) {
    return 1.2;
  }
  return 1.35;
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.round(clamp(value, minimum, maximum));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
