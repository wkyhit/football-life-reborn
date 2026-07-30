import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";

export type ShareCardInput = {
  readonly displayName: string;
  readonly qrPayload: string;
  readonly view: SummaryPresentation;
};

export function shareCardFilename(
  displayName: string,
  view: SummaryPresentation,
): string {
  const name = displayName.trim() || view.identity.name;
  return `${name}-生涯战绩卡.png`;
}
