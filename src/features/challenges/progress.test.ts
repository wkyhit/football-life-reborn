import { describe, expect, it } from "vitest";

import {
  defaultClassicChoicePolicy,
  playClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
  type ClassicIdentity,
} from "../../domain/classicEngine";
import { stableStringify } from "../../domain/deterministicHash";
import type {
  NationalTournamentRecord,
  NationalTournamentResult,
} from "../../domain/nationalTeam";
import type { PersonalAward } from "../../domain/awards";
import type { CareerTrophy } from "../../domain/summary";
import {
  CHALLENGE_CATALOG,
  challengeDefinition,
} from "./catalog";
import {
  evaluateChallengeProgress,
  type ChallengeProgress,
} from "./progress";

const CHINA_STRIKER: ClassicIdentity = {
  lastName: "李",
  nationalityFifaCode: "CHN",
  position: "ST",
  preferredNumber: 10,
};
const CHINA_KEEPER: ClassicIdentity = {
  lastName: "王",
  nationalityFifaCode: "CHN",
  position: "GK",
  preferredNumber: 1,
};
const EMPTY_STATS = {
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
} as const;

describe("challenge progress", () => {
  it("publishes the three approved immutable challenge definitions", () => {
    expect(Object.keys(CHALLENGE_CATALOG)).toEqual([
      "one_club",
      "asian_glory",
      "goalkeeper_legend",
    ]);
    expect(
      Object.values(CHALLENGE_CATALOG).map(
        (challenge) => challenge.title,
      ),
    ).toEqual(["一人一城", "亚洲之光", "门将传奇"]);
    expect(
      Object.values(CHALLENGE_CATALOG).map(
        (challenge) => challenge.version,
      ),
    ).toEqual([1, 1, 1]);
    expect(challengeDefinition("one_club")).toBe(
      CHALLENGE_CATALOG.one_club,
    );
    expect(Object.isFrozen(CHALLENGE_CATALOG)).toBe(true);
    expect(
      Object.values(CHALLENGE_CATALOG).every((challenge) =>
        Object.isFrozen(challenge.rules),
      ),
    ).toBe(true);
  });

  describe("一人一城", () => {
    it("allows loans, fails a permanent-club change, and completes only after 16 seasons and retirement", () => {
      const completed = completeCareer(
        CHINA_STRIKER,
        "challenge:one-club",
      );
      expect(completed.summary?.hiddenTitles).toContain(
        "one_club_man",
      );

      const withLoan: ClassicCareerState = {
        ...completed,
        choiceLog: [
          completed.choiceLog[0]!,
          syntheticChoice(
            "loan_offer",
            "loan:shijiazhuang",
          ),
          ...completed.choiceLog.slice(1),
        ],
        phase: "decision",
        summary: null,
      };
      const transferred: ClassicCareerState = {
        ...withLoan,
        choiceLog: [
          ...withLoan.choiceLog,
          syntheticChoice(
            "transfer",
            "join:shanghai-port",
          ),
        ],
      };
      const fifteenSeasons: ClassicCareerState = {
        ...completed,
        seasons: completed.seasons.slice(0, 15),
      };

      expect(
        evaluateChallengeProgress("one_club", withLoan),
      ).toMatchObject({
        status: "active",
      });
      expect(
        findRule(
          evaluateChallengeProgress("one_club", withLoan),
          "club_loyalty",
        ),
      ).toMatchObject({
        current: 1,
        state: "met",
        target: 1,
      });
      expect(
        evaluateChallengeProgress(
          "one_club",
          transferred,
        ),
      ).toMatchObject({
        status: "failed",
      });
      expect(
        findRule(
          evaluateChallengeProgress(
            "one_club",
            transferred,
          ),
          "club_loyalty",
        ),
      ).toMatchObject({
        current: 2,
        state: "failed",
      });
      expect(
        evaluateChallengeProgress(
          "one_club",
          fifteenSeasons,
        ),
      ).toMatchObject({
        status: "failed",
      });
      expect(
        findRule(
          evaluateChallengeProgress(
            "one_club",
            fifteenSeasons,
          ),
          "career_length",
        ),
      ).toMatchObject({
        current: 15,
        state: "failed",
        target: 16,
      });
      expect(
        evaluateChallengeProgress("one_club", completed),
      ).toMatchObject({
        status: "completed",
      });
    });
  });

  describe("亚洲之光", () => {
    it("enforces the AFC reputation <=2 eligibility boundary", () => {
      const eligible = startClassicCareer({
        identity: {
          ...CHINA_STRIKER,
          nationalityFifaCode: "AUS",
        },
        mode: "normal",
        seed: "challenge:asian:eligible",
      });
      const ineligible = startClassicCareer({
        identity: {
          ...CHINA_STRIKER,
          nationalityFifaCode: "JPN",
        },
        mode: "normal",
        seed: "challenge:asian:ineligible",
      });

      expect(
        findRule(
          evaluateChallengeProgress(
            "asian_glory",
            eligible,
          ),
          "eligible_nation",
        ),
      ).toMatchObject({
        current: 2,
        state: "met",
        target: 2,
      });
      expect(
        evaluateChallengeProgress(
          "asian_glory",
          ineligible,
        ),
      ).toMatchObject({ status: "failed" });
    });

    it.each([
      ["qf", "failed"],
      ["sf", "completed"],
      ["final", "completed"],
      ["champion", "completed"],
    ] as const)(
      "treats continental result %s as %s at retirement",
      (result, expectedStatus) => {
        const career = withNationalOutcome({
          calledUp: true,
          continentalResult: result,
        });

        expect(
          evaluateChallengeProgress(
            "asian_glory",
            career,
          ).status,
        ).toBe(expectedStatus);
      },
    );

    it("requires a senior call-up and counts qualified-but-not-selected World Cups", () => {
      const noCallUp = withNationalOutcome({
        calledUp: false,
        continentalResult: "sf",
      });
      const notQualified = withNationalOutcome({
        calledUp: true,
        worldCupStatus: "not_qualified",
      });
      const qualified = withNationalOutcome({
        calledUp: true,
        worldCupStatus: "not_selected",
      });

      expect(
        evaluateChallengeProgress(
          "asian_glory",
          noCallUp,
        ).status,
      ).toBe("failed");
      expect(
        evaluateChallengeProgress(
          "asian_glory",
          notQualified,
        ).status,
      ).toBe("failed");
      expect(
        evaluateChallengeProgress(
          "asian_glory",
          qualified,
        ).status,
      ).toBe("completed");
    });
  });

  describe("门将传奇", () => {
    it("fails non-goalkeepers and keeps the 149/150 clean-sheet boundary explicit", () => {
      const outfield = completeCareer(
        CHINA_STRIKER,
        "challenge:keeper:outfield",
      );
      const at149 = withGoalkeeperOutcome({
        award: "golden_glove",
        cleanSheets: 149,
        retired: false,
      });
      const at150WithoutHonor = withGoalkeeperOutcome({
        cleanSheets: 150,
        retired: false,
      });
      const at150WithHonor = withGoalkeeperOutcome({
        award: "golden_glove",
        cleanSheets: 150,
        retired: false,
      });

      expect(
        evaluateChallengeProgress(
          "goalkeeper_legend",
          outfield,
        ).status,
      ).toBe("failed");
      expect(
        findRule(
          evaluateChallengeProgress(
            "goalkeeper_legend",
            at149,
          ),
          "clean_sheets",
        ),
      ).toMatchObject({
        current: 149,
        state: "pending",
        target: 150,
      });
      expect(
        evaluateChallengeProgress(
          "goalkeeper_legend",
          at150WithoutHonor,
        ).status,
      ).toBe("active");
      expect(
        evaluateChallengeProgress(
          "goalkeeper_legend",
          at150WithHonor,
        ).status,
      ).toBe("completed");
    });

    it.each([
      "continental_primary",
      "continental_secondary",
      "club_world_cup",
      "national_continental",
      "world_cup",
    ] as const)(
      "accepts %s as the required elite honor",
      (trophy) => {
        expect(
          evaluateChallengeProgress(
            "goalkeeper_legend",
            withGoalkeeperOutcome({
              cleanSheets: 150,
              retired: true,
              trophy,
            }),
          ).status,
        ).toBe("completed");
      },
    );

    it("fails an unmet retired goalkeeper and does not count a domestic league trophy", () => {
      expect(
        evaluateChallengeProgress(
          "goalkeeper_legend",
          withGoalkeeperOutcome({
            cleanSheets: 150,
            retired: true,
            trophy: "league",
          }),
        ).status,
      ).toBe("failed");
    });
  });

  it("returns deeply frozen explanations without mutating career state", () => {
    const career = withGoalkeeperOutcome({
      award: "golden_glove",
      cleanSheets: 150,
      retired: false,
    });
    const before = stableStringify(career);
    const progress = evaluateChallengeProgress(
      "goalkeeper_legend",
      career,
    );

    expect(stableStringify(career)).toBe(before);
    expect(Object.isFrozen(progress)).toBe(true);
    expect(Object.isFrozen(progress.rules)).toBe(true);
    expect(
      progress.rules.every((rule) => Object.isFrozen(rule)),
    ).toBe(true);
  });
});

function completeCareer(
  identity: ClassicIdentity,
  seed: string,
): ClassicCareerState {
  return playClassicCareer({
    identity,
    mode: "normal",
    policy: defaultClassicChoicePolicy,
    seed,
  });
}

function syntheticChoice(
  decisionType: ClassicChoiceLogEntry["decisionType"],
  optionId: string,
): ClassicChoiceLogEntry {
  return {
    decisionId: `synthetic-${decisionType}`,
    decisionType,
    optionId,
  };
}

function withNationalOutcome(input: {
  readonly calledUp: boolean;
  readonly continentalResult?: NationalTournamentResult;
  readonly worldCupStatus?:
    | "not_qualified"
    | "not_selected";
}): ClassicCareerState {
  const career = completeCareer(
    CHINA_STRIKER,
    `challenge:asian:${JSON.stringify(input)}`,
  );
  const records: NationalTournamentRecord[] = [];

  if (input.continentalResult !== undefined) {
    records.push({
      result: input.continentalResult,
      status: "played",
      trophy: "national_continental",
    });
  }
  if (input.worldCupStatus !== undefined) {
    records.push({
      status: input.worldCupStatus,
      trophy: "world_cup",
    });
  }

  return {
    ...career,
    nationalTeamPeriods: input.calledUp
      ? [
          {
            ageEnd: 23,
            ageStart: 22,
            id: "challenge-call-up",
            nationalityFifaCode: "CHN",
            overall: 75,
            periodIndex: 0,
            rngState: 1,
            stats: EMPTY_STATS,
          },
        ]
      : [],
    seasons: career.seasons.map((season, index) => ({
      ...season,
      nationalTournamentRecords:
        index === 0 ? records : [],
    })),
  };
}

function withGoalkeeperOutcome(input: {
  readonly award?: PersonalAward;
  readonly cleanSheets: number;
  readonly retired: boolean;
  readonly trophy?: CareerTrophy;
}): ClassicCareerState {
  const career = completeCareer(
    CHINA_KEEPER,
    `challenge:keeper:${JSON.stringify(input)}`,
  );
  const started = startClassicCareer({
    identity: CHINA_KEEPER,
    mode: career.mode,
    seed: career.seed,
  });

  return {
    ...career,
    currentDecision: input.retired
      ? null
      : started.currentDecision,
    nationalTeamPeriods: [],
    phase: input.retired ? "summary" : "decision",
    retirementReason: input.retired
      ? career.retirementReason
      : null,
    seasons: career.seasons.map((season, index) => ({
      ...season,
      awards:
        index === 0 && input.award !== undefined
          ? [input.award]
          : [],
      stats: {
        ...EMPTY_STATS,
        cleanSheets:
          index === 0 ? input.cleanSheets : 0,
      },
      trophies:
        index === 0 && input.trophy !== undefined
          ? [input.trophy]
          : [],
    })),
    summary: input.retired ? career.summary : null,
  };
}

function findRule(
  progress: ChallengeProgress,
  id: string,
) {
  const rule = progress.rules.find(
    (candidate) => candidate.id === id,
  );

  if (rule === undefined) {
    throw new Error(`Missing challenge rule: ${id}`);
  }

  return rule;
}
