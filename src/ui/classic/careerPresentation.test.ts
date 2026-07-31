import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  replayClassicCareer,
  startClassicCareer,
} from "../../domain/classicEngine";
import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";
import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import { createCareerPresentation } from "./careerPresentation";

describe("Classic career presentation", () => {
  it("separates committed engine state from the visible reveal cursor", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-3:career-presentation",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected an academy decision");
    }

    const committed = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const immediate = createCareerPresentation({
      career: committed,
      isRevealing: true,
      visibleSeasonCount: 0,
    });

    expect(immediate.header.age).toBe(committed.playerAge);
    expect(immediate.header.overall).toBe(committed.overall);
    expect(immediate.totals).toEqual({
      appearances: 0,
      assists: 0,
      goals: 0,
      trophies: 0,
    });
    expect(immediate.panel).toEqual({ kind: "simulating" });
    expect(
      immediate.timeline.filter((row) => row.kind === "season"),
    ).toHaveLength(0);

    const firstSeason = committed.seasons[0]!;
    const partial = createCareerPresentation({
      career: committed,
      isRevealing: true,
      visibleSeasonCount: 1,
    });

    expect(partial.header).toMatchObject({
      age: firstSeason.age,
      marketValue: firstSeason.marketValue,
      overall: firstSeason.overall,
    });
    expect(partial.totals).toMatchObject({
      appearances: firstSeason.stats.appearances,
      assists: firstSeason.stats.assists,
      goals: firstSeason.stats.goals,
    });
    expect(
      partial.timeline.filter((row) => row.kind === "season"),
    ).toHaveLength(1);

    const revealed = createCareerPresentation({
      career: committed,
      isRevealing: false,
      visibleSeasonCount: committed.seasons.length,
    });

    expect(revealed.header.age).toBe(committed.playerAge);
    expect(revealed.panel.kind).toBe("decision");
    expect(
      revealed.timeline.filter((row) => row.kind === "current"),
    ).toEqual([
      { age: committed.currentDecision?.age, kind: "current" },
    ]);
  });

  it("presents a career event with specific labels and exact consequences", () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "matrix-long-support-high",
    );

    if (fixture === undefined) {
      throw new Error("Missing season-load golden fixture");
    }

    const eventChoiceIndex = fixture.choices.findIndex(
      ({ optionId }) =>
        optionId === "event:season_load:accept",
    );
    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, eventChoiceIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const presentation = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: career.seasons.length,
    });

    if (
      presentation.panel.kind !== "decision" ||
      career.currentDecision?.event?.eventKey !== "season_load"
    ) {
      throw new Error("Expected a season-load decision");
    }

    const accept = presentation.panel.options.find(
      ({ id }) => id === "event:season_load:accept",
    );
    const expected =
      career.currentDecision.event.variantKey === "double_session"
        ? {
            label: "接受双倍训练",
            negativeProbability: 0.35,
            positiveProbability: 0.65,
          }
        : {
            label: "承担更多负荷",
            negativeProbability: 0.3,
            positiveProbability: 0.7,
          };

    expect(accept).toMatchObject({
      club: null,
      outcomePreviews: [
        {
          outcomeKind: "positive",
          probability: expected.positiveProbability,
          text: "成为绝对主力",
        },
        {
          outcomeKind: "negative",
          probability: expected.negativeProbability,
          text: "降为替补",
        },
      ],
      role: "",
      stars: "",
      title: expected.label,
    });
    expect(accept?.subtitle).not.toBe(accept?.title);
  });

  it("retains every season honor, national result, suspension, relegation, and observable tier change", () => {
    const committed = committedCareer(
      "issue-14:complete-season-narrative",
    );
    const first = committed.seasons[0]!;
    const second = committed.seasons[1]!;
    const honorCareer = {
      ...committed,
      seasons: [
        {
          ...first,
          awards: ["golden_boot" as const],
          nationalTournamentRecords: [
            {
              result: "champion" as const,
              status: "played" as const,
              trophy: "world_cup" as const,
            },
            {
              status: "not_selected" as const,
              trophy: "national_continental" as const,
            },
          ],
          trophies: [
            "league" as const,
            "cup" as const,
            "world_cup" as const,
          ],
        },
        second,
      ],
    };
    const honorRow = createCareerPresentation({
      career: honorCareer,
      isRevealing: true,
      visibleSeasonCount: 1,
    }).timeline.find(
      (row) => row.kind === "season" && row.age === first.age,
    );

    expect(honorRow).toMatchObject({
      competitionTier: first.competitionTier,
      honors: [
        {
          kind: "trophy",
          label: "联赛冠军",
          scope: "club",
          trophy: "league",
        },
        {
          kind: "trophy",
          label: "国内杯赛冠军",
          scope: "club",
          trophy: "cup",
        },
        {
          kind: "trophy",
          label: "世界杯冠军",
          scope: "national",
          trophy: "world_cup",
        },
        {
          award: "golden_boot",
          kind: "award",
          label: "金靴奖",
        },
      ],
      nationalTournaments: [
        {
          label: "世界杯 · 冠军",
          result: "champion",
          status: "played",
          trophy: "world_cup",
        },
        {
          label: "洲际国家队赛事 · 未入选",
          result: null,
          status: "not_selected",
          trophy: "national_continental",
        },
      ],
      statuses: [],
      tierChange: null,
    });

    const statusCareer = {
      ...committed,
      seasons: [
        {
          ...first,
          awards: [],
          competitionTier: 1 as const,
          nationalTournamentRecords: [],
          relegated: true,
          suspended: false,
          trophies: [],
        },
        {
          ...second,
          awards: [],
          competitionTier: 2 as const,
          nationalTournamentRecords: [],
          relegated: false,
          suspended: true,
          teamId: first.teamId,
          trophies: [],
        },
      ],
    };
    const statusRows = createCareerPresentation({
      career: statusCareer,
      isRevealing: true,
      visibleSeasonCount: 2,
    }).timeline.filter((row) => row.kind === "season");

    expect(statusRows[0]).toMatchObject({
      statuses: [
        {
          kind: "relegation",
          label: "降入次级联赛",
        },
      ],
      tierChange: null,
    });
    expect(statusRows[1]).toMatchObject({
      statuses: [
        {
          kind: "suspension",
          label: "停赛",
        },
      ],
      tierChange: {
        from: 1,
        label: "进入次级联赛",
        to: 2,
      },
    });
  });

  it("uses stars or an explicit dash only for club-backed decisions", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "星级",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "issue-14:club-star-semantics",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected an academy decision");
    }

    const career = {
      ...initial,
      currentDecision: {
        ...decision,
        options: [
          {
            clubId: "real-madrid",
            id: "join:real-madrid",
            kind: "join_club" as const,
            label: "Join real-madrid",
          },
          {
            clubId: "preston",
            id: "join:preston",
            kind: "join_club" as const,
            label: "Join preston",
          },
        ],
      },
    };
    const presentation = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: 0,
    });

    expect(
      CLASSIC_CATALOG.clubById.get("real-madrid")
        ?.internationalReputation,
    ).toBe(5);
    expect(
      CLASSIC_CATALOG.clubById.get("preston")
        ?.internationalReputation,
    ).toBe(0);
    expect(presentation.panel).toMatchObject({
      kind: "decision",
      options: [
        {
          club: { id: "real-madrid" },
          stars: "★★★★★",
        },
        {
          club: { id: "preston" },
          stars: "—",
        },
      ],
    });
  });
});

function committedCareer(seed: string) {
  const initial = startClassicCareer({
    identity: {
      lastName: "叙事",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed,
  });
  const decision = initial.currentDecision;

  if (decision === null) {
    throw new Error("Expected an academy decision");
  }

  return applyClassicChoice(initial, {
    decisionId: decision.id,
    decisionType: decision.type,
    optionId: decision.options[0]!.id,
  });
}
