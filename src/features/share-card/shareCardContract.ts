import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";

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
