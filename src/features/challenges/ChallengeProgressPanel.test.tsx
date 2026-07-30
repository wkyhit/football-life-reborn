import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { playClassicCareer } from "../../domain/classicEngine";
import { ChallengeProgressPanel } from "./ChallengeProgressPanel";
import { deriveDailyChallenge } from "./daily";
import { evaluateChallengeProgress } from "./progress";

describe("ChallengeProgressPanel", () => {
  afterEach(cleanup);

  it("shows terminal failure and the exact failed rule explanation", () => {
    const daily = deriveDailyChallenge({
      calendarDate: "2026-07-30",
      family: "goalkeeper_legend",
      version: 1,
    });
    const career = playClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: daily.seed,
    });
    const progress = evaluateChallengeProgress(
      daily.family,
      career,
    );

    render(
      <ChallengeProgressPanel
        daily={daily}
        progress={progress}
      />,
    );

    const panel = screen.getByRole("region", {
      name: "门将传奇挑战进度",
    });

    expect(
      within(panel).getByText("挑战失败"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("该挑战只接受门将位置。"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("0 / 1"),
    ).toBeInTheDocument();
  });
});
