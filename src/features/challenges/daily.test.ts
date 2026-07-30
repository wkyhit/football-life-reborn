import { describe, expect, it } from "vitest";

import {
  DAILY_CHALLENGE_FAMILIES,
  DAILY_CHALLENGE_TIME_ZONE,
  DAILY_CHALLENGE_VERSION,
  deriveCalendarDate,
  deriveDailyChallenge,
  getDailyChallenges,
  parseDailyChallengeSeed,
} from "./daily";

describe("daily challenges", () => {
  it.each([
    {
      expected: "2026-01-15",
      instant: "2026-01-15T15:59:59.999Z",
    },
    {
      expected: "2026-01-16",
      instant: "2026-01-15T16:00:00.000Z",
    },
    {
      expected: "2026-07-30",
      instant: "2026-07-30T15:59:59.999Z",
    },
    {
      expected: "2026-07-31",
      instant: "2026-07-30T16:00:00.000Z",
    },
  ])(
    "maps $instant to Shanghai day $expected without DST drift",
    ({ expected, instant }) => {
      expect(
        deriveCalendarDate(
          new Date(instant),
          DAILY_CHALLENGE_TIME_ZONE,
        ),
      ).toBe(expected);
    },
  );

  it("derives exact IDs and seeds from date, family, and version", () => {
    expect(
      deriveDailyChallenge({
        calendarDate: "2026-07-30",
        family: "one_club",
        version: 1,
      }),
    ).toEqual({
      calendarDate: "2026-07-30",
      family: "one_club",
      id: "daily-v1-2026-07-30-one_club",
      seed: "daily:v1:2026-07-30:one_club",
      version: 1,
    });
    expect(
      deriveDailyChallenge({
        calendarDate: "2026-07-30",
        family: "one_club",
        version: 2,
      }),
    ).toEqual({
      calendarDate: "2026-07-30",
      family: "one_club",
      id: "daily-v2-2026-07-30-one_club",
      seed: "daily:v2:2026-07-30:one_club",
      version: 2,
    });
  });

  it("rolls all three families together at Shanghai midnight", () => {
    const now = { value: new Date("2026-07-30T15:59:59.999Z") };
    const clock = () => now.value;
    const before = getDailyChallenges({
      now: clock,
      timeZone: DAILY_CHALLENGE_TIME_ZONE,
      version: DAILY_CHALLENGE_VERSION,
    });

    expect(before.map((challenge) => challenge.family)).toEqual(
      DAILY_CHALLENGE_FAMILIES,
    );
    expect(
      before.map((challenge) => challenge.calendarDate),
    ).toEqual([
      "2026-07-30",
      "2026-07-30",
      "2026-07-30",
    ]);

    now.value = new Date("2026-07-30T16:00:00.000Z");
    const after = getDailyChallenges({
      now: clock,
      timeZone: DAILY_CHALLENGE_TIME_ZONE,
      version: DAILY_CHALLENGE_VERSION,
    });

    expect(
      after.map((challenge) => challenge.calendarDate),
    ).toEqual([
      "2026-07-31",
      "2026-07-31",
      "2026-07-31",
    ]);
    expect(after.map((challenge) => challenge.id)).not.toEqual(
      before.map((challenge) => challenge.id),
    );
    expect(after.map((challenge) => challenge.seed)).not.toEqual(
      before.map((challenge) => challenge.seed),
    );
  });

  it("uses the injected time zone instead of browser locale defaults", () => {
    const instant = new Date("2026-07-30T00:30:00.000Z");

    expect(
      deriveCalendarDate(instant, "Asia/Shanghai"),
    ).toBe("2026-07-30");
    expect(
      deriveCalendarDate(instant, "America/Los_Angeles"),
    ).toBe("2026-07-29");
    expect(
      deriveCalendarDate(instant, "Pacific/Kiritimati"),
    ).toBe("2026-07-30");
  });

  it.each([
    "2026-7-30",
    "2026-02-30",
    "not-a-date",
  ])("rejects invalid calendar date %s", (calendarDate) => {
    expect(() =>
      deriveDailyChallenge({
        calendarDate,
        family: "asian_glory",
        version: DAILY_CHALLENGE_VERSION,
      }),
    ).toThrow("calendar date");
  });

  it("recovers challenge metadata only from an exact daily seed", () => {
    expect(
      parseDailyChallengeSeed(
        "daily:v1:2026-07-30:goalkeeper_legend",
      ),
    ).toEqual({
      calendarDate: "2026-07-30",
      family: "goalkeeper_legend",
      id: "daily-v1-2026-07-30-goalkeeper_legend",
      seed: "daily:v1:2026-07-30:goalkeeper_legend",
      version: 1,
    });
    expect(
      parseDailyChallengeSeed("ordinary-career"),
    ).toBeNull();
    expect(
      parseDailyChallengeSeed(
        "daily:v0:2026-07-30:one_club",
      ),
    ).toBeNull();
    expect(
      parseDailyChallengeSeed(
        "daily:v2:2026-07-30:one_club",
      ),
    ).toBeNull();
    expect(
      parseDailyChallengeSeed(
        "daily:v1:2026-02-30:one_club",
      ),
    ).toBeNull();
    expect(
      parseDailyChallengeSeed(
        "daily:v1:2026-07-30:unknown",
      ),
    ).toBeNull();
  });
});
