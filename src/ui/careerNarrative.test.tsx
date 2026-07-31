import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  applyClassicChoice,
  applyClassicChoiceWithResult,
  replayClassicCareer,
  startClassicCareer,
} from "../domain/classicEngine";
import { createCareerEconomyChoiceResult } from "../domain/economy/careerEconomyProjection";
import { CLASSIC_GOLDEN_FIXTURES } from "../../tests/golden/fixtures";
import { CareerScreen } from "./classic/CareerScreen";
import { createCareerPresentation } from "./classic/careerPresentation";
import { EnhancedCareerScreen } from "./enhanced/career/EnhancedCareerScreen";

const SEASON_LABELS = [
  "联赛冠军",
  "国内杯赛冠军",
  "世界杯冠军",
  "金靴奖",
  "世界杯 · 冠军",
  "洲际国家队赛事 · 未入选",
  "降入次级联赛",
  "停赛",
  "进入次级联赛",
] as const;

afterEach(cleanup);

describe("complete career narrative rendering", () => {
  it.each(["ST", "GK"] as const)(
    "preserves the visible Classic economy facts for a %s career",
    (position) => {
      const view = committedEconomyView(position);
      const season = view.timeline.find(
        (row) => row.kind === "season",
      );

      if (
        view.economy === null ||
        season?.kind !== "season" ||
        season.economy === null
      ) {
        throw new Error("Expected presented economy facts");
      }

      const rendered = render(
        <CareerScreen onChoose={vi.fn()} view={view} />,
      );
      const header =
        rendered.container.querySelector<HTMLElement>(
          "[data-classic-career-header]",
        );
      const seasonRow =
        rendered.container.querySelector<HTMLElement>(
          `[data-career-season-row="${season.age}"]`,
        );

      if (header === null || seasonRow === null) {
        throw new Error("Expected career economy surfaces");
      }

      const headerView = within(header);
      expect(headerView.getByText("身价")).toBeVisible();
      expect(headerView.getByText("年薪")).toBeVisible();
      expect(headerView.getByText("总收入")).toBeVisible();
      expect(
        metricView(header, "年薪").getByText(
          formatYuan(view.economy.annualSalary),
        ),
      ).toBeVisible();
      expect(
        metricView(header, "总收入").getByText(
          formatYuan(view.economy.totalIncome),
        ),
      ).toBeVisible();

      const seasonView = within(seasonRow);
      expect(seasonView.getByText("身价")).toBeVisible();
      expect(seasonView.getByText("年薪")).toBeVisible();
      expect(seasonView.getByText("收入")).toBeVisible();
      expect(
        metricView(seasonRow, "年薪").getByText(
          formatYuan(season.economy.annualSalary),
        ),
      ).toBeVisible();
      expect(
        metricView(seasonRow, "收入").getByText(
          formatYuan(season.economy.income),
        ),
      ).toBeVisible();

      rendered.unmount();
    },
  );

  it.each(["ST", "GK"] as const)(
    "keeps Enhanced market value and salary scannable while disclosing income and season story for a %s career",
    (position) => {
      const view = committedEconomyView(position);
      const season = view.timeline.find(
        (row) => row.kind === "season",
      );

      if (
        view.economy === null ||
        season?.kind !== "season" ||
        season.economy === null
      ) {
        throw new Error("Expected presented economy facts");
      }

      const rendered = render(
        <EnhancedCareerScreen onChoose={vi.fn()} view={view} />,
      );
      const header = rendered.container.querySelector<HTMLElement>(
        "[data-enhanced-career-header]",
      );
      const seasonRow = rendered.container.querySelector<HTMLElement>(
        `[data-career-season-row="${season.age}"]`,
      );

      if (header === null || seasonRow === null) {
        throw new Error("Expected Enhanced economy surfaces");
      }

      expect(
        within(header).getByLabelText(
          `身价：€${view.header.marketValue.toLocaleString("en-US")}`,
        ),
      ).toBeVisible();
      expect(
        within(header).getByLabelText(
          `年薪：${formatYuan(view.economy.annualSalary)}`,
        ),
      ).toBeVisible();
      const careerDetails = header.querySelector(
        "[data-enhanced-career-economy-details]",
      );

      if (!(careerDetails instanceof HTMLDetailsElement)) {
        throw new Error("Expected career economy disclosure");
      }

      expect(
        within(careerDetails).getByText("累计收入"),
      ).not.toBeVisible();
      fireEvent.click(within(careerDetails).getByText("生涯收入与明细"));
      expect(
        within(careerDetails).getByLabelText(
          `累计收入：${formatYuan(view.economy.totalIncome)}`,
        ),
      ).toBeVisible();

      if (!(seasonRow instanceof HTMLDetailsElement)) {
        throw new Error("Expected collapsed season summary");
      }

      expect(seasonRow).not.toHaveAttribute("open");
      fireEvent.click(seasonRow.querySelector("summary")!);
      expect(
        within(seasonRow).getByLabelText(
          `身价：€${season.marketValue.toLocaleString("en-US")}`,
        ),
      ).toBeVisible();
      expect(
        within(seasonRow).getByLabelText(
          `年薪：${formatYuan(season.economy.annualSalary)}`,
        ),
      ).toBeVisible();
      const seasonDetails = seasonRow.querySelector(
        "[data-enhanced-season-details]",
      );

      if (!(seasonDetails instanceof HTMLDetailsElement)) {
        throw new Error("Expected season detail disclosure");
      }

      expect(
        within(seasonDetails).getByText("收入"),
      ).not.toBeVisible();
      fireEvent.click(
        within(seasonDetails).getByText("收入与赛季故事"),
      );
      expect(
        within(seasonDetails).getByLabelText(
          `收入：${formatYuan(season.economy.income)}`,
        ),
      ).toBeVisible();

      rendered.unmount();
    },
  );

  it("renders the persisted yearly choice story only inside Enhanced season detail", () => {
    const view = committedEconomyView("ST");
    const enhanced = render(
      <EnhancedCareerScreen onChoose={vi.fn()} view={view} />,
    );
    const season = enhanced.container.querySelector(
      'details[data-enhanced-season-row="season"]',
    );

    if (!(season instanceof HTMLDetailsElement)) {
      throw new Error("Expected a completed season");
    }

    fireEvent.click(season.querySelector("summary")!);
    fireEvent.click(
      season.querySelector(
        "[data-enhanced-season-details] > summary",
      )!,
    );
    const story = season.querySelector<HTMLElement>(
      "[data-enhanced-season-choice-story]",
    );

    expect(story).not.toBeNull();
    expect(within(story!).getByText("年度选择")).toBeVisible();
    expect(
      within(story!).getByText(/^实际合同：/),
    ).toBeVisible();

    enhanced.unmount();
    const classic = render(
      <CareerScreen onChoose={vi.fn()} view={view} />,
    );

    expect(
      classic.container.querySelector(
        "[data-enhanced-season-choice-story]",
      ),
    ).toBeNull();
  });

  it.each(["classic", "enhanced"] as const)(
    "renders the five-layer contract choice card in %s",
    (variant) => {
      const view = academyEconomyView();
      const arsenal =
        view.panel.kind === "decision"
          ? view.panel.options.find(
              (option) => option.id === "join:arsenal",
            )
          : undefined;

      if (arsenal === undefined) {
        throw new Error("Expected Arsenal academy offer");
      }

      const rendered =
        variant === "classic"
          ? render(
              <CareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            )
          : render(
              <EnhancedCareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            );
      const option = screen.getByRole("button", {
        name: /加盟 阿森纳/,
      });
      const cardRoot =
        variant === "enhanced"
          ? option.closest("[data-enhanced-decision-card]")
          : option;

      if (!(cardRoot instanceof HTMLElement)) {
        throw new Error("Expected decision card");
      }

      const card = within(cardRoot);

      expect(card.getByText("英超")).toBeVisible();
      expect(card.getByText(arsenal.role)).toBeVisible();
      expect(card.getByText(arsenal.stars)).toBeVisible();

      if (variant === "enhanced") {
        expect(
          card.getByText("年薪 ¥20,000"),
        ).not.toBeVisible();
        fireEvent.click(card.getByText("合同与完整故事"));
      }

      expect(
        card.getByText("年薪 ¥20,000"),
      ).toBeVisible();
      expect(
        card.getByText(
          "荣誉机会：联赛 · 国内杯赛 · 洲际赛事",
        ),
      ).toBeVisible();
      expect(
        card.getByText("年薪 ¥20,000").closest(
          "[data-semantic-tone]",
        ),
      ).toHaveAttribute("data-semantic-tone", "positive");

      rendered.unmount();
    },
  );

  it.each(["classic", "enhanced"] as const)(
    "renders explicit consequence semantics and no-contract nodes in %s",
    (variant) => {
      const eventView = eventEconomyView();
      const rendered =
        variant === "classic"
          ? render(
              <CareerScreen
                onChoose={vi.fn()}
                view={eventView}
              />,
            )
          : render(
              <EnhancedCareerScreen
                onChoose={vi.fn()}
                view={eventView}
              />,
            );
      const option = screen.getByRole("button", {
        name: /接受双倍训练|承担更多负荷/,
      });
      const cardRoot =
        variant === "enhanced"
          ? option.closest("[data-enhanced-decision-card]")
          : option;

      if (!(cardRoot instanceof HTMLElement)) {
        throw new Error("Expected event decision card");
      }

      const card = within(cardRoot);

      if (variant === "enhanced") {
        expect(card.getByText(/^正向 · \d+%$/)).not.toBeVisible();
        fireEvent.click(card.getByText("合同与完整故事"));
      }

      expect(
        card.getByText(/^正向 · \d+%$/),
      ).toBeVisible();
      expect(
        card.getByText(/^风险 · \d+%$/),
      ).toBeVisible();
      expect(card.getByText("成为绝对主力")).toBeVisible();
      expect(card.getByText("降为替补")).toBeVisible();
      expect(
        card.getByText(/^合同不变 · 年薪 ¥[\d,]+$/),
      ).toBeVisible();

      rendered.unmount();

      const retirementView = retirementEconomyView();
      if (variant === "classic") {
        render(
          <CareerScreen
            onChoose={vi.fn()}
            view={retirementView}
          />,
        );
      } else {
        render(
          <EnhancedCareerScreen
            onChoose={vi.fn()}
            view={retirementView}
          />,
        );
      }

      const retireButton = screen.getByRole("button", {
        name: /现在退役/,
      });
      const retireRoot =
        variant === "enhanced"
          ? retireButton.closest("[data-enhanced-decision-card]")
          : retireButton;

      if (!(retireRoot instanceof HTMLElement)) {
        throw new Error("Expected retirement card");
      }

      const retireCard = within(retireRoot);

      if (variant === "enhanced") {
        fireEvent.click(
          retireCard.getByText("合同与完整故事"),
        );
      }

      const noContract = retireCard.getByText("退役后停止收入");
      expect(noContract).toBeVisible();
      expect(
        noContract.closest("[data-semantic-tone]"),
      ).toHaveAttribute("data-semantic-tone", "warning");
    },
  );

  it.each(["classic", "enhanced"] as const)(
    "keeps a club subtitle and its event consequence visible in %s",
    (variant) => {
      const view = rivalOfferEconomyView();
      const rivalOffer =
        view.panel.kind === "decision"
          ? view.panel.options.find(
              (option) =>
                option.id === "event:rival_offer:accept",
            )
          : undefined;

      if (
        rivalOffer === undefined ||
        rivalOffer.club === null
      ) {
        throw new Error("Expected rival club offer");
      }

      const rendered =
        variant === "classic"
          ? render(
              <CareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            )
          : render(
              <EnhancedCareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            );
      const optionButton = screen.getByRole("button", {
        name: new RegExp(rivalOffer.title),
      });
      const optionRoot =
        variant === "enhanced"
          ? optionButton.closest("[data-enhanced-decision-card]")
          : optionButton;

      if (!(optionRoot instanceof HTMLElement)) {
        throw new Error("Expected rival decision card");
      }

      const option = within(optionRoot);

      if (variant === "enhanced") {
        expect(
          option.getByText(
            "加盟报价俱乐部，角色按新环境结算",
          ),
        ).not.toBeVisible();
        fireEvent.click(option.getByText("合同与完整故事"));
      }

      expect(
        option.getByText(rivalOffer.club.subtitle),
      ).toBeVisible();
      expect(
        option.getByText(
          "加盟报价俱乐部，角色按新环境结算",
        ),
      ).toBeVisible();
      expect(option.getByText("中性")).toBeVisible();
      expect(
        option.getByText(/^预计年薪 ¥[\d,]+$/),
      ).toBeVisible();

      rendered.unmount();
    },
  );

  it.each(["classic", "enhanced"] as const)(
    "renders the exact committed contract in the %s actual-result reveal",
    (variant) => {
      const view = eventTransferActualView();
      const rendered =
        variant === "classic"
          ? render(
              <CareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            )
          : render(
              <EnhancedCareerScreen
                onChoose={vi.fn()}
                view={view}
              />,
            );

      const actualContract =
        rendered.container.querySelector(
          "[data-career-event-contract-result]",
        );

      expect(actualContract).toBeVisible();
      expect(actualContract).toHaveTextContent(
        /^实际合同：新合同生效 · 年薪 ¥[\d,]+$/,
      );
      rendered.unmount();
    },
  );

  it("keeps the selected event card beside its actual result", () => {
    const decision = eventTransferDecisionView();
    const result = eventTransferActualView();

    if (
      decision.panel.kind !== "decision" ||
      result.panel.kind !== "event_result"
    ) {
      throw new Error("Expected event decision and result views");
    }

    const rendered = render(
      <EnhancedCareerScreen
        onChoose={() => true}
        view={decision}
      />,
    );
    const selected = screen.getByRole("button", {
      name: /加盟 埃瓦尔/,
    });

    fireEvent.click(selected);
    rendered.rerender(
      <EnhancedCareerScreen
        onChoose={() => true}
        view={result}
      />,
    );

    const rail = rendered.container.querySelector(
      "[data-enhanced-decision-rail]",
    );

    expect(
      within(rail as HTMLElement).getByRole("button", {
        name: /加盟 埃瓦尔/,
        pressed: true,
      }),
    ).toBeDisabled();
    expect(
      within(rail as HTMLElement).getByRole("heading", {
        name: result.panel.title,
      }),
    ).toBeVisible();
  });

  it("shows identical season honors and statuses in Classic and Enhanced", () => {
    const view = completeNarrativeView();
    const classic = render(
      <CareerScreen onChoose={vi.fn()} view={view} />,
    );

    for (const label of SEASON_LABELS) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(
      classic.container.querySelectorAll(
        '[data-honor-art="local-svg"]',
      ),
    ).toHaveLength(4);

    classic.unmount();
    const enhanced = render(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        view={view}
      />,
    );

    for (const label of SEASON_LABELS) {
      expect(screen.getByText(label)).not.toBeVisible();
    }
    for (const season of enhanced.container.querySelectorAll(
      'details[data-enhanced-season-row="season"]',
    )) {
      fireEvent.click(season.querySelector("summary")!);
    }
    for (const details of enhanced.container.querySelectorAll(
      "[data-enhanced-season-details]",
    )) {
      const summary = details.querySelector("summary");

      if (summary === null) {
        throw new Error("Expected season details summary");
      }

      fireEvent.click(summary);
    }
    for (const label of SEASON_LABELS) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(
      enhanced.container.querySelectorAll(
        '[data-honor-art="local-svg"]',
      ),
    ).toHaveLength(4);
  });

  it("maps structured suspension, relegation, and tier-change tones without reading labels", () => {
    const rendered = render(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        view={completeNarrativeView()}
      />,
    );

    for (const details of rendered.container.querySelectorAll(
      "[data-enhanced-season-details]",
    )) {
      const summary = details.querySelector("summary");
      if (summary !== null) {
        fireEvent.click(summary);
      }
    }

    expect(
      screen
        .getByText("停赛")
        .closest("[data-semantic-tone]"),
    ).toHaveAttribute("data-semantic-tone", "warning");
    expect(
      screen
        .getByText("降入次级联赛")
        .closest("[data-semantic-tone]"),
    ).toHaveAttribute("data-semantic-tone", "negative");
    expect(
      screen
        .getByText("进入次级联赛")
        .closest("[data-semantic-tone]"),
    ).toHaveAttribute("data-semantic-tone", "negative");
  });

  it("renders the same milestone hold with mode-specific motion", async () => {
    const view = completeNarrativeView({
      dwellMs: 1_700,
      kind: "milestone",
      seasonIndex: 0,
    });
    const classic = render(
      <CareerScreen onChoose={vi.fn()} view={view} />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "赛季里程碑",
      }),
    ).toBeVisible();
    expect(
      classic.container.querySelector(
        "[data-classic-milestone-reveal]",
      ),
    ).toHaveClass("animate-rise");

    classic.unmount();
    const enhanced = render(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        view={view}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "16 岁赛季里程碑",
      }),
    ).toBeVisible();
    expect(
      enhanced.container.querySelector(
        "[data-enhanced-milestone-reveal]",
      ),
    ).toHaveClass("enhanced-reveal-enter");
  });

  it.each(["classic", "enhanced"] as const)(
    "restores focus to the next %s decision after result, season, and milestone holds",
    (variant) => {
      const decision = academyEconomyView();
      const renderScreen = (
        view: ReturnType<typeof academyEconomyView>,
      ) =>
        variant === "classic" ? (
          <CareerScreen
            onChoose={vi.fn()}
            view={view}
          />
        ) : (
          <EnhancedCareerScreen
            onChoose={vi.fn()}
            view={view}
          />
        );
      const rendered = render(renderScreen(decision));
      const chosen = screen.getByRole("button", {
        name: /加盟 阿森纳/,
      });

      chosen.focus();
      expect(chosen).toHaveFocus();

      rendered.rerender(
        renderScreen(eventTransferActualView()),
      );
      rendered.rerender(
        renderScreen(
          completeNarrativeView({
            dwellMs: 1_700,
            kind: "milestone",
            seasonIndex: 0,
          }),
        ),
      );
      rendered.rerender(renderScreen(decision));

      expect(
        rendered.container.querySelector(
          "[data-career-decision-option]",
        ),
      ).toHaveFocus();
    },
  );

  it.each(["classic", "enhanced"] as const)(
    "restores focus to the next %s decision when reduced motion skips holds",
    (variant) => {
      const initial = academyEconomyView();
      const next = committedEconomyView("ST");
      const renderScreen = (
        view: ReturnType<typeof academyEconomyView>,
      ) =>
        variant === "classic" ? (
          <CareerScreen
            onChoose={vi.fn()}
            view={view}
          />
        ) : (
          <EnhancedCareerScreen
            onChoose={vi.fn()}
            view={view}
          />
        );
      const rendered = render(renderScreen(initial));
      const chosen = screen.getByRole("button", {
        name: /加盟 阿森纳/,
      });

      chosen.focus();
      rendered.rerender(renderScreen(next));

      expect(
        screen.getAllByRole("button")[0],
      ).toHaveFocus();
    },
  );
});

function academyEconomyView() {
  const career = startClassicCareer({
    identity: {
      lastName: "合同",
      nationalityFifaCode: "ENG",
      position: "ST",
      preferredNumber: 19,
    },
    mode: "normal",
    seed: "golden:special:loan-heavy:0",
  });

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: 0,
  });
}

function committedEconomyView(position: "GK" | "ST") {
  const initial = startClassicCareer({
    identity: {
      lastName: "经济",
      nationalityFifaCode: "CHN",
      position,
      preferredNumber: position === "GK" ? 1 : 9,
    },
    mode: "normal",
    seed: `issue-18:career-economy-ui:${position}`,
  });
  const decision = initial.currentDecision;

  if (decision === null) {
    throw new Error("Expected an academy decision");
  }

  const career = applyClassicChoice(initial, {
    decisionId: decision.id,
    decisionType: decision.type,
    optionId: decision.options[0]!.id,
  });

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: career.seasons.length,
  });
}

function formatYuan(value: number | null): string {
  if (value === null) {
    return "暂无合同";
  }

  return `¥${value.toLocaleString("en-US")}`;
}

function metricView(root: HTMLElement, label: string) {
  const metric = within(root).getByText(label).parentElement;

  if (metric === null) {
    throw new Error(`Expected ${label} metric`);
  }

  return within(metric);
}

function eventEconomyView() {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "matrix-long-support-high",
  );

  if (fixture === undefined) {
    throw new Error("Missing season-load fixture");
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

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: career.seasons.length,
  });
}

function retirementEconomyView() {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "matrix-long-attacker-high",
  );

  if (fixture === undefined) {
    throw new Error("Missing retirement fixture");
  }

  const career = replayClassicCareer({
    choices: fixture.choices.slice(0, -1),
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: career.seasons.length,
  });
}

function eventTransferActualView() {
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
  const choice = fixture.choices[choiceIndex];

  if (choice === undefined) {
    throw new Error("Missing event-transfer choice");
  }

  const transition = applyClassicChoiceWithResult(
    before,
    choice,
  );

  return createCareerPresentation({
    activeRevealItem: {
      contractResult: createCareerEconomyChoiceResult(
        before,
        transition,
      ),
      dwellMs: 1_600,
      kind: "event_result",
      result: transition.result,
    },
    career: transition.career,
    isRevealing: true,
    visibleSeasonCount: transition.career.seasons.length,
  });
}

function eventTransferDecisionView() {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "special-journeyman",
  );

  if (fixture === undefined) {
    throw new Error("Missing event-transfer fixture");
  }

  const choiceIndex = fixture.choices.findIndex(
    ({ optionId }) => optionId === "join:eibar",
  );
  const career = replayClassicCareer({
    choices: fixture.choices.slice(0, choiceIndex),
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: career.seasons.length,
  });
}

function rivalOfferEconomyView() {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    ({ id }) => id === "special-suspension-redemption",
  );

  if (fixture === undefined) {
    throw new Error("Missing rival-offer fixture");
  }

  const choiceIndex = fixture.choices.findIndex(
    ({ optionId }) =>
      optionId === "event:rival_offer:accept",
  );
  const career = replayClassicCareer({
    choices: fixture.choices.slice(0, choiceIndex),
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: career.seasons.length,
  });
}

function completeNarrativeView(
  activeRevealItem:
    | {
        readonly dwellMs: number;
        readonly kind: "milestone";
        readonly seasonIndex: number;
      }
    | undefined = undefined,
) {
  const initial = startClassicCareer({
    identity: {
      lastName: "叙事",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed: "issue-14:renderer-narrative",
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
  const first = committed.seasons[0]!;
  const second = committed.seasons[1]!;
  const career = {
    ...committed,
    seasons: [
      {
        ...first,
        awards: ["golden_boot" as const],
        competitionTier: 1 as const,
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
        relegated: true,
        suspended: false,
        trophies: [
          "league" as const,
          "cup" as const,
          "world_cup" as const,
        ],
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

  return createCareerPresentation({
    ...(activeRevealItem === undefined
      ? {}
      : { activeRevealItem }),
    career,
    isRevealing: true,
    visibleSeasonCount: career.seasons.length,
  });
}
