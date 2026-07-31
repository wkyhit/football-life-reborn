import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";
import { formatYuan } from "../../domain/economy/economyPolicy";

export type ShareCardChallenge = {
  readonly calendarDate: string;
  readonly status: "active" | "completed" | "failed";
  readonly title: string;
};

export type ShareCardInput = {
  readonly challenge?: ShareCardChallenge;
  readonly displayName: string;
  readonly qrPayload: string;
  readonly view: SummaryPresentation;
};

export type ShareCardStoryLines = {
  readonly ending: string;
  readonly income: string;
  readonly narrative: readonly string[];
  readonly percentile: string;
};

export function createShareCardStoryLines(
  view: SummaryPresentation,
): ShareCardStoryLines {
  return Object.freeze({
    ending: view.story.ending.label,
    income: `总收入 ${formatYuan(view.story.totalIncome)}`,
    narrative: view.story.chapters,
    percentile: `${view.story.simulatedPercentile.label} P${view.story.simulatedPercentile.value}`,
  });
}

export function shareCardFilename(
  displayName: string,
  view: SummaryPresentation,
  challenge?: ShareCardChallenge,
): string {
  const name = displayName.trim() || view.identity.name;
  return challenge === undefined
    ? `${name}-生涯战绩卡.png`
    : `${name}-${challenge.title}挑战卡.png`;
}
