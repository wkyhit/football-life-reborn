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
    ).toHaveAttribute("data-scroll-region", "career-timeline");
    expect(
      document.querySelector("[data-enhanced-decision-rail]"),
    ).toHaveAttribute("data-scroll-region", "decision-rail");
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
