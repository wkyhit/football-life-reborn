import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../../../domain/classicEngine";
import { deriveDailyChallenge } from "../../../features/challenges/daily";
import { evaluateChallengeProgress } from "../../../features/challenges/progress";
import { createCareerPresentation } from "../../classic/careerPresentation";
import { CareerScreen } from "../../classic/CareerScreen";
import { EnhancedCareerScreen } from "./EnhancedCareerScreen";

describe("EnhancedCareerScreen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps primary career facts compact and moves cumulative facts behind one disclosure", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const view = decidingView();

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={view}
        />
      </div>,
    );

    const header = document.querySelector(
      "[data-enhanced-career-header]",
    );
    const primary = document.querySelector(
      "[data-enhanced-primary-career-facts]",
    );
    const secondary = document.querySelector(
      "details[data-enhanced-secondary-career-facts]",
    );

    expect(header).not.toBeNull();
    expect(primary).not.toBeNull();
    expect(within(primary as HTMLElement).getByText("身价")).toBeVisible();
    expect(within(primary as HTMLElement).getByText("年薪")).toBeVisible();
    expect(secondary).not.toHaveAttribute("open");
    expect(
      within(secondary as HTMLElement).getByText("生涯收入与明细"),
    ).toBeVisible();
    expect(within(secondary as HTMLElement).getByText("累计收入")).toBeInTheDocument();
    expect(within(secondary as HTMLElement).getByText("出场")).toBeInTheDocument();
  });

  it("keeps every decision in its own independently scrollable rail", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const view = decidingView();

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={view}
        />
      </div>,
    );

    if (view.panel.kind !== "decision") {
      throw new Error("Expected a decision view");
    }

    const rail = document.querySelector(
      "[data-enhanced-decision-rail]",
    );
    const optionList = document.querySelector(
      "[data-enhanced-decision-options]",
    );

    expect(rail).not.toBeNull();
    expect(optionList).not.toBeNull();
    expect(rail).toContainElement(optionList as HTMLElement);
    expect(
      within(optionList as HTMLElement).getAllByRole("button"),
    ).toHaveLength(view.panel.options.length);
    expect(
      screen.getByRole("heading", { name: view.panel.title }),
    ).toBeVisible();
  });

  it("keeps the workbench viewport-bound with explicit internal scroll regions", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={decidingView()}
        />
      </div>,
    );

    expect(
      document.querySelector("[data-enhanced-career-shell]"),
    ).toHaveAttribute("data-scroll-boundary", "viewport");
    expect(
      document.querySelector("[data-enhanced-timeline]"),
    ).toContainElement(
      document.querySelector(
        '[data-scroll-region="career-timeline"]',
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-enhanced-decision-rail]"),
    ).toHaveAttribute("data-scroll-region", "decision-rail");
  });

  it("keeps timeline chrome outside the independently scrollable year region", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={decidingView()}
        />
      </div>,
    );

    const scroller = screen.getByRole("region", {
      name: "生涯年份",
    });
    const heading = screen.getByRole("heading", {
      name: "生涯时间线",
    });
    const columns = document.querySelector(
      "[data-enhanced-timeline] .enhanced-timeline-grid",
    );
    const currentSeason = document.querySelector(
      '[role="row"][aria-current="step"]',
    );

    expect(columns).not.toBeNull();
    expect(currentSeason).not.toBeNull();
    expect(scroller).not.toContainElement(heading);
    expect(scroller).not.toContainElement(columns as HTMLElement);
    expect(scroller).toContainElement(currentSeason as HTMLElement);
  });

  it.each(["pointer", "Enter"] as const)(
    "suspends timeline follow for deliberate %s history browsing",
    (interaction) => {
      vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
        () => undefined,
      );

      render(
        <div data-enhanced-shell="">
          <EnhancedCareerScreen
            onChoose={() => undefined}
            view={progressedView()}
          />
        </div>,
      );

      const scroller = screen.getByRole("region", {
        name: "生涯年份",
      });

      if (interaction === "pointer") {
        fireEvent.pointerDown(scroller, {
          button: 0,
          pointerType: "mouse",
        });
      } else {
        fireEvent.keyDown(
          scroller.querySelector(
            'details[data-enhanced-season-row="season"] > summary',
          )!,
          { key: "Enter" },
        );
      }

      expect(
        screen.getByRole("button", { name: "回到最新" }),
      ).toBeVisible();
    },
  );

  it("exposes goalkeeper career metrics through a semantic timeline table", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const view = progressedGoalkeeperView();
    const season = view.timeline.find(
      (row) => row.kind === "season",
    );

    if (season?.kind !== "season") {
      throw new Error("Expected a goalkeeper season");
    }

    const rendered = render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={view}
        />
      </div>,
    );
    const table = screen.getByRole("table", {
      name: "生涯赛季数据",
    });
    const semanticRow = table.querySelector(
      `[data-career-season-row="${season.age}"]`,
    );
    const header = document.querySelector(
      "[data-enhanced-career-header]",
    );
    const visualColumns = document.querySelector(
      '[role="table"] > [aria-hidden="true"]',
    );
    const current = view.timeline.find(
      (row) => row.kind === "current",
    );

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "年龄",
      "俱乐部",
      "能力",
      "出场",
      "零封",
      "失球",
    ]);
    expect(within(table).getAllByRole("row")).toHaveLength(
      view.timeline.length + 2,
    );
    expect(within(table).getByRole("rowgroup")).toContainElement(
      semanticRow as HTMLElement,
    );
    expect(
      within(semanticRow as HTMLElement).getByRole("rowheader", {
        name: `${season.age} 岁`,
      }),
    ).toBeInTheDocument();
    expect(
      within(semanticRow as HTMLElement)
        .getAllByRole("cell")
        .map(
          (cell) =>
            cell.getAttribute("aria-label") ?? cell.textContent,
        ),
    ).toEqual([
      season.club.shortName,
      String(season.overall),
      String(season.stats.appearances),
      String(season.stats.cleanSheets),
      String(season.stats.goalsConceded),
    ]);
    if (current === undefined) {
      throw new Error("Expected a current season");
    }
    const currentRow = within(table)
      .getByRole("rowheader", {
        name: `${current.age} 岁`,
      })
      .closest('[role="row"]');

    expect(currentRow).toHaveAttribute("aria-current", "step");
    expect(
      within(currentRow as HTMLElement)
        .getAllByRole("cell")
        .map(
          (cell) =>
            cell.getAttribute("aria-label") ?? cell.textContent,
        ),
    ).toEqual(["决策中", "—", "—", "—", "—"]);
    const details = semanticRow?.querySelector(
      'details[data-enhanced-season-row="season"]',
    );
    const summary = details?.querySelector("summary");

    expect(details).not.toHaveAttribute("role");
    expect(summary).not.toHaveAttribute("role");
    expect(summary).toHaveAccessibleName(
      `${season.age} 岁赛季详情`,
    );
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary!);
    expect(details).toHaveAttribute("open");
    expect(within(header as HTMLElement).getAllByText("零封")).not.toHaveLength(0);
    expect(within(header as HTMLElement).getAllByText("失球")).not.toHaveLength(0);
    expect(visualColumns).toHaveTextContent("零封");
    expect(visualColumns).toHaveTextContent("失球");

    rendered.unmount();
    render(<CareerScreen onChoose={() => undefined} view={view} />);
    const classicHeader = document.querySelector(
      "[data-classic-career-header]",
    );

    expect(
      screen.queryByRole("table", { name: "生涯赛季数据" }),
    ).toBeNull();
    expect(within(classicHeader as HTMLElement).getByText("进球")).toBeVisible();
    expect(within(classicHeader as HTMLElement).getByText("助攻")).toBeVisible();
  });

  it("presents completed seasons as collapsed year summaries", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => undefined}
          view={progressedView()}
        />
      </div>,
    );

    const seasons = [
      ...document.querySelectorAll(
        'details[data-enhanced-season-row="season"]',
      ),
    ];

    expect(seasons.length).toBeGreaterThan(0);
    for (const season of seasons) {
      expect(season).not.toHaveAttribute("open");
      expect(season.querySelector("summary")).not.toBeNull();
      expect(
        season.querySelector("[data-career-season-economy]"),
      ).not.toBeNull();
    }
  });

  it("collapses optional challenge detail inside the mobile rail", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const daily = deriveDailyChallenge({
      calendarDate: "2026-07-31",
      family: "one_club",
      version: 1,
    });
    const career = startCareer(daily.seed);

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          challenge={{
            daily,
            progress: evaluateChallengeProgress(
              daily.family,
              career,
            ),
          }}
          onChoose={() => undefined}
          view={createCareerPresentation({
            career,
            isRevealing: false,
            visibleSeasonCount: 0,
          })}
        />
      </div>,
    );

    const disclosure = document.querySelector(
      "details[data-enhanced-challenge-disclosure]",
    );

    expect(disclosure).not.toHaveAttribute("open");
    expect(
      within(disclosure as HTMLElement).getByText("挑战进度"),
    ).toBeVisible();
    expect(
      within(disclosure as HTMLElement).getByRole("region"),
    ).toBeInTheDocument();
  });

  it("turns repeated pointer, keyboard, or touch activation into one visible choice transaction", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const view = decidingView();
    const onChoose = vi.fn(() => true);

    render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={onChoose}
          view={view}
        />
      </div>,
    );

    if (view.panel.kind !== "decision") {
      throw new Error("Expected a decision view");
    }

    const options = within(
      document.querySelector(
        "[data-enhanced-decision-options]",
      ) as HTMLElement,
    ).getAllByRole("button");

    fireEvent.click(options[0]!, { detail: 1 });
    fireEvent.click(options[1]!, { detail: 0 });
    fireEvent.touchEnd(options[0]!);
    fireEvent.click(options[0]!, { detail: 1 });

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(
      view.panel.decisionId,
      view.panel.options[0]!.id,
    );
    expect(options[0]).toHaveAttribute("aria-pressed", "true");
    expect(options[0]).toBeDisabled();
    expect(options[1]).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      `已选择：${view.panel.options[0]!.title}`,
    );
  });

  it("keeps the receipt perceptible for 150ms when the next decision is immediate", () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(
      () => undefined,
    );
    const career = startCareer("issue-23:receipt-duration");
    const currentView = createCareerPresentation({
      career,
      isRevealing: false,
      visibleSeasonCount: 0,
    });

    if (
      career.currentDecision === null ||
      currentView.panel.kind !== "decision"
    ) {
      throw new Error("Expected an initial decision");
    }

    const nextCareer = applyClassicChoice(career, {
      decisionId: career.currentDecision.id,
      decisionType: career.currentDecision.type,
      optionId: career.currentDecision.options[0]!.id,
    });
    const nextView = createCareerPresentation({
      career: nextCareer,
      isRevealing: false,
      visibleSeasonCount: nextCareer.seasons.length,
    });
    const rendered = render(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => true}
          view={currentView}
        />
      </div>,
    );

    fireEvent.click(
      within(
        document.querySelector(
          "[data-enhanced-decision-options]",
        ) as HTMLElement,
      ).getAllByRole("button")[0]!,
    );
    rendered.rerender(
      <div data-enhanced-shell="">
        <EnhancedCareerScreen
          onChoose={() => true}
          view={nextView}
        />
      </div>,
    );

    act(() => vi.advanceTimersByTime(149));
    expect(screen.getByText(/已选择：/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText(/已选择：/)).not.toBeInTheDocument();
  });
});

function decidingView() {
  const career = startCareer("issue-23:mobile-budget");

  return createCareerPresentation({
    career,
    isRevealing: false,
    visibleSeasonCount: 0,
  });
}

function progressedView() {
  const initial = startCareer("issue-25:compact-history");
  const decision = initial.currentDecision;

  if (decision === null) {
    throw new Error("Expected an initial decision");
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

function progressedGoalkeeperView() {
  const initial = startClassicCareer({
    identity: {
      lastName: "门将",
      nationalityFifaCode: "CHN",
      position: "GK",
      preferredNumber: 1,
    },
    mode: "normal",
    seed: "issue-25:goalkeeper-career-metrics",
  });
  const decision = initial.currentDecision;

  if (decision === null) {
    throw new Error("Expected an initial decision");
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

function startCareer(seed: string) {
  return startClassicCareer({
    identity: {
      lastName: "短屏",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed,
  });
}
