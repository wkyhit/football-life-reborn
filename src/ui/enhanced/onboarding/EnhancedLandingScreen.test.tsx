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

  it("offers all three daily challenges and keeps an explicit ordinary-career path", async () => {
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
        hasResume={false}
        onBegin={onBegin}
        onBeginChallenge={onBeginChallenge}
        onRandom={() => undefined}
        onResume={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "今日挑战",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-07-30")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "开始一人一城挑战",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "开始亚洲之光挑战",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "开始门将传奇挑战",
      }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "沉浸" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "开始一人一城挑战",
      }),
    );
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
