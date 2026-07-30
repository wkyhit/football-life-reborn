import { describe, expect, it } from "vitest";

import {
  CLASSIC_CATALOG,
  CLASSIC_CONTENT_VERSION,
  EXPECTED_COMPETITION_TEAM_COUNTS,
  validateClassicCatalog,
} from "./classicCatalog";

describe("Classic catalog integrity", () => {
  it("freezes the audited counts and normalized relations", () => {
    expect(CLASSIC_CONTENT_VERSION).toBe("2026-07-30-classic-v1");
    expect(CLASSIC_CATALOG.countries).toHaveLength(61);
    expect(CLASSIC_CATALOG.clubs).toHaveLength(192);
    expect(CLASSIC_CATALOG.competitions).toHaveLength(11);
    expect(CLASSIC_CATALOG.domesticCups).toHaveLength(8);
    expect(Object.keys(CLASSIC_CATALOG.confederations)).toHaveLength(6);

    expect(
      Object.fromEntries(
        CLASSIC_CATALOG.competitions.map((competition) => [
          competition.id,
          competition.clubIds.length,
        ]),
      ),
    ).toEqual(EXPECTED_COMPETITION_TEAM_COUNTS);

    expect(validateClassicCatalog(CLASSIC_CATALOG)).toEqual([]);
  });

  it("preserves representative records from every relationship layer", () => {
    expect(CLASSIC_CATALOG.countryByFifaCode.get("CHN")).toMatchObject({
      confederation: "AFC",
      fifaCode: "CHN",
      internationalReputation: 1,
      nameEn: "China PR",
      nameZh: "中国",
    });
    expect(CLASSIC_CATALOG.clubById.get("man-city")).toMatchObject({
      competitionId: "premier-league",
      countryFifaCode: "ENG",
      domesticReputation: 5,
      nameZh: "曼城",
      tier: 1,
    });
    expect(CLASSIC_CATALOG.clubById.get("shanghai-port")).toMatchObject({
      competitionId: "csl",
      continentalReputation: 3,
      domesticReputation: 4,
      internationalReputation: 2,
      nameZh: "上海海港",
    });
    expect(
      CLASSIC_CATALOG.domesticCupById.get("chn-fa-cup"),
    ).toMatchObject({
      countryFifaCode: "CHN",
      nameZh: "中国足协杯",
    });
    expect(CLASSIC_CATALOG.confederations.AFC).toEqual({
      continentalPrimary: "亚冠精英联赛",
      continentalSecondary: "亚冠二级联赛",
      nationalContinental: "亚洲杯",
    });
  });
});
