import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { startClassicCareer } from "../../../domain/classicEngine";
import { deriveDailyChallenge } from "../../../features/challenges/daily";
import { evaluateChallengeProgress } from "../../../features/challenges/progress";
import { createCareerPresentation } from "../../classic/careerPresentation";
import { EnhancedCareerScreen } from "./EnhancedCareerScreen";

describe("EnhancedCareerScreen", () => {
  afterEach(() => {
    cleanup();
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
      within(secondary as HTMLElement).getByText("生涯累计与收入"),
    ).toBeVisible();
    expect(within(secondary as HTMLElement).getByText("总收入")).toBeInTheDocument();
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
