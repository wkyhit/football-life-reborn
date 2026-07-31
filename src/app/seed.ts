export const DEFAULT_CAREER_SEED = "phase-1-default" as const;
export const MAX_CAREER_SEED_LENGTH = 128 as const;

export type SeedIntent = {
  readonly kind: "choose" | "new" | "resume";
  readonly newCareerSeed: string;
  readonly resumableSeed: string | null;
  readonly source: "default" | "saved" | "url";
};

export function seedFromSearch(search: string): string {
  return explicitSeedFromSearch(search) ?? DEFAULT_CAREER_SEED;
}

export function resolveSeedIntent(
  search: string,
  resumableSeed: string | null,
): SeedIntent {
  const requestedSeed = explicitSeedFromSearch(search);
  const savedSeed = normalizeOptionalSeed(resumableSeed);

  if (savedSeed === null) {
    return {
      kind: "new",
      newCareerSeed: requestedSeed ?? DEFAULT_CAREER_SEED,
      resumableSeed: null,
      source: requestedSeed === null ? "default" : "url",
    };
  }

  if (requestedSeed === null) {
    return {
      kind: "resume",
      newCareerSeed: DEFAULT_CAREER_SEED,
      resumableSeed: savedSeed,
      source: "saved",
    };
  }

  return {
    kind: requestedSeed === savedSeed ? "resume" : "choose",
    newCareerSeed: requestedSeed,
    resumableSeed: savedSeed,
    source: "url",
  };
}

export function createNewCareerSeed(
  currentSeed: string,
  entropy: () => string = () => globalThis.crypto.randomUUID(),
): string {
  const token = entropy().trim() || "new-life";
  const candidate = `career:${token}`.slice(
    0,
    MAX_CAREER_SEED_LENGTH,
  );
  const normalizedCurrent = normalizeOptionalSeed(currentSeed);

  if (candidate !== normalizedCurrent) {
    return candidate;
  }

  return `${candidate.slice(0, MAX_CAREER_SEED_LENGTH - 5)}:next`;
}

export function urlWithSeed(href: string, seed: string): string {
  const url = new URL(href);
  url.searchParams.set(
    "seed",
    normalizeOptionalSeed(seed) ?? DEFAULT_CAREER_SEED,
  );

  return url.toString();
}

function explicitSeedFromSearch(search: string): string | null {
  return normalizeOptionalSeed(
    new URLSearchParams(search).get("seed"),
  );
}

function normalizeOptionalSeed(seed: string | null): string | null {
  const normalized = seed?.trim().slice(0, MAX_CAREER_SEED_LENGTH);
  return normalized ? normalized : null;
}
