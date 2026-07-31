import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../domain/classicEngine";
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

describe("complete career narrative rendering", () => {
  it("shows identical season honors and statuses in Classic and Enhanced", () => {
    const view = completeNarrativeView();
    const classic = render(
      <CareerScreen onChoose={vi.fn()} view={view} />,
    );

    for (const label of SEASON_LABELS) {
      expect(screen.getByText(label)).toBeVisible();
    }

    classic.unmount();
    render(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        view={view}
      />,
    );

    for (const label of SEASON_LABELS) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });
});

function completeNarrativeView() {
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
    career,
    isRevealing: true,
    visibleSeasonCount: career.seasons.length,
  });
}
