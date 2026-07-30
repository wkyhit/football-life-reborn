import {
  COMPETITION_ROWS,
  CONFEDERATION_ROWS,
  COUNTRY_ROWS,
  DOMESTIC_CUP_ROWS,
} from "./classicCatalogData.generated";

export const CLASSIC_CONTENT_VERSION =
  "2026-07-30-classic-v1" as const;

export type ConfederationId = keyof typeof CONFEDERATION_ROWS;

export type Country = {
  readonly confederation: ConfederationId;
  readonly continentalReputation: number;
  readonly fifaCode: string;
  readonly fifaReputation: number;
  readonly internationalReputation: number;
  readonly isoAlpha2: string;
  readonly kitPattern: string;
  readonly kitPrimaryColor: string;
  readonly kitSecondaryColor: string;
  readonly nameEn: string;
  readonly nameZh: string;
};

export type Club = {
  readonly abbreviation: string;
  readonly competitionId: string;
  readonly confederation: ConfederationId;
  readonly continentalReputation: number;
  readonly countryFifaCode: string;
  readonly domesticReputation: number;
  readonly id: string;
  readonly internationalReputation: number;
  readonly nameEn: string;
  readonly nameZh: string;
  readonly primaryColor: string;
  readonly shortNameZh: string;
  readonly tier: 1 | 2;
};

export type Competition = {
  readonly clubIds: readonly string[];
  readonly confederation: ConfederationId;
  readonly countryFifaCode: string;
  readonly domesticCupId: string;
  readonly id: string;
  readonly nameEn: string;
  readonly nameZh: string;
  readonly tier: 1 | 2;
};

export type DomesticCup = {
  readonly countryFifaCode: string;
  readonly id: string;
  readonly nameZh: string;
};

export type ConfederationCompetitions = {
  readonly continentalPrimary: string;
  readonly continentalSecondary: string | null;
  readonly nationalContinental: string;
};

export type ClassicCatalog = {
  readonly clubById: ReadonlyMap<string, Club>;
  readonly clubs: readonly Club[];
  readonly competitionById: ReadonlyMap<string, Competition>;
  readonly competitions: readonly Competition[];
  readonly confederations: Readonly<
    Record<ConfederationId, ConfederationCompetitions>
  >;
  readonly contentVersion: typeof CLASSIC_CONTENT_VERSION;
  readonly countries: readonly Country[];
  readonly countryByFifaCode: ReadonlyMap<string, Country>;
  readonly domesticCupById: ReadonlyMap<string, DomesticCup>;
  readonly domesticCups: readonly DomesticCup[];
};

type CountryRow = readonly [
  isoAlpha2: string,
  fifaCode: string,
  nameZh: string,
  nameEn: string,
  confederation: ConfederationId,
  continentalReputation: number,
  fifaReputation: number,
  internationalReputation: number,
  kitPrimaryColor: string,
  kitSecondaryColor: string,
  kitPattern?: string,
];

type ClubRow = readonly [
  id: string,
  nameZh: string,
  nameEn: string,
  shortNameZh: string,
  abbreviation: string,
  domesticReputation: number,
  continentalReputation: number,
  internationalReputation: number,
  primaryColor: string,
];

type CompetitionRow = {
  readonly clubRows: readonly ClubRow[];
  readonly confederation: ConfederationId;
  readonly countryFifaCode: string;
  readonly domesticCupId: string;
  readonly id: string;
  readonly nameEn: string;
  readonly nameZh: string;
  readonly tier: 1 | 2;
};

export const EXPECTED_COMPETITION_TEAM_COUNTS = {
  "premier-league": 20,
  championship: 16,
  laliga: 20,
  "laliga-2": 12,
  "serie-a": 20,
  bundesliga: 18,
  "ligue-1": 18,
  csl: 16,
  "china-league-one": 12,
  "j1-league": 20,
  brasileirao: 20,
} as const;

const countryRows = COUNTRY_ROWS as readonly CountryRow[];
const competitionRows =
  COMPETITION_ROWS as readonly CompetitionRow[];

const countries = Object.freeze(
  countryRows.map((row) =>
    Object.freeze({
      confederation: row[4],
      continentalReputation: row[5],
      fifaCode: row[1],
      fifaReputation: row[6],
      internationalReputation: row[7],
      isoAlpha2: row[0],
      kitPattern: row[10] ?? "solid",
      kitPrimaryColor: row[8],
      kitSecondaryColor: row[9],
      nameEn: row[3],
      nameZh: row[2],
    }),
  ),
);

const competitions = Object.freeze(
  competitionRows.map((row) =>
    Object.freeze({
      clubIds: Object.freeze(row.clubRows.map((club) => club[0])),
      confederation: row.confederation,
      countryFifaCode: row.countryFifaCode,
      domesticCupId: row.domesticCupId,
      id: row.id,
      nameEn: row.nameEn,
      nameZh: row.nameZh,
      tier: row.tier,
    }),
  ),
);

const clubs = Object.freeze(
  competitionRows.flatMap((competition) =>
    competition.clubRows.map((row) =>
      Object.freeze({
        abbreviation: row[4],
        competitionId: competition.id,
        confederation: competition.confederation,
        continentalReputation: row[6],
        countryFifaCode: competition.countryFifaCode,
        domesticReputation: row[5],
        id: row[0],
        internationalReputation: row[7],
        nameEn: row[2],
        nameZh: row[1],
        primaryColor: row[8],
        shortNameZh: row[3],
        tier: competition.tier,
      }),
    ),
  ),
);

const domesticCups = Object.freeze(
  DOMESTIC_CUP_ROWS.map((row) =>
    Object.freeze({
      countryFifaCode: row.countryFifaCode,
      id: row.id,
      nameZh: row.nameZh,
    }),
  ),
);

export const CLASSIC_CATALOG: ClassicCatalog = Object.freeze({
  clubById: indexBy(clubs, (club) => club.id),
  clubs,
  competitionById: indexBy(
    competitions,
    (competition) => competition.id,
  ),
  competitions,
  confederations: CONFEDERATION_ROWS,
  contentVersion: CLASSIC_CONTENT_VERSION,
  countries,
  countryByFifaCode: indexBy(
    countries,
    (country) => country.fifaCode,
  ),
  domesticCupById: indexBy(domesticCups, (cup) => cup.id),
  domesticCups,
});

export function validateClassicCatalog(
  catalog: ClassicCatalog,
): string[] {
  const errors: string[] = [];

  expectCount(errors, "countries", catalog.countries.length, 61);
  expectCount(errors, "clubs", catalog.clubs.length, 192);
  expectCount(errors, "competitions", catalog.competitions.length, 11);
  expectCount(errors, "domestic cups", catalog.domesticCups.length, 8);
  expectCount(
    errors,
    "confederations",
    Object.keys(catalog.confederations).length,
    6,
  );

  pushDuplicates(
    errors,
    "country FIFA code",
    catalog.countries.map((country) => country.fifaCode),
  );
  pushDuplicates(
    errors,
    "country ISO alpha-2",
    catalog.countries.map((country) => country.isoAlpha2),
  );
  pushDuplicates(
    errors,
    "club ID",
    catalog.clubs.map((club) => club.id),
  );
  pushDuplicates(
    errors,
    "competition ID",
    catalog.competitions.map((competition) => competition.id),
  );
  pushDuplicates(
    errors,
    "domestic cup ID",
    catalog.domesticCups.map((cup) => cup.id),
  );

  for (const country of catalog.countries) {
    if (!(country.confederation in catalog.confederations)) {
      errors.push(
        `Country ${country.fifaCode} has unknown confederation ${country.confederation}`,
      );
    }

    validateReputation(
      errors,
      `Country ${country.fifaCode} continental reputation`,
      country.continentalReputation,
      6,
    );
    validateReputation(
      errors,
      `Country ${country.fifaCode} FIFA reputation`,
      country.fifaReputation,
      5,
    );
    validateReputation(
      errors,
      `Country ${country.fifaCode} international reputation`,
      country.internationalReputation,
      5,
    );
  }

  for (const cup of catalog.domesticCups) {
    if (!catalog.countryByFifaCode.has(cup.countryFifaCode)) {
      errors.push(
        `Cup ${cup.id} references unknown country ${cup.countryFifaCode}`,
      );
    }
  }

  for (const competition of catalog.competitions) {
    const country = catalog.countryByFifaCode.get(
      competition.countryFifaCode,
    );
    const cup = catalog.domesticCupById.get(competition.domesticCupId);
    const expectedTeamCount =
      EXPECTED_COMPETITION_TEAM_COUNTS[
        competition.id as keyof typeof EXPECTED_COMPETITION_TEAM_COUNTS
      ];

    if (!country) {
      errors.push(
        `Competition ${competition.id} references unknown country ${competition.countryFifaCode}`,
      );
    } else if (country.confederation !== competition.confederation) {
      errors.push(
        `Competition ${competition.id} confederation does not match ${country.fifaCode}`,
      );
    }

    if (!cup) {
      errors.push(
        `Competition ${competition.id} references unknown cup ${competition.domesticCupId}`,
      );
    } else if (cup.countryFifaCode !== competition.countryFifaCode) {
      errors.push(
        `Competition ${competition.id} and cup ${cup.id} have different countries`,
      );
    }

    if (expectedTeamCount === undefined) {
      errors.push(`Competition ${competition.id} has no frozen team count`);
    } else if (competition.clubIds.length !== expectedTeamCount) {
      errors.push(
        `Competition ${competition.id} has ${competition.clubIds.length} clubs, expected ${expectedTeamCount}`,
      );
    }

    pushDuplicates(
      errors,
      `club ID in ${competition.id}`,
      competition.clubIds,
    );

    for (const clubId of competition.clubIds) {
      const club = catalog.clubById.get(clubId);

      if (!club) {
        errors.push(
          `Competition ${competition.id} references unknown club ${clubId}`,
        );
      } else if (club.competitionId !== competition.id) {
        errors.push(
          `Club ${club.id} points to ${club.competitionId}, expected ${competition.id}`,
        );
      }
    }
  }

  for (const club of catalog.clubs) {
    const competition = catalog.competitionById.get(club.competitionId);

    if (!competition) {
      errors.push(
        `Club ${club.id} references unknown competition ${club.competitionId}`,
      );
      continue;
    }

    if (
      club.countryFifaCode !== competition.countryFifaCode ||
      club.confederation !== competition.confederation ||
      club.tier !== competition.tier
    ) {
      errors.push(`Club ${club.id} has inconsistent competition metadata`);
    }

    validateReputation(
      errors,
      `Club ${club.id} domestic reputation`,
      club.domesticReputation,
      5,
    );
    validateReputation(
      errors,
      `Club ${club.id} continental reputation`,
      club.continentalReputation,
      5,
    );
    validateReputation(
      errors,
      `Club ${club.id} international reputation`,
      club.internationalReputation,
      5,
    );
  }

  if (catalog.countryByFifaCode.size !== catalog.countries.length) {
    errors.push("Country index size does not match country records");
  }
  if (catalog.clubById.size !== catalog.clubs.length) {
    errors.push("Club index size does not match club records");
  }
  if (catalog.competitionById.size !== catalog.competitions.length) {
    errors.push("Competition index size does not match competition records");
  }
  if (catalog.domesticCupById.size !== catalog.domesticCups.length) {
    errors.push("Cup index size does not match cup records");
  }

  return errors;
}

export function assertClassicCatalogIntegrity(): void {
  const errors = validateClassicCatalog(CLASSIC_CATALOG);

  if (errors.length > 0) {
    throw new Error(`Invalid Classic catalog:\n${errors.join("\n")}`);
  }
}

assertClassicCatalogIntegrity();

function indexBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): ReadonlyMap<string, T> {
  return new Map(values.map((value) => [keyFor(value), value]));
}

function expectCount(
  errors: string[],
  label: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    errors.push(`${label} count is ${actual}, expected ${expected}`);
  }
}

function pushDuplicates(
  errors: string[],
  label: string,
  values: readonly string[],
): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function validateReputation(
  errors: string[],
  label: string,
  value: number,
  maximum: number,
): void {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    errors.push(`${label} is outside 0-${maximum}: ${value}`);
  }
}
