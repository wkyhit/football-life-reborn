import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  applyClassicChoiceWithResult,
  replayClassicCareer,
  startClassicCareer,
} from "../../domain/classicEngine";
import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";
import {
  createCareerEconomyChoiceResult,
  createCareerEconomyProjection,
} from "../../domain/economy/careerEconomyProjection";
import { formatYuan } from "../../domain/economy/economyPolicy";
import { createEventResultReveal } from "../../features/season-reveal/seasonReveal";
import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import {
  createCareerPresentation,
  createMarketValuePresentation,
  createYuanPresentation,
} from "./careerPresentation";

describe("Classic career presentation", () => {
  it("formats compact and full EUR/CNY values without losing extreme amounts", () => {
    expect(
      createMarketValuePresentation(125_000_000),
    ).toEqual({
      compact: "€1.3亿",
      currency: "EUR",
      full: "€125,000,000",
    });
    expect(createMarketValuePresentation(0)).toEqual({
      compact: "€0",
      currency: "EUR",
      full: "€0",
    });
    expect(
      createMarketValuePresentation(Number.MAX_SAFE_INTEGER),
    ).toMatchObject({
      currency: "EUR",
      full: "€9,007,199,254,740,991",
    });
    expect(createYuanPresentation(12_345_678)).toEqual({
      compact: "¥1,234.6万",
      currency: "CNY",
      full: "¥12,345,678",
    });
    expect(createYuanPresentation(9_999)).toEqual({
      compact: "¥9,999",
      currency: "CNY",
      full: "¥9,999",
    });
    expect(() =>
      createMarketValuePresentation(-1),
    ).toThrow(RangeError);
    expect(() => createYuanPresentation(1.5)).toThrow(
      RangeError,
    );
  });

  it("keeps the ordinary timeline fixed at ages 16 through 39", () => {
    const career = startClassicCareer({
      identity: {
        lastName: "基线",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "issue-23:ordinary-timeline",
    });

    const view = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: 0,
    });

    expect(view.timeline).toHaveLength(24);
    expect(view.timeline[0]).toEqual({
      age: 16,
      kind: "current",
    });
    expect(view.timeline.at(-1)).toEqual({
      age: 39,
      kind: "empty",
    });
  });

  it.each([40, 41, 43] as const)(
    "extends the timeline through a current decision at age %i",
    (age) => {
      const fixture = CLASSIC_GOLDEN_FIXTURES.find(
        (candidate) =>
          candidate.expected.finalAge === age &&
          candidate.choices.at(-1)?.decisionType ===
            "no_offers_retirement",
      );

      if (fixture === undefined) {
        throw new Error(`Missing age-${age} golden fixture`);
      }

      const career = replayClassicCareer({
        choices: fixture.choices.slice(0, -1),
        contentVersion: fixture.contentVersion,
        identity: fixture.identity,
        mode: fixture.mode,
        seed: fixture.seed,
      });
      const view = createCareerPresentation({
        career,
        isRevealing: false,
        visibleSeasonCount: career.seasons.length,
      });

      expect(career.currentDecision?.age).toBe(age);
      expect(view.timeline).toHaveLength(age - 16 + 1);
      expect(view.timeline.at(-1)).toEqual({
        age,
        kind: "current",
      });
    },
  );

  it.each(["ST", "GK"] as const)(
    "exposes reveal-safe contract economy facts for a %s career",
    (position) => {
      const initial = startClassicCareer({
        identity: {
          lastName: "经济",
          nationalityFifaCode: "CHN",
          position,
          preferredNumber: position === "GK" ? 1 : 9,
        },
        mode: "normal",
        seed: `issue-18:career-economy:${position}`,
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
      const projection =
        createCareerEconomyProjection(committed);
      const firstSalary = projection.seasonSalaries[0];
      const firstSeason = committed.seasons[0];

      if (
        firstSalary === undefined ||
        firstSeason === undefined
      ) {
        throw new Error("Expected a settled first season");
      }

      const partial = createCareerPresentation({
        career: committed,
        isRevealing: true,
        visibleSeasonCount: 1,
      });
      const firstRow = partial.timeline.find(
        (row) =>
          row.kind === "season" &&
          row.age === firstSeason.age,
      );

      expect(partial.economy).toEqual({
        annualSalary: firstSalary.annualSalary,
        totalIncome: firstSalary.income,
      });
      expect(firstRow).toMatchObject({
        economy: {
          annualSalary: firstSalary.annualSalary,
          income: firstSalary.income,
        },
        marketValue: firstSeason.marketValue,
      });

      const complete = createCareerPresentation({
        career: committed,
        isRevealing: false,
        visibleSeasonCount: committed.seasons.length,
      });

      expect(complete.economy).toEqual({
        annualSalary:
          projection.currentContract?.annualSalary ?? null,
        totalIncome: projection.totalIncome,
      });
    },
  );

  it("derives one replay-stable choice story for the first revealed season", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "故事",
        nationalityFifaCode: "ENG",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "golden:special:loan-heavy:0",
    });
    const decision = initial.currentDecision!;
    const career = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: "join:arsenal",
    });
    const hidden = createCareerPresentation({
      career,
      isRevealing: true,
      visibleSeasonCount: 0,
    });
    const revealed = createCareerPresentation({
      career,
      isRevealing: true,
      visibleSeasonCount: 1,
    });
    const first = revealed.timeline.find(
      (row) => row.kind === "season",
    );
    const complete = createCareerPresentation({
      career: replayClassicCareer({
        choices: career.choiceLog,
        contentVersion: career.contentVersion,
        identity: career.identity,
        mode: career.mode,
        seed: career.seed,
      }),
      isRevealing: false,
      visibleSeasonCount: career.seasons.length,
    });
    const reloadedFirst = complete.timeline.find(
      (row) => row.kind === "season",
    );
    const reloadedSecond = complete.timeline.find(
      (row) =>
        row.kind === "season" && row.age === 17,
    );

    expect(
      hidden.timeline.filter((row) => row.kind === "season"),
    ).toHaveLength(0);
    expect(first).toMatchObject({
      story: {
        choiceLabel: "加盟 阿森纳",
        contractSummary: "实际合同：新合同生效 · 年薪 ¥20,000",
        decisionTitle: "青训报价",
        outcome: null,
      },
    });
    expect(reloadedSecond).toMatchObject({
      story: null,
    });
    expect(reloadedFirst).toMatchObject({
      story: first?.kind === "season" ? first.story : null,
    });
  });

  it("keeps a declined loan offer on the existing contract", () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "matrix-long-attacker-high",
    );

    if (fixture === undefined) {
      throw new Error("Missing declined-loan fixture");
    }

    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, 3),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const row = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: career.seasons.length,
    }).timeline.find(
      (candidate) =>
        candidate.kind === "season" && candidate.age === 18,
    );

    expect(row).toMatchObject({
      story: {
        choiceLabel: "留在 埃尔切",
        contractSummary: expect.stringMatching(
          /^实际合同：合同不变 · 年薪 /,
        ),
      },
    });
  });

  it("replaces an estimated event quote with the actual yearly outcome and contract", () => {
    const fixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "special-journeyman",
    );

    if (fixture === undefined) {
      throw new Error("Missing event-transfer fixture");
    }

    const choiceIndex = fixture.choices.findIndex(
      ({ optionId }) => optionId === "join:eibar",
    );
    const before = replayClassicCareer({
      choices: fixture.choices.slice(0, choiceIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const choice = fixture.choices[choiceIndex]!;
    const preview = createCareerPresentation({
      career: before,
      isRevealing: false,
      visibleSeasonCount: before.seasons.length,
    });
    const estimated =
      preview.panel.kind === "decision"
        ? preview.panel.options.find(
            (option) => option.id === choice.optionId,
          )
        : undefined;
    const transition = applyClassicChoiceWithResult(
      before,
      choice,
    );
    const firstSeasonIndex = before.seasons.length;
    const firstSeason =
      transition.career.seasons[firstSeasonIndex]!;
    const result = createEventResultReveal(transition.result);
    const hidden = createCareerPresentation({
      career: transition.career,
      isRevealing: true,
      visibleSeasonCount: firstSeasonIndex,
    });
    const revealed = createCareerPresentation({
      career: transition.career,
      isRevealing: true,
      visibleSeasonCount: firstSeasonIndex + 1,
    });
    const row = revealed.timeline.find(
      (candidate) =>
        candidate.kind === "season" &&
        candidate.age === firstSeason.age,
    );

    expect(estimated?.contract).toMatchObject({
      certainty: "estimated",
    });
    expect(result).not.toBeNull();
    expect(
      hidden.timeline.some(
        (candidate) =>
          candidate.kind === "season" &&
          candidate.age === firstSeason.age,
      ),
    ).toBe(false);
    expect(row).toMatchObject({
      story: {
        choiceLabel: "加盟 埃瓦尔",
        contractSummary: `实际合同：新合同生效 · 年薪 ${
          row?.kind === "season" && row.economy !== null
            ? formatYuan(row.economy.annualSalary)
            : ""
        }`,
        outcome: {
          summary: result?.summary,
          title: result?.title,
          tone: result?.tone,
        },
      },
    });
    expect(
      row?.kind === "season"
        ? row.story?.contractSummary
        : null,
    ).not.toContain("预计");
  });

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
      revealBaselineCareer: initial,
      visibleSeasonCount: 0,
    });

    expect(immediate.header).toMatchObject({
      age: initial.playerAge,
      club: null,
      marketValue: initial.marketValue,
      overall: initial.overall,
    });
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
      consequences: [
        {
          probability: expected.positiveProbability,
          probabilityLabel: `${Math.round(expected.positiveProbability * 100)}%`,
          semanticLabel: "正向",
          text: "成为绝对主力",
          tone: "positive",
        },
        {
          probability: expected.negativeProbability,
          probabilityLabel: `${Math.round(expected.negativeProbability * 100)}%`,
          semanticLabel: "风险",
          text: "降为替补",
          tone: "negative",
        },
      ],
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

  it("builds five scan layers for an exact academy contract and a retained loan contract", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "合同",
        nationalityFifaCode: "ENG",
        position: "ST",
        preferredNumber: 19,
      },
      mode: "normal",
      seed: "golden:special:loan-heavy:0",
    });
    const academyView = createCareerPresentation({
      career: initial,
      isRevealing: false,
      visibleSeasonCount: 0,
    });

    if (academyView.panel.kind !== "decision") {
      throw new Error("Expected academy decision");
    }

    const arsenal = academyView.panel.options.find(
      (option) => option.id === "join:arsenal",
    );
    expect(arsenal).toMatchObject({
      club: {
        id: "arsenal",
        subtitle: "英超",
      },
      consequences: [],
      contract: {
        annualSalary: 20_000,
        certainty: "exact",
        kind: "new_contract",
        label: "年薪 ¥20,000",
        tone: "positive",
      },
      honorOpportunities: [
        "联赛",
        "国内杯赛",
        "洲际赛事",
      ],
      role: expect.any(String),
      stars: expect.stringMatching(/^(★+|—)$/),
      title: "加盟 阿森纳",
    });

    const academyDecision = initial.currentDecision!;
    const signed = applyClassicChoice(initial, {
      decisionId: academyDecision.id,
      decisionType: academyDecision.type,
      optionId: "join:arsenal",
    });
    const loanView = createCareerPresentation({
      career: signed,
      isRevealing: false,
      visibleSeasonCount: signed.seasons.length,
    });

    if (loanView.panel.kind !== "decision") {
      throw new Error("Expected loan decision");
    }

    expect(
      loanView.panel.options.find(
        (option) => option.id === "loan:qpr",
      ),
    ).toMatchObject({
      club: { id: "qpr" },
      contract: {
        annualSalary: 20_000,
        kind: "contract_unchanged",
        label: "母队合同不变 · 年薪 ¥20,000",
        reason: "loan",
        tone: "neutral",
      },
      title: "租借去 女王公园巡游者",
    });
  });

  it("labels event-dependent salary as estimated and retirement as no contract", () => {
    const eventFixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "special-journeyman",
    );
    const retirementFixture = CLASSIC_GOLDEN_FIXTURES.find(
      ({ id }) => id === "matrix-long-attacker-high",
    );

    if (
      eventFixture === undefined ||
      retirementFixture === undefined
    ) {
      throw new Error("Missing economy decision fixtures");
    }

    const eventIndex = eventFixture.choices.findIndex(
      ({ optionId }) => optionId === "join:eibar",
    );
    const eventCareer = replayClassicCareer({
      choices: eventFixture.choices.slice(0, eventIndex),
      contentVersion: eventFixture.contentVersion,
      identity: eventFixture.identity,
      mode: eventFixture.mode,
      seed: eventFixture.seed,
    });
    const eventView = createCareerPresentation({
      career: eventCareer,
      isRevealing: false,
      visibleSeasonCount: eventCareer.seasons.length,
    });

    expect(eventView.panel).toMatchObject({
      kind: "decision",
      options: expect.arrayContaining([
        expect.objectContaining({
          club: expect.objectContaining({ id: "eibar" }),
          contract: expect.objectContaining({
            certainty: "estimated",
            kind: "new_contract",
            label: expect.stringMatching(
              /^预计年薪 ¥[\d,]+$/,
            ),
            tone: "positive",
          }),
          honorOpportunities: expect.arrayContaining([
            "联赛/升级",
            "国内杯赛",
          ]),
        }),
      ]),
    });

    const retirementCareer = replayClassicCareer({
      choices: retirementFixture.choices.slice(0, -1),
      contentVersion: retirementFixture.contentVersion,
      identity: retirementFixture.identity,
      mode: retirementFixture.mode,
      seed: retirementFixture.seed,
    });
    const retirementView = createCareerPresentation({
      career: retirementCareer,
      isRevealing: false,
      visibleSeasonCount:
        retirementCareer.seasons.length,
    });

    expect(retirementView.panel).toMatchObject({
      kind: "decision",
      options: expect.arrayContaining([
        expect.objectContaining({
          contract: {
            kind: "no_contract",
            label: "退役后停止收入",
            reason: "retire",
            tone: "warning",
          },
          id: "retire",
        }),
      ]),
    });
  });

  it("projects the committed event result and milestone queue without re-resolving either", () => {
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
    const before = replayClassicCareer({
      choices: fixture.choices.slice(0, eventChoiceIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const choice = fixture.choices[eventChoiceIndex];

    if (choice === undefined) {
      throw new Error("Missing season-load choice");
    }

    const resolved = applyClassicChoiceWithResult(before, {
      ...choice,
      forcedOutcome: "positive",
    });
    const contractResult =
      createCareerEconomyChoiceResult(before, resolved);
    const seasonIndex = before.seasons.length;
    const season = resolved.career.seasons[seasonIndex]!;
    const career = {
      ...resolved.career,
      seasons: resolved.career.seasons.map((candidate, index) =>
        index === seasonIndex
          ? {
              ...candidate,
              awards: ["golden_boot" as const],
              trophies: [
                ...candidate.trophies,
                "league" as const,
              ],
            }
          : candidate,
      ),
    };
    const eventView = createCareerPresentation({
      activeRevealItem: {
        contractResult,
        dwellMs: 1_600,
        kind: "event_result",
        result: resolved.result,
      },
      career,
      isRevealing: true,
      recentEventContractResult: contractResult,
      recentEventResult: resolved.result,
      visibleSeasonCount: career.seasons.length,
    });

    expect(eventView.panel).toMatchObject({
      age: before.currentDecision?.age,
      choiceLabel: "接受双倍训练",
      kind: "event_result",
      summary: "成为绝对主力",
      title: "双倍训练结果",
      tone: "positive",
    });
    expect(eventView.recentEventResult).toBeNull();

    const milestoneView = createCareerPresentation({
      activeRevealItem: {
        dwellMs: 1_700,
        kind: "milestone",
        seasonIndex,
      },
      career,
      isRevealing: true,
      recentEventContractResult: contractResult,
      recentEventResult: resolved.result,
      visibleSeasonCount: career.seasons.length,
    });

    expect(milestoneView.panel).toMatchObject({
      age: season.age,
      honors: expect.arrayContaining([
        expect.objectContaining({
          kind: "trophy",
          label: "联赛冠军",
          trophy: "league",
        }),
        expect.objectContaining({
          award: "golden_boot",
          kind: "award",
          label: "金靴奖",
        }),
      ]),
      kind: "milestone",
      title: "赛季里程碑",
    });

    const immediateView = createCareerPresentation({
      activeRevealItem: null,
      career,
      isRevealing: false,
      recentEventContractResult: contractResult,
      recentEventResult: resolved.result,
      visibleSeasonCount: career.seasons.length,
    });

    expect(immediateView.panel.kind).toBe("decision");
    expect(immediateView.recentEventResult).toMatchObject({
      summary: "成为绝对主力",
      title: "双倍训练结果",
      tone: "positive",
    });
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
          tone: "negative",
        },
      ],
      tierChange: null,
    });
    expect(statusRows[1]).toMatchObject({
      statuses: [
        {
          kind: "suspension",
          label: "停赛",
          tone: "warning",
        },
      ],
      tierChange: {
        from: 1,
        label: "进入次级联赛",
        to: 2,
        tone: "negative",
      },
    });

    const promotionCareer = {
      ...statusCareer,
      seasons: [
        {
          ...statusCareer.seasons[0]!,
          competitionTier: 2 as const,
          relegated: false,
        },
        {
          ...statusCareer.seasons[1]!,
          competitionTier: 1 as const,
          suspended: false,
        },
      ],
    };
    const promotionRow = createCareerPresentation({
      career: promotionCareer,
      isRevealing: true,
      visibleSeasonCount: 2,
    }).timeline.find(
      (row) => row.kind === "season" && row.age === second.age,
    );

    expect(promotionRow).toMatchObject({
      tierChange: {
        from: 2,
        label: "进入顶级联赛",
        to: 1,
        tone: "positive",
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
