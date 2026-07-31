import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DAILY_CHALLENGE_FAMILIES,
  deriveDailyChallenge,
} from "../../../features/challenges/daily";
import { EnhancedLandingScreen } from "./EnhancedLandingScreen";

describe("Enhanced daily challenge landing", () => {
  afterEach(cleanup);

  it("puts the entry rail before the decorative story on short screens", () => {
    const { container } = render(
      <EnhancedLandingScreen
        hasResume
        onBegin={() => undefined}
        onRandom={() => undefined}
        onResume={() => undefined}
      />,
    );

    const resume = screen.getByRole("button", {
      name: "继续上次生涯",
    });
    const entryRail = container.querySelector(
      "[data-enhanced-entry-rail]",
    );
    const story = container.querySelector(
      "[data-enhanced-landing-story]",
    );

    expect(entryRail).not.toBeNull();
    expect(entryRail).toHaveClass(
      "flex",
      "min-h-0",
      "flex-col",
      "order-1",
      "lg:order-2",
      "lg:overflow-y-auto",
    );
    expect(entryRail).not.toHaveClass("justify-center");
    expect(entryRail).toContainElement(resume);
    expect(story).toHaveClass("order-2", "lg:order-1");
  });

  it("orders resume and ordinary entry before collapsed challenge discovery", async () => {
    const challenges = DAILY_CHALLENGE_FAMILIES.map(
      (family) =>
        deriveDailyChallenge({
          calendarDate: "2026-07-30",
          family,
          version: 1,
        }),
    );
    const onBegin = vi.fn();
    const onBeginChallenge = vi.fn();

    render(
      <EnhancedLandingScreen
        dailyChallenges={challenges}
        hasResume
        onBegin={onBegin}
        onBeginChallenge={onBeginChallenge}
        onRandom={() => undefined}
        onResume={() => undefined}
      />,
    );

    const resume = screen.getByRole("button", {
      name: "继续上次生涯",
    });
    const ordinary = screen.getByRole("button", {
      name: "开始普通生涯",
    });
    const discovery = document.querySelector<HTMLDetailsElement>(
      "[data-enhanced-challenge-discovery]",
    );

    expect(discovery).not.toBeNull();
    expect(discovery).not.toHaveAttribute("open");
    expect(
      resume.compareDocumentPosition(ordinary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      ordinary.compareDocumentPosition(discovery!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const firstChallenge = screen.getByRole("button", {
      hidden: true,
      name: "开始一人一城挑战",
    });
    expect(firstChallenge).not.toBeVisible();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "沉浸" }),
    );
    await user.click(
      screen.getByText("发现今日挑战", { selector: "summary *" }),
    );
    expect(discovery).toHaveAttribute("open");
    expect(screen.getByText("2026-07-30")).toBeVisible();
    expect(firstChallenge).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "开始亚洲之光挑战",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "开始门将传奇挑战",
      }),
    ).toBeVisible();

    await user.click(firstChallenge);
    expect(onBeginChallenge).toHaveBeenCalledWith(
      challenges[0],
      "long",
    );

    await user.click(
      screen.getByRole("button", {
        name: "开始普通生涯",
      }),
    );
    expect(onBegin).toHaveBeenCalledWith("long");
  });
});
