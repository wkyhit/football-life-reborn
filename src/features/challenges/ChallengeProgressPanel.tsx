import type { DailyChallenge } from "./daily";
import type {
  ChallengeProgress,
  ChallengeProgressStatus,
  ChallengeRuleState,
} from "./progress";

export type ChallengeSurface = {
  readonly daily: DailyChallenge;
  readonly progress: ChallengeProgress;
};

type ChallengeProgressPanelProps = ChallengeSurface;

const STATUS_LABEL: Readonly<
  Record<ChallengeProgressStatus, string>
> = {
  active: "挑战进行中",
  completed: "挑战完成",
  failed: "挑战失败",
};

export function ChallengeProgressPanel({
  daily,
  progress,
}: ChallengeProgressPanelProps) {
  return (
    <section
      aria-label={`${progress.title}挑战进度`}
      className="border-y border-enhanced-pitch/30 bg-enhanced-pitch/[0.055] px-1 py-4 text-enhanced-strong"
      data-challenge-family={daily.family}
      data-challenge-status={progress.status}
      data-enhanced-record="challenge"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-enhanced-mono text-xs font-bold uppercase tracking-[0.08em] text-enhanced-pitch">
            DAILY · {daily.calendarDate}
          </p>
          <h2 className="mt-1 truncate text-base font-bold">
            {progress.title}
          </h2>
        </div>
        <span
          className={statusClass(progress.status)}
          data-challenge-status-label=""
        >
          {STATUS_LABEL[progress.status]}
        </span>
      </div>

      <ul className="mt-2.5 space-y-2">
        {progress.rules.map((rule) => (
          <li
            className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-2"
            data-challenge-rule={rule.id}
            data-challenge-rule-state={rule.state}
            key={rule.id}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 font-enhanced-mono text-sm ${ruleStateClass(rule.state)}`}
            >
              {ruleStateMark(rule.state)}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">
                {rule.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-enhanced-supporting">
                {rule.detail}
              </span>
            </span>
            <span className="pt-0.5 font-enhanced-mono text-xs font-bold tabular-nums text-enhanced-ink-2">
              {rule.current} / {rule.target}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusClass(
  status: ChallengeProgressStatus,
): string {
  const base =
    "shrink-0 border-l-2 px-2 py-1 text-xs font-bold";

  switch (status) {
    case "active":
      return `${base} border-enhanced-focus text-enhanced-ink-2`;
    case "completed":
      return `${base} border-enhanced-pitch text-enhanced-pitch`;
    case "failed":
      return `${base} border-enhanced-alert text-enhanced-alert`;
  }
}

function ruleStateClass(state: ChallengeRuleState): string {
  switch (state) {
    case "failed":
      return "text-enhanced-alert";
    case "met":
      return "text-enhanced-pitch";
    case "pending":
      return "text-enhanced-neutral";
  }
}

function ruleStateMark(state: ChallengeRuleState): string {
  switch (state) {
    case "failed":
      return "×";
    case "met":
      return "✓";
    case "pending":
      return "○";
  }
}
