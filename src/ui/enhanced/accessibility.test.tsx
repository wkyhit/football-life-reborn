import {
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../../domain/classicEngine";
import { createCareerPresentation } from "../classic/careerPresentation";
import { EnhancedCareerScreen } from "./career/EnhancedCareerScreen";

describe("Enhanced accessibility semantics", () => {
  it("announces a committed season simulation as live status", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-4:a11y-status",
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
    const view = createCareerPresentation({
      career: committed,
      isRevealing: true,
      visibleSeasonCount: 0,
    });

    const { rerender } = render(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        view={view}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "赛季进行中",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    rerender(
      <EnhancedCareerScreen
        onChoose={vi.fn()}
        statusMessage="赛季更新完成，已记录 2 个赛季"
        view={createCareerPresentation({
          career: committed,
          isRevealing: false,
          visibleSeasonCount: committed.seasons.length,
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "赛季更新完成，已记录 2 个赛季",
    );
  });
});
