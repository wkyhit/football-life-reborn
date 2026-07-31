import { describe, expect, it } from "vitest";

import { playClassicCareer } from "../domain/classicEngine";
import { deterministicHash } from "../domain/deterministicHash";
import {
  LEGACY_CAREER_PRESENTATION_PROFILE,
  createCareerPresentationProfile,
  normalizeCareerPresentationProfile,
  preferredFootLabel,
} from "./profile";

describe("career presentation profile", () => {
  it("round-trips a preferred foot as frozen presentation-only data", () => {
    const left = createCareerPresentationProfile("left");
    const right = createCareerPresentationProfile("right");

    expect(left).toEqual({ preferredFoot: "left" });
    expect(right).toEqual({ preferredFoot: "right" });
    expect(Object.isFrozen(left)).toBe(true);
    expect(preferredFootLabel(left.preferredFoot)).toBe("左脚");
    expect(preferredFootLabel(right.preferredFoot)).toBe("右脚");
  });

  it("backfills missing or invalid legacy fields as an explicit unknown", () => {
    expect(normalizeCareerPresentationProfile(undefined)).toBe(
      LEGACY_CAREER_PRESENTATION_PROFILE,
    );
    expect(normalizeCareerPresentationProfile({})).toBe(
      LEGACY_CAREER_PRESENTATION_PROFILE,
    );
    expect(
      normalizeCareerPresentationProfile({ preferredFoot: "both" }),
    ).toBe(LEGACY_CAREER_PRESENTATION_PROFILE);
    expect(preferredFootLabel(null)).toBe("未记录");
  });

  it("never changes the frozen football state or its deterministic hash", () => {
    const career = playClassicCareer({
      identity: {
        lastName: "档案",
        nationalityFifaCode: "CHN",
        position: "CM",
        preferredNumber: 8,
      },
      mode: "normal",
      seed: "issue-23:profile-outside-engine",
    });
    const before = deterministicHash(career);

    createCareerPresentationProfile("left");
    createCareerPresentationProfile("right");

    expect(deterministicHash(career)).toBe(before);
    expect(career).not.toHaveProperty("preferredFoot");
  });
});
