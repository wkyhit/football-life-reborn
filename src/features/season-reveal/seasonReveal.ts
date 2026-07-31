import { useCallback, useEffect, useState } from "react";

import {
  selectCareerEventNarrative,
  type CareerEventPreviewTone,
} from "../../domain/careerEvents";
import type {
  ClassicCareerSeason,
  ClassicCareerState,
  ClassicChoiceTransition,
  ClassicDecisionResult,
} from "../../domain/classicEngine";
import {
  createCareerEconomyChoiceResult,
  type CareerEconomyChoiceResult,
} from "../../domain/economy/careerEconomyProjection";
import { formatYuan } from "../../domain/economy/economyPolicy";

type RevealOptions = {
  readonly eventResultMs?: number;
  readonly milestoneMs?: number;
  readonly reducedMotion?: boolean;
  readonly seasonMs?: number;
};

export type SeasonRevealQueueItem =
  | {
      readonly dwellMs: number;
      readonly kind: "season";
      readonly seasonIndex: number;
    }
  | {
      readonly contractResult: CareerEconomyChoiceResult;
      readonly dwellMs: number;
      readonly kind: "event_result";
      readonly result: ClassicDecisionResult;
    }
  | {
      readonly dwellMs: number;
      readonly kind: "milestone";
      readonly seasonIndex: number;
    }
  | {
      readonly dwellMs: 0;
      readonly kind: "decision_ready";
    };

export type ClassicEventResultReveal = {
  readonly choiceLabel: string;
  readonly contractResult: CareerEconomyChoiceResult | null;
  readonly contractSummary: string | null;
  readonly summary: string;
  readonly title: string;
  readonly tone: CareerEventPreviewTone;
};

type SeasonRevealState = {
  readonly announcement: string;
  readonly committedCareer: ClassicCareerState;
  readonly isRevealing: boolean;
  readonly latestContractResult: CareerEconomyChoiceResult | null;
  readonly latestResult: ClassicDecisionResult | null;
  readonly recentEventContractResult: CareerEconomyChoiceResult | null;
  readonly recentEventResult: ClassicDecisionResult | null;
  readonly revealQueue: readonly SeasonRevealQueueItem[];
  readonly visibleSeasonCount: number;
};

export type SeasonRevealController = SeasonRevealState & {
  readonly activeItem: SeasonRevealQueueItem | null;
  readonly commitTransition: (
    transition: ClassicChoiceTransition,
  ) => void;
};

const DEFAULT_SEASON_REVEAL_MS = 550;
const DEFAULT_EVENT_RESULT_MS = 1_600;
const DEFAULT_MILESTONE_MS = 1_700;

export function useSeasonReveal(
  initialCareer: ClassicCareerState,
  options: RevealOptions = {},
): SeasonRevealController {
  const reducedMotion = options.reducedMotion ?? false;
  const seasonMs =
    options.seasonMs ?? DEFAULT_SEASON_REVEAL_MS;
  const eventResultMs =
    options.eventResultMs ?? DEFAULT_EVENT_RESULT_MS;
  const milestoneMs =
    options.milestoneMs ?? DEFAULT_MILESTONE_MS;
  const [state, setState] = useState<SeasonRevealState>(() => ({
    announcement: "",
    committedCareer: initialCareer,
    isRevealing: false,
    latestContractResult: null,
    latestResult: null,
    recentEventContractResult: null,
    recentEventResult: null,
    revealQueue: [],
    visibleSeasonCount: initialCareer.seasons.length,
  }));

  const commitTransition = useCallback(
    (transition: ClassicChoiceTransition) => {
      setState((current) => {
        const previouslyCommittedCount =
          current.committedCareer.seasons.length;
        const repeatedTransition =
          current.committedCareer === transition.career &&
          current.latestResult === transition.result;
        const contractResult =
          repeatedTransition &&
          current.latestContractResult !== null
            ? current.latestContractResult
            : createCareerEconomyChoiceResult(
                current.committedCareer,
                transition,
              );
        const queue = createRevealQueue({
          contractResult,
          eventResultMs,
          milestoneMs,
          previousSeasonCount: previouslyCommittedCount,
          seasonMs,
          transition,
        });
        const immediate =
          reducedMotion || queue.length === 1;

        return {
          announcement: immediate
            ? completionAnnouncement({
                ...transition,
                contractResult,
              })
            : announcementForItem(
                queue[0] ?? null,
                transition.career,
              ),
          committedCareer: transition.career,
          isRevealing: !immediate,
          latestContractResult: contractResult,
          latestResult: transition.result,
          recentEventContractResult:
            transition.result.eventKey === null
              ? null
              : contractResult,
          recentEventResult:
            transition.result.eventKey === null
              ? null
              : transition.result,
          revealQueue: immediate ? [] : queue,
          visibleSeasonCount: immediate
            ? transition.career.seasons.length
            : previouslyCommittedCount,
        };
      });
    },
    [
      eventResultMs,
      milestoneMs,
      reducedMotion,
      seasonMs,
    ],
  );

  useEffect(() => {
    if (!reducedMotion) {
      return;
    }

    setState((current) => {
      if (!current.isRevealing) {
        return current;
      }

      return {
        ...current,
        announcement: completionAnnouncement({
          career: current.committedCareer,
          contractResult: current.latestContractResult,
          result: current.latestResult,
        }),
        isRevealing: false,
        revealQueue: [],
        visibleSeasonCount:
          current.committedCareer.seasons.length,
      };
    });
  }, [reducedMotion]);

  useEffect(() => {
    const activeItem = state.revealQueue[0];

    if (
      !state.isRevealing ||
      reducedMotion ||
      activeItem === undefined
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) =>
        advanceRevealQueue(current),
      );
    }, activeItem.dwellMs);

    return () => window.clearTimeout(timer);
  }, [
    reducedMotion,
    state.isRevealing,
    state.revealQueue,
  ]);

  return {
    ...state,
    activeItem: state.revealQueue[0] ?? null,
    commitTransition,
  };
}

export function createEventResultReveal(
  result: ClassicDecisionResult,
  contractResult: CareerEconomyChoiceResult | null = null,
): ClassicEventResultReveal | null {
  const event = result.decision.event;

  if (
    result.eventKey === null ||
    event === undefined
  ) {
    return null;
  }

  const narrative = selectCareerEventNarrative({
    eventKey: result.eventKey,
    injuryType: event.injuryType,
    optionKey: result.option.optionKey,
    targetClubTrophy: event.targetClubTrophy,
    targetTrophy: event.targetTrophy,
    variantKey: event.variantKey,
  });
  const allPreviews = narrative.option?.previews ?? [];
  const resolvedPreviews =
    result.outcomeKind === null
      ? allPreviews
      : allPreviews.filter(
          (preview) =>
            preview.outcomeKind === result.outcomeKind,
        );
  const previews =
    resolvedPreviews.length > 0
      ? resolvedPreviews
      : allPreviews;

  return {
    choiceLabel:
      narrative.option?.label ?? result.option.label,
    contractResult,
    contractSummary:
      contractResult === null
        ? null
        : contractResultSummary(contractResult),
    summary:
      previews.map(({ text }) => text).join("；") ||
      "选择已生效",
    title: `${narrative.title}结果`,
    tone:
      result.outcomeKind ??
      previews[0]?.tone ??
      "neutral",
  };
}

function createRevealQueue(input: {
  readonly contractResult: CareerEconomyChoiceResult;
  readonly eventResultMs: number;
  readonly milestoneMs: number;
  readonly previousSeasonCount: number;
  readonly seasonMs: number;
  readonly transition: ClassicChoiceTransition;
}): readonly SeasonRevealQueueItem[] {
  const queue: SeasonRevealQueueItem[] = [];
  const newSeasonIndexes = Array.from(
    {
      length: Math.max(
        0,
        input.transition.career.seasons.length -
          input.previousSeasonCount,
      ),
    },
    (_, offset) => input.previousSeasonCount + offset,
  );

  for (const seasonIndex of newSeasonIndexes) {
    queue.push({
      dwellMs: input.seasonMs,
      kind: "season",
      seasonIndex,
    });
  }

  if (input.transition.result.eventKey !== null) {
    queue.push({
      contractResult: input.contractResult,
      dwellMs: input.eventResultMs,
      kind: "event_result",
      result: input.transition.result,
    });
  }

  for (const seasonIndex of newSeasonIndexes) {
    if (
      isMilestoneSeason(
        input.transition.career.seasons,
        seasonIndex,
      )
    ) {
      queue.push({
        dwellMs: input.milestoneMs,
        kind: "milestone",
        seasonIndex,
      });
    }
  }

  queue.push({
    dwellMs: 0,
    kind: "decision_ready",
  });

  return queue;
}

function advanceRevealQueue(
  current: SeasonRevealState,
): SeasonRevealState {
  const completedItem = current.revealQueue[0];

  if (completedItem === undefined) {
    return current;
  }

  const afterCompleted = current.revealQueue.slice(1);
  const remaining =
    afterCompleted[0]?.kind === "decision_ready"
      ? []
      : afterCompleted;
  const visibleSeasonCount =
    completedItem.kind === "season"
      ? Math.max(
          current.visibleSeasonCount,
          completedItem.seasonIndex + 1,
        )
      : current.visibleSeasonCount;
  const isRevealing = remaining.length > 0;

  return {
    ...current,
    announcement: isRevealing
      ? announcementForItem(
          remaining[0] ?? null,
          current.committedCareer,
        )
      : completionAnnouncement({
          career: current.committedCareer,
          contractResult: current.latestContractResult,
          result: current.latestResult,
        }),
    isRevealing,
    revealQueue: remaining,
    visibleSeasonCount: isRevealing
      ? visibleSeasonCount
      : current.committedCareer.seasons.length,
  };
}

function isMilestoneSeason(
  seasons: readonly ClassicCareerSeason[],
  seasonIndex: number,
): boolean {
  const season = seasons[seasonIndex];

  if (season === undefined) {
    return false;
  }

  const previous = seasons[seasonIndex - 1];

  return (
    season.trophies.length > 0 ||
    season.awards.length > 0 ||
    season.nationalTournamentRecords.some(
      ({ status }) => status === "played",
    ) ||
    season.suspended ||
    season.relegated ||
    (previous !== undefined &&
      previous.competitionTier !== season.competitionTier)
  );
}

function announcementForItem(
  item: SeasonRevealQueueItem | null,
  career: ClassicCareerState,
): string {
  if (item === null) {
    return "";
  }

  switch (item.kind) {
    case "season":
      return `${career.seasons[item.seasonIndex]?.age ?? ""} 岁赛季正在揭示`;
    case "event_result": {
      const reveal = createEventResultReveal(
        item.result,
        item.contractResult,
      );
      return reveal === null
        ? "事件结果正在揭示"
        : `${reveal.title}：${reveal.summary}${reveal.contractSummary === null ? "" : `；${reveal.contractSummary}`}`;
    }
    case "milestone":
      return `${career.seasons[item.seasonIndex]?.age ?? ""} 岁赛季里程碑`;
    case "decision_ready":
      return career.phase === "summary"
        ? "生涯总结已就绪"
        : "下一项选择已就绪";
  }
}

function completionAnnouncement(
  transition: {
    readonly career: ClassicCareerState;
    readonly contractResult: CareerEconomyChoiceResult | null;
    readonly result: ClassicDecisionResult | null;
  },
): string {
  const result =
    transition.result === null
      ? null
      : createEventResultReveal(
          transition.result,
          transition.contractResult,
        );
  const ready =
    transition.career.phase === "summary"
      ? "生涯总结已就绪"
      : "下一项选择已就绪";

  return result === null
    ? ready
    : `${result.title}：${result.summary}${result.contractSummary === null ? "" : `；${result.contractSummary}`}。${ready}`;
}

function contractResultSummary(
  result: CareerEconomyChoiceResult,
): string {
  if (result.kind === "new_contract") {
    return `实际合同：新合同生效 · 年薪 ${formatYuan(result.contract.annualSalary)}`;
  }

  if (result.kind === "contract_unchanged") {
    return `实际合同：${
      result.reason === "loan"
        ? "母队合同不变"
        : "合同不变"
    } · 年薪 ${formatYuan(result.contract.annualSalary)}`;
  }

  return result.reason === "retire"
    ? "实际合同：退役后停止收入"
    : "实际合同：本次选择后无在效合同";
}
