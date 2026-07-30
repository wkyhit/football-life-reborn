export const DAILY_CHALLENGE_TIME_ZONE =
  "Asia/Shanghai" as const;
export const DAILY_CHALLENGE_VERSION = 1 as const;
export const DAILY_CHALLENGE_FAMILIES = Object.freeze([
  "one_club",
  "asian_glory",
  "goalkeeper_legend",
] as const);

export type DailyChallengeFamily =
  (typeof DAILY_CHALLENGE_FAMILIES)[number];

export type DailyChallenge = {
  readonly calendarDate: string;
  readonly family: DailyChallengeFamily;
  readonly id: string;
  readonly seed: string;
  readonly version: number;
};

type DailyChallengeInput = {
  readonly calendarDate: string;
  readonly family: DailyChallengeFamily;
  readonly version: number;
};

type GetDailyChallengesOptions = {
  readonly now?: () => Date;
  readonly timeZone?: string;
  readonly version?: number;
};

export function deriveCalendarDate(
  instant: Date,
  timeZone: string,
): string {
  if (Number.isNaN(instant.valueOf())) {
    throw new RangeError("Daily challenge instant is invalid");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    calendar: "iso8601",
    day: "2-digit",
    month: "2-digit",
    numberingSystem: "latn",
    timeZone,
    year: "numeric",
  }).formatToParts(instant);
  const year = readDatePart(parts, "year");
  const month = readDatePart(parts, "month");
  const day = readDatePart(parts, "day");

  return `${year}-${month}-${day}`;
}

export function deriveDailyChallenge(
  input: DailyChallengeInput,
): DailyChallenge {
  assertCalendarDate(input.calendarDate);
  assertFamily(input.family);
  assertVersion(input.version);

  return Object.freeze({
    calendarDate: input.calendarDate,
    family: input.family,
    id: `daily-v${input.version}-${input.calendarDate}-${input.family}`,
    seed: `daily:v${input.version}:${input.calendarDate}:${input.family}`,
    version: input.version,
  });
}

export function getDailyChallenges(
  options: GetDailyChallengesOptions = {},
): readonly DailyChallenge[] {
  const now = options.now ?? (() => new Date());
  const timeZone =
    options.timeZone ?? DAILY_CHALLENGE_TIME_ZONE;
  const version =
    options.version ?? DAILY_CHALLENGE_VERSION;
  const calendarDate = deriveCalendarDate(now(), timeZone);

  return Object.freeze(
    DAILY_CHALLENGE_FAMILIES.map((family) =>
      deriveDailyChallenge({
        calendarDate,
        family,
        version,
      }),
    ),
  );
}

function readDatePart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: "day" | "month" | "year",
): string {
  const value = parts.find((part) => part.type === type)?.value;

  if (value === undefined) {
    throw new RangeError(
      `Daily challenge time zone did not produce ${type}`,
    );
  }

  return value;
}

function assertCalendarDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(
      `Invalid daily challenge calendar date: ${value}`,
    );
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError(
      `Invalid daily challenge calendar date: ${value}`,
    );
  }
}

function assertFamily(
  value: DailyChallengeFamily,
): void {
  if (
    !DAILY_CHALLENGE_FAMILIES.includes(value)
  ) {
    throw new RangeError(
      `Unsupported daily challenge family: ${String(value)}`,
    );
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `Invalid daily challenge version: ${String(value)}`,
    );
  }
}
