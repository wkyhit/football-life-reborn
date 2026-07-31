import type { PreferredFoot } from "../domain/model";

export type CareerPresentationProfile = {
  readonly preferredFoot: PreferredFoot | null;
};

export const LEGACY_CAREER_PRESENTATION_PROFILE = Object.freeze({
  preferredFoot: null,
}) satisfies CareerPresentationProfile;

export function createCareerPresentationProfile(
  preferredFoot: PreferredFoot,
): CareerPresentationProfile {
  return Object.freeze({ preferredFoot });
}

export function normalizeCareerPresentationProfile(
  value: unknown,
): CareerPresentationProfile {
  if (!isCareerPresentationProfile(value)) {
    return LEGACY_CAREER_PRESENTATION_PROFILE;
  }

  return value.preferredFoot === null
    ? LEGACY_CAREER_PRESENTATION_PROFILE
    : createCareerPresentationProfile(value.preferredFoot);
}

export function isCareerPresentationProfile(
  value: unknown,
): value is CareerPresentationProfile {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "preferredFoot" in value &&
    (value.preferredFoot === null ||
      value.preferredFoot === "left" ||
      value.preferredFoot === "right")
  );
}

export function preferredFootLabel(
  preferredFoot: CareerPresentationProfile["preferredFoot"],
): string {
  switch (preferredFoot) {
    case "left":
      return "左脚";
    case "right":
      return "右脚";
    case null:
      return "未记录";
  }
}
