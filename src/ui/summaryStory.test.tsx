import {
  cleanup,
  render,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { playClassicCareer } from "../domain/classicEngine";
import { formatYuan } from "../domain/economy/economyPolicy";
import { SummaryScreen } from "./classic/SummaryScreen";
import { createSummaryPresentation } from "./classic/summaryPresentation";
import { EnhancedSummaryScreen } from "./enhanced/summary/EnhancedSummaryScreen";

afterEach(cleanup);

describe("shared ending and career story rendering", () => {
  it.each(["classic", "enhanced"] as const)(
    "renders ending, simulated percentile, narrative, and total income in %s",
    (variant) => {
      const career = playClassicCareer({
        identity: {
          lastName: "结局",
          nationalityFifaCode: "CHN",
          position: "ST",
          preferredNumber: 9,
        },
        mode: "normal",
        seed: "issue-18:summary-story",
      });
      const view = createSummaryPresentation(career);
      const rendered =
        variant === "classic"
          ? render(
              <SummaryScreen
                onRestart={vi.fn()}
                onShare={vi.fn()}
                view={view}
              />,
            )
          : render(
              <EnhancedSummaryScreen
                onRestart={vi.fn()}
                onShare={vi.fn()}
                view={view}
              />,
            );
      const story =
        rendered.container.querySelector<HTMLElement>(
          "[data-summary-story]",
        );

      if (story === null) {
        throw new Error("Expected the shared career story");
      }

      const storyView = within(story);
      expect(
        storyView.getByRole("heading", {
          name: "生涯结局",
        }),
      ).toBeVisible();
      expect(
        storyView.getByText(view.story.ending.label),
      ).toBeVisible();
      expect(
        storyView.getByText("模拟生涯分位"),
      ).toBeVisible();
      expect(
        storyView.getByText(
          `P${view.story.simulatedPercentile.value}`,
        ),
      ).toBeVisible();
      expect(storyView.getByText("总收入")).toBeVisible();
      expect(
        storyView.getByText(
          formatYuan(view.story.totalIncome),
        ),
      ).toBeVisible();
      expect(
        storyView.getByText(view.story.narrative),
      ).toBeVisible();
    },
  );
});
