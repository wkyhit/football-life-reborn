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
      className="rounded-[12px] border border-emerald-400/20 bg-emerald-400/[0.055] p-3 text-zinc-100"
      data-challenge-family={daily.family}
      data-challenge-status={progress.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.12em] text-emerald-400">
            DAILY · {daily.calendarDate}
          </p>
          <h2 className="mt-0.5 truncate text-[15px] font-extrabold">
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
              className={`mt-0.5 text-xs ${ruleStateClass(rule.state)}`}
            >
              {ruleStateMark(rule.state)}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold">
                {rule.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-[1.45] text-zinc-400">
                {rule.detail}
              </span>
            </span>
            <span className="pt-0.5 text-[10px] font-bold tabular-nums text-zinc-300">
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
    "shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold";

  switch (status) {
    case "active":
      return `${base} border-sky-400/30 bg-sky-400/10 text-sky-300`;
    case "completed":
      return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-300`;
    case "failed":
      return `${base} border-red-400/30 bg-red-400/10 text-red-300`;
  }
}

function ruleStateClass(state: ChallengeRuleState): string {
  switch (state) {
    case "failed":
      return "text-red-300";
    case "met":
      return "text-emerald-300";
    case "pending":
      return "text-zinc-500";
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
