import { useCallback, useEffect, useState } from "react";

import type { ClassicCareerState } from "../../domain/classicEngine";

type RevealOptions = {
  readonly stepMs?: number;
};

type SeasonRevealState = {
  readonly committedCareer: ClassicCareerState;
  readonly isRevealing: boolean;
  readonly visibleSeasonCount: number;
};

export type SeasonRevealController = SeasonRevealState & {
  readonly commitCareer: (career: ClassicCareerState) => void;
};

const DEFAULT_REVEAL_STEP_MS = 650;

export function useSeasonReveal(
  initialCareer: ClassicCareerState,
  options: RevealOptions = {},
): SeasonRevealController {
  const stepMs = options.stepMs ?? DEFAULT_REVEAL_STEP_MS;
  const [state, setState] = useState<SeasonRevealState>(() => ({
    committedCareer: initialCareer,
    isRevealing: false,
    visibleSeasonCount: initialCareer.seasons.length,
  }));

  const commitCareer = useCallback((career: ClassicCareerState) => {
    setState((current) => {
      const previouslyCommittedCount =
        current.committedCareer.seasons.length;
      const hasNewSeasons =
        career.seasons.length > previouslyCommittedCount;

      return {
        committedCareer: career,
        isRevealing: hasNewSeasons,
        visibleSeasonCount: hasNewSeasons
          ? previouslyCommittedCount
          : career.seasons.length,
      };
    });
  }, []);

  useEffect(() => {
    if (!state.isRevealing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) => {
        const nextVisibleCount = Math.min(
          current.visibleSeasonCount + 1,
          current.committedCareer.seasons.length,
        );

        return {
          ...current,
          isRevealing:
            nextVisibleCount <
            current.committedCareer.seasons.length,
          visibleSeasonCount: nextVisibleCount,
        };
      });
    }, stepMs);

    return () => window.clearTimeout(timer);
  }, [state.isRevealing, state.visibleSeasonCount, stepMs]);

  return {
    ...state,
    commitCareer,
  };
}
