import { describe, expect, it } from "vitest";

import { CSL_CLUBS } from "./catalog/csl";
import { createRngState } from "./rng";
import { simulateStandardPeriod } from "./seasonSimulator";

describe("Phase 1 standard-period simulator", () => {
  it("advances two CSL seasons with frozen attacker stats and totals", () => {
    expect(CSL_CLUBS.map((club) => club.name)).toEqual([
      "上海海港",
      "上海申花",
      "成都蓉城",
      "北京国安",
      "山东泰山",
      "天津津门虎",
      "浙江",
      "河南",
      "长春亚泰",
      "青岛西海岸",
      "武汉三镇",
      "青岛海牛",
      "深圳新鹏城",
      "云南玉昆",
      "大连英博",
      "梅州客家",
    ]);
    expect(new Set(CSL_CLUBS.map((club) => club.id)).size).toBe(16);

    const result = simulateStandardPeriod({
      ability: 50,
      age: 16,
      clubId: "shanghai-port",
      rngState: createRngState("phase-1:period-golden"),
      role: "reserve",
      valueEuro: 100_000,
    });

    expect(result).toEqual({
      ability: 56,
      age: 18,
      clubId: "shanghai-port",
      rngState: 224_009_883,
      role: "reserve",
      seasons: [
        {
          abilityAfter: 52,
          abilityBefore: 50,
          age: 16,
          appearances: 10,
          assists: 1,
          clubId: "shanghai-port",
          goals: 3,
          role: "reserve",
          trophies: [],
          valueEuroAfter: 1_000_000,
          valueEuroBefore: 100_000,
        },
        {
          abilityAfter: 56,
          abilityBefore: 52,
          age: 17,
          appearances: 15,
          assists: 4,
          clubId: "shanghai-port",
          goals: 4,
          role: "reserve",
          trophies: ["中超冠军"],
          valueEuroAfter: 2_970_000,
          valueEuroBefore: 1_000_000,
        },
      ],
      totals: {
        appearances: 25,
        assists: 5,
        goals: 7,
      },
      trophies: ["中超冠军"],
      valueEuro: 2_970_000,
    });
  });

  it("preserves age, ability, value, stat, and total invariants across seeds", () => {
    const roles = ["reserve", "rotation", "starter", "star"] as const;

    for (let seedIndex = 0; seedIndex < 128; seedIndex += 1) {
      const age = 16 + (seedIndex % 23);
      const ability = 40 + (seedIndex % 60);
      const club = CSL_CLUBS[seedIndex % CSL_CLUBS.length];
      const role = roles[seedIndex % roles.length];

      expect(club).toBeDefined();
      expect(role).toBeDefined();

      const result = simulateStandardPeriod({
        ability,
        age,
        clubId: club!.id,
        rngState: createRngState(`phase-1:invariant:${seedIndex}`),
        role: role!,
        valueEuro: 100_000 + seedIndex * 30_000,
      });

      expect(result.age).toBe(age + 2);
      expect(result.ability).toBeGreaterThanOrEqual(40);
      expect(result.ability).toBeLessThanOrEqual(99);
      expect(result.valueEuro).toBeGreaterThanOrEqual(100_000);
      expect(result.seasons.map((season) => season.age)).toEqual([
        age,
        age + 1,
      ]);

      for (const season of result.seasons) {
        expect(season.appearances).toBeGreaterThanOrEqual(0);
        expect(season.goals).toBeGreaterThanOrEqual(0);
        expect(season.assists).toBeGreaterThanOrEqual(0);
      }

      expect(result.totals).toEqual({
        appearances: result.seasons.reduce(
          (total, season) => total + season.appearances,
          0,
        ),
        assists: result.seasons.reduce(
          (total, season) => total + season.assists,
          0,
        ),
        goals: result.seasons.reduce(
          (total, season) => total + season.goals,
          0,
        ),
      });
    }
  });
});
