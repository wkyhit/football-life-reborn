import { describe, expect, it } from "vitest";

import { createClassicRngState } from "./classicRng";
import {
  applyAnnualDevelopment,
  authorizedLegendProfile,
  developmentRange,
  planDevelopmentCycle,
  resolveDevelopmentProfile,
} from "./development";

describe("Classic development curves", () => {
  it("preserves early, normal, late, legend, and goalkeeper ranges", () => {
    expect(developmentRange("early", "attacker", 18)).toEqual([7, 16]);
    expect(developmentRange("normal", "creator", 18)).toEqual([4, 14]);
    expect(developmentRange("late", "support", 24)).toEqual([2, 9]);
    expect(developmentRange("legend", "defensive", 26)).toEqual([0, 4]);
    expect(developmentRange("normal", "goalkeeper", 26)).toEqual([1, 7]);
    expect(developmentRange("normal", "attacker", 46)).toEqual([-14, -7]);
    expect(developmentRange("normal", "goalkeeper", 46)).toEqual([
      -12,
      -5,
    ]);
  });

  it("selects profiles deterministically and honors authorized overrides", () => {
    expect(
      resolveDevelopmentProfile("profile-seed", "goalkeeper"),
    ).toBe("normal");
    expect(
      resolveDevelopmentProfile("profile-seed", "attacker", "legend"),
    ).toBe("legend");
    expect(
      resolveDevelopmentProfile("profile-seed", "attacker"),
    ).toBe(resolveDevelopmentProfile("profile-seed", "attacker"));
    expect(
      authorizedLegendProfile({
        isoAlpha2: "BR",
        lastName: "贝利",
        preferredNumber: 10,
      }),
    ).toBe("legend");
    expect(
      authorizedLegendProfile({
        isoAlpha2: "BR",
        lastName: "贝利",
        preferredNumber: 9,
      }),
    ).toBeUndefined();
  });

  it("splits a role-sensitive two-year cycle into bounded annual changes", () => {
    const planned = planDevelopmentCycle({
      age: 16,
      developmentProfile: "early",
      overall: 50,
      rngState: createClassicRngState("phase-2:development-cycle"),
      role: "starter",
      roleGroup: "attacker",
    });

    expect(planned).toEqual({
      cycle: {
        annualDeltas: [3, 5],
        nextPart: 0,
        targetAge: 18,
      },
      rngState: 1_023_141_294,
    });
    expect(planned.cycle?.targetAge).toBe(18);
    expect(planned.cycle?.annualDeltas).toHaveLength(2);
    expect(
      planned.cycle!.annualDeltas[0] +
        planned.cycle!.annualDeltas[1],
    ).toBeGreaterThanOrEqual(8);

    const firstYear = applyAnnualDevelopment({
      age: 16,
      cycle: planned.cycle,
      developmentProfile: "early",
      overall: 50,
      rngState: planned.rngState,
      role: "starter",
      roleGroup: "attacker",
    });
    const secondYear = applyAnnualDevelopment({
      age: 17,
      cycle: firstYear.cycle,
      developmentProfile: "early",
      overall: firstYear.overall,
      rngState: firstYear.rngState,
      role: "starter",
      roleGroup: "attacker",
    });

    expect(firstYear.cycle?.nextPart).toBe(1);
    expect(secondYear.cycle).toBeNull();
    expect(secondYear.overall).toBeGreaterThan(50);
    expect(secondYear.overall).toBeLessThanOrEqual(99);
  });

  it("keeps generated age, ability, and delta values inside the contract", () => {
    const profiles = ["early", "normal", "late", "legend"] as const;
    const roles = [
      "starter",
      "high_rotation",
      "low_rotation",
      "substitute",
    ] as const;

    for (let index = 0; index < 512; index += 1) {
      const profile = profiles[index % profiles.length]!;
      const role = roles[index % roles.length]!;
      const age = 16 + (index % 29);
      const overall = 40 + (index % 60);
      const result = applyAnnualDevelopment({
        age,
        cycle: null,
        developmentProfile: profile,
        overall,
        rngState: createClassicRngState(`development:${index}`),
        role,
        roleGroup: "attacker",
      });

      expect(result.overall).toBeGreaterThanOrEqual(40);
      expect(result.overall).toBeLessThanOrEqual(99);
      expect(result.rngState).toBeGreaterThan(0);
      expect(result.rngState).toBeLessThanOrEqual(0xffff_ffff);
    }
  });
});
