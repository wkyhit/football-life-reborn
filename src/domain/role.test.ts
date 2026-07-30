import { describe, expect, it } from "vitest";

import { createClassicRngState } from "./classicRng";
import {
  APPEARANCE_RANGES,
  POSITION_ROLE_GROUPS,
  appearanceRangeForRole,
  roleGroupForPosition,
  resolveClassicSquadRole,
  simulateRoleSeason,
} from "./role";

describe("Classic positions, roles, and role-sensitive statistics", () => {
  it("maps all 12 positions into the five frozen role groups", () => {
    expect(POSITION_ROLE_GROUPS).toEqual({
      attacker: ["LW", "ST", "RW"],
      creator: ["LM", "CAM", "RM"],
      support: ["LB", "CM", "RB"],
      defensive: ["CDM", "CB"],
      goalkeeper: ["GK"],
    });
    expect(
      Object.values(POSITION_ROLE_GROUPS).flat(),
    ).toHaveLength(12);
    expect(roleGroupForPosition("CAM")).toBe("creator");
    expect(roleGroupForPosition("GK")).toBe("goalkeeper");
  });

  it("resolves outfield and goalkeeper squad roles from club strength", () => {
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 84,
        roleGroup: "attacker",
      }),
    ).toBe("starter");
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 80,
        roleGroup: "creator",
      }),
    ).toBe("high_rotation");
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 76,
        roleGroup: "defensive",
      }),
    ).toBe("low_rotation");
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 75,
        roleGroup: "support",
      }),
    ).toBe("substitute");
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 78,
        roleGroup: "goalkeeper",
      }),
    ).toBe("substitute");
    expect(
      resolveClassicSquadRole({
        clubInternationalReputation: 4,
        overall: 77,
        roleGroup: "goalkeeper",
      }),
    ).toBe("third_keeper");
  });

  it("uses distinct appearance ranges and statistics for outfielders and goalkeepers", () => {
    expect(APPEARANCE_RANGES.starter).toEqual([40, 50]);
    expect(appearanceRangeForRole("starter", true)).toEqual([42, 50]);
    expect(appearanceRangeForRole("third_keeper", true)).toEqual([0, 4]);

    const attacker = simulateRoleSeason({
      clubContinentalReputation: 4,
      clubDomesticReputation: 4,
      clubInternationalReputation: 4,
      overall: 86,
      rngState: createClassicRngState("role-season"),
      roleGroup: "attacker",
    });
    const defensive = simulateRoleSeason({
      clubContinentalReputation: 4,
      clubDomesticReputation: 4,
      clubInternationalReputation: 4,
      overall: 86,
      rngState: createClassicRngState("role-season"),
      roleGroup: "defensive",
    });
    const goalkeeper = simulateRoleSeason({
      clubContinentalReputation: 4,
      clubDomesticReputation: 4,
      clubInternationalReputation: 4,
      overall: 86,
      rngState: createClassicRngState("role-season"),
      roleGroup: "goalkeeper",
    });

    expect({ attacker, defensive, goalkeeper }).toEqual({
      attacker: {
        rngState: 2_533_830_531,
        role: "starter",
        stats: {
          appearances: 47,
          assists: 6,
          cleanSheets: 0,
          goals: 18,
          goalsConceded: 0,
        },
      },
      defensive: {
        rngState: 2_533_830_531,
        role: "starter",
        stats: {
          appearances: 47,
          assists: 1,
          cleanSheets: 0,
          goals: 2,
          goalsConceded: 0,
        },
      },
      goalkeeper: {
        rngState: 2_533_830_531,
        role: "starter",
        stats: {
          appearances: 48,
          assists: 0,
          cleanSheets: 16,
          goals: 0,
          goalsConceded: 34,
        },
      },
    });
    expect(attacker.role).toBe("starter");
    expect(attacker.stats.goals).toBeGreaterThan(defensive.stats.goals);
    expect(attacker.stats.cleanSheets).toBe(0);
    expect(defensive.stats.goalsConceded).toBe(0);
    expect(goalkeeper.role).toBe("starter");
    expect(goalkeeper.stats.goals).toBe(0);
    expect(goalkeeper.stats.assists).toBe(0);
    expect(goalkeeper.stats.cleanSheets).toBeGreaterThan(0);
    expect(goalkeeper.stats.goalsConceded).toBeGreaterThan(0);
  });

  it("preserves generated role and stat invariants", () => {
    const groups = Object.keys(POSITION_ROLE_GROUPS) as Array<
      keyof typeof POSITION_ROLE_GROUPS
    >;

    for (let index = 0; index < 512; index += 1) {
      const roleGroup = groups[index % groups.length]!;
      const result = simulateRoleSeason({
        clubContinentalReputation: index % 6,
        clubDomesticReputation: index % 6,
        clubInternationalReputation: index % 6,
        overall: 40 + (index % 60),
        rngState: createClassicRngState(`role:${index}`),
        roleGroup,
      });

      expect(result.stats.appearances).toBeGreaterThanOrEqual(0);
      expect(result.stats.goals).toBeGreaterThanOrEqual(0);
      expect(result.stats.assists).toBeGreaterThanOrEqual(0);
      expect(result.stats.cleanSheets).toBeGreaterThanOrEqual(0);
      expect(result.stats.goalsConceded).toBeGreaterThanOrEqual(0);

      if (roleGroup === "goalkeeper") {
        expect(result.stats.goals).toBe(0);
        expect(result.stats.assists).toBe(0);
      } else {
        expect(result.stats.cleanSheets).toBe(0);
        expect(result.stats.goalsConceded).toBe(0);
      }
    }
  });
});
