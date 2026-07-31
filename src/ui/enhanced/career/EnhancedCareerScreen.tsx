import type {
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "../../classic/careerPresentation";
import {
  ChallengeProgressPanel,
  type ChallengeSurface,
} from "../../../features/challenges/ChallengeProgressPanel";
import {
  HonorIdentity,
  type HonorIdentityKey,
} from "../../shared/HonorIdentity";
import { ClubIdentity } from "../../classic/components/ClubIdentity";

type EnhancedCareerScreenProps = {
  readonly challenge?: ChallengeSurface;
  readonly onChoose: (
    decisionId: string,
    optionId: string,
  ) => void;
  readonly onOpenArchive?: () => void;
  readonly statusMessage?: string | null;
  readonly view: CareerPresentation;
};

export function EnhancedCareerScreen({
  challenge,
  onChoose,
  onOpenArchive,
  statusMessage,
  view,
}: EnhancedCareerScreenProps) {
  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-career-shell=""
      id="main-content"
      tabIndex={-1}
    >
      {statusMessage ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
      <CareerHeader
        view={view}
        {...(onOpenArchive === undefined
          ? {}
          : { onOpenArchive })}
      />
      <div
        className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,7fr)_380px] lg:grid-rows-1 lg:gap-6 lg:p-6"
        data-enhanced-career-layout=""
      >
        <CareerTimeline view={view} />
        <DecisionRail
          onChoose={onChoose}
          view={view}
          {...(challenge === undefined ? {} : { challenge })}
        />
      </div>
    </main>
  );
}

function CareerHeader({
  onOpenArchive,
  view,
}: {
  readonly onOpenArchive?: () => void;
  readonly view: CareerPresentation;
}) {
  const { header, totals } = view;

  return (
    <header
      className="shrink-0 border-b border-enhanced-line bg-enhanced-canvas px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-4"
      data-enhanced-career-header=""
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 lg:gap-5">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[10px] border border-amber-500/40 bg-amber-800/50 text-amber-50">
          <span className="text-[9px] font-bold leading-none text-amber-200">
            能力
          </span>
          <strong className="mt-0.5 text-2xl font-black leading-none tabular-nums">
            {header.overall}
          </strong>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-[6px] border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
              {header.countryFlag} {header.countryCode}
            </span>
            <span className="rounded-[6px] border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              #{header.number} {header.position}
            </span>
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            {header.club ? (
              <ClubIdentity club={header.club} size={22} />
            ) : null}
            <span className="truncate text-lg font-extrabold">
              {header.club?.shortName ?? "自由身"}
            </span>
          </div>
        </div>

        {onOpenArchive ? (
          <button
            className="min-h-10 shrink-0 rounded-[9px] border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-zinc-300"
            onClick={onOpenArchive}
            type="button"
          >
            生涯档案
          </button>
        ) : null}

        <div className="shrink-0 border-l border-white/10 pl-3 text-right lg:pl-5">
          <div className="text-[10px] font-bold text-enhanced-supporting">
            年龄
          </div>
          <div className="text-xl font-black tabular-nums">
            {header.age}
          </div>
          <div className="text-[11px] font-bold text-emerald-300">
            {formatMarketValue(header.marketValue)}
          </div>
        </div>

        <dl className="hidden shrink-0 grid-cols-4 divide-x divide-white/10 lg:grid">
          {(
            [
              ["出场", totals.appearances],
              ["进球", totals.goals],
              ["助攻", totals.assists],
              ["奖杯", totals.trophies],
            ] as const
          ).map(([label, value]) => (
            <div className="min-w-20 px-4 text-center" key={label}>
              <dt className="text-[10px] font-bold text-enhanced-supporting">
                {label}
              </dt>
              <dd className="mt-0.5 text-lg font-extrabold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <dl className="mt-3 grid grid-cols-4 divide-x divide-white/10 lg:hidden">
        {(
          [
            ["出场", totals.appearances],
            ["进球", totals.goals],
            ["助攻", totals.assists],
            ["奖杯", totals.trophies],
          ] as const
        ).map(([label, value]) => (
          <div className="text-center" key={label}>
            <dt className="text-[9px] font-bold text-enhanced-supporting">
              {label}
            </dt>
            <dd className="mt-0.5 text-base font-extrabold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function CareerTimeline({
  view,
}: {
  readonly view: CareerPresentation;
}) {
  const recordedSeasons = view.timeline.filter(
    (row) => row.kind === "season",
  ).length;

  return (
    <section
      aria-labelledby="enhanced-timeline-heading"
      className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-300 sm:px-6 lg:rounded-[16px] lg:border lg:border-white/10 lg:bg-white/[0.025] lg:p-5"
      data-enhanced-timeline=""
      tabIndex={0}
    >
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
            SEASON ARCHIVE
          </p>
          <h1
            className="mt-1 text-[22px] font-extrabold leading-tight"
            id="enhanced-timeline-heading"
          >
            生涯时间线
          </h1>
        </div>
        <p className="text-right text-[11px] font-bold text-enhanced-supporting">
          已记录{" "}
          <span className="text-zinc-300 tabular-nums">
            {recordedSeasons}
          </span>{" "}
          赛季
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-white/10 bg-black/10">
        <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 border-b border-white/10 px-2.5 py-2 text-[9px] font-bold text-enhanced-supporting">
          <span>岁</span>
          <span>俱乐部</span>
          <span className="text-center">能力</span>
          <span className="text-right">场</span>
          <span className="text-right">球</span>
          <span className="text-right">助</span>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {view.timeline.map((row) => (
            <TimelineRow key={row.age} row={row} />
          ))}
          <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 bg-white/[0.025] px-2.5 py-2">
            <span className="text-center text-sm">
              {view.nationalTeam.countryFlag}
            </span>
            <span className="truncate text-xs font-bold text-enhanced-supporting">
              {view.nationalTeam.name}
            </span>
            <span />
            <TimelineNumber>
              {view.nationalTeam.stats.appearances}
            </TimelineNumber>
            <TimelineNumber>
              {view.nationalTeam.stats.goals}
            </TimelineNumber>
            <TimelineNumber>
              {view.nationalTeam.stats.assists}
            </TimelineNumber>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  row,
}: {
  readonly row: CareerTimelineRowPresentation;
}) {
  const gridClass =
    "grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 px-2.5 py-2";

  if (row.kind === "current") {
    return (
      <div
        className={`${gridClass} bg-emerald-500/[0.06]`}
        data-enhanced-season-row="current"
      >
        <span className="text-xs font-black tabular-nums text-emerald-300">
          {row.age}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-emerald-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
          />
          决策中
        </span>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (row.kind === "empty") {
    return (
      <div
        className={gridClass}
        data-enhanced-season-row="empty"
      >
        <span className="text-xs font-black tabular-nums text-enhanced-supporting">
          {row.age}
        </span>
        <span className="text-xs text-enhanced-supporting">
          待书写
        </span>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div
      className={gridClass}
      data-enhanced-season-row="season"
    >
      <span className="text-xs font-black tabular-nums text-zinc-400">
        {row.age}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <ClubIdentity club={row.club} size={20} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold">
            {row.club.shortName}
          </span>
          <span className="block truncate text-[9px] text-enhanced-supporting">
            {row.club.subtitle.replace(" · 次级联赛", "")}
          </span>
        </span>
      </span>
      <span className="text-center">
        <span className="inline-block min-w-8 rounded-[6px] border border-amber-500/35 bg-amber-700/40 px-1 py-0.5 text-[11px] font-black tabular-nums text-amber-100">
          {row.overall}
        </span>
      </span>
      <SeasonNumber>{row.stats.appearances}</SeasonNumber>
      <SeasonNumber>{row.stats.goals}</SeasonNumber>
      <SeasonNumber>{row.stats.assists}</SeasonNumber>
      <SeasonNarrative row={row} />
    </div>
  );
}

function SeasonNarrative({
  row,
}: {
  readonly row: Extract<
    CareerTimelineRowPresentation,
    { readonly kind: "season" }
  >;
}) {
  const items: Array<{
    honor: HonorIdentityKey | null;
    id: string;
    kind: "honor" | "national" | "status";
    label: string;
  }> = [
    ...row.honors.map((honor, index) => ({
      honor:
        honor.kind === "award"
          ? honor.award
          : honor.trophy,
      id: `honor-${index}-${honor.label}`,
      kind: "honor" as const,
      label: honor.label,
    })),
    ...row.nationalTournaments.map(({ label }, index) => ({
      honor: null,
      id: `national-${index}-${label}`,
      kind: "national" as const,
      label,
    })),
    ...row.statuses.map(({ label }, index) => ({
      honor: null,
      id: `status-${index}-${label}`,
      kind: "status" as const,
      label,
    })),
    ...(row.tierChange === null
      ? []
      : [
          {
            honor: null,
            id: `tier-${row.tierChange.from}-${row.tierChange.to}`,
            kind: "status" as const,
            label: row.tierChange.label,
          },
        ]),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={`${row.age} 岁赛季事件`}
      className="col-start-2 col-end-7 mt-1 flex flex-wrap gap-1"
      data-enhanced-season-narrative=""
    >
      {items.map((item) => (
        <li
          className={
            item.kind === "honor"
              ? "inline-flex items-center gap-1 rounded-[5px] border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200"
              : item.kind === "national"
                ? "inline-flex items-center gap-1 rounded-[5px] border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-200"
                : "inline-flex items-center gap-1 rounded-[5px] border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-200"
          }
          key={item.id}
        >
          {item.honor === null ? null : (
            <HonorIdentity honor={item.honor} size={14} />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function TimelineNumber({
  children,
}: {
  readonly children: number;
}) {
  return (
    <span className="text-right text-xs tabular-nums text-enhanced-supporting">
      {children}
    </span>
  );
}

function SeasonNumber({
  children,
}: {
  readonly children: number;
}) {
  return (
    <span className="text-right text-xs tabular-nums text-zinc-300">
      {children}
    </span>
  );
}

function DecisionRail({
  challenge,
  onChoose,
  view,
}: {
  readonly challenge?: ChallengeSurface;
  readonly onChoose: EnhancedCareerScreenProps["onChoose"];
  readonly view: CareerPresentation;
}) {
  const { panel } = view;
  const railClass =
    "min-h-0 max-h-[48dvh] overflow-y-auto overscroll-contain border-t border-white/10 bg-enhanced-surface px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:h-full lg:max-h-none lg:w-[380px] lg:rounded-[16px] lg:border lg:p-5";

  if (panel.kind === "simulating") {
    return (
      <aside
        aria-label="赛季状态"
        className={`${railClass} flex items-center justify-center`}
        data-enhanced-decision-rail=""
      >
        {challenge ? (
          <div className="mb-4 w-full">
            <ChallengeProgressPanel {...challenge} />
          </div>
        ) : null}
        <p
          aria-atomic="true"
          aria-live="polite"
          className="flex items-center gap-2 text-sm font-bold text-zinc-400"
          role="status"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-emerald-400"
          />
          赛季进行中
        </p>
      </aside>
    );
  }

  if (panel.kind === "event_result") {
    return (
      <aside
        aria-labelledby="enhanced-event-result-heading"
        className={railClass}
        data-enhanced-decision-rail=""
      >
        {challenge ? (
          <div className="mb-4">
            <ChallengeProgressPanel {...challenge} />
          </div>
        ) : null}
        <div
          className="enhanced-reveal-enter"
          data-enhanced-event-result-reveal=""
        >
          <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
            EVENT RESULT · {panel.age} 岁
          </p>
          <h2
            className="mt-1.5 text-[22px] font-extrabold leading-tight"
            id="enhanced-event-result-heading"
          >
            {panel.title}
          </h2>
          <p className="mt-2 text-xs font-bold text-enhanced-supporting">
            {panel.choiceLabel}
          </p>
          <p
            className={`mt-4 rounded-[10px] border px-3 py-3 text-sm font-bold ${enhancedResultToneClass(panel.tone)}`}
          >
            {panel.summary}
          </p>
        </div>
      </aside>
    );
  }

  if (panel.kind === "milestone") {
    return (
      <aside
        aria-labelledby="enhanced-milestone-heading"
        className={railClass}
        data-enhanced-decision-rail=""
      >
        {challenge ? (
          <div className="mb-4">
            <ChallengeProgressPanel {...challenge} />
          </div>
        ) : null}
        <div
          className="enhanced-reveal-enter"
          data-enhanced-milestone-reveal=""
        >
          <p className="text-[10px] font-bold tracking-[0.12em] text-amber-300">
            MILESTONE · {panel.age} 岁 · {panel.club.shortName}
          </p>
          <h2
            className="mt-1.5 text-[22px] font-extrabold leading-tight"
            id="enhanced-milestone-heading"
          >
            {panel.title}
          </h2>
          <MilestoneNarrative
            honors={panel.honors}
            nationalTournaments={panel.nationalTournaments}
            statuses={panel.statuses}
            tierChange={panel.tierChange}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-labelledby="enhanced-decision-heading"
      className={railClass}
      data-enhanced-decision-rail=""
    >
      {challenge ? (
        <div className="mb-4">
          <ChallengeProgressPanel {...challenge} />
        </div>
      ) : null}
      {view.recentEventResult ? (
        <div
          className={`mb-4 rounded-[9px] border px-3 py-2.5 text-xs ${enhancedResultToneClass(view.recentEventResult.tone)}`}
          data-enhanced-recent-event-result=""
        >
          <strong className="block">
            {view.recentEventResult.title}
          </strong>
          <span className="mt-1 block">
            {view.recentEventResult.summary}
          </span>
        </div>
      ) : null}
      <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
        DECISION RAIL · {panel.age} 岁
      </p>
      <h2
        className="mt-1.5 text-[22px] font-extrabold leading-tight"
        id="enhanced-decision-heading"
      >
        {panel.title}
      </h2>
      <p className="mt-2 text-[13px] leading-[1.7] text-zinc-400">
        {panel.description}
      </p>
      <div className="mt-4 space-y-2.5">
        {panel.options.map((option) => (
          <DecisionOption
            key={option.id}
            onChoose={() =>
              onChoose(panel.decisionId, option.id)
            }
            option={option}
          />
        ))}
      </div>
    </aside>
  );
}

function MilestoneNarrative({
  honors,
  nationalTournaments,
  statuses,
  tierChange,
}: Pick<
  Extract<
    CareerPresentation["panel"],
    { readonly kind: "milestone" }
  >,
  | "honors"
  | "nationalTournaments"
  | "statuses"
  | "tierChange"
>) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {honors.map((honor, index) => {
        const identity =
          honor.kind === "award"
            ? honor.award
            : honor.trophy;

        return (
          <li
            className="inline-flex items-center gap-2 rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-xs font-bold text-amber-100"
            key={`honor-${index}-${honor.label}`}
          >
            <HonorIdentity honor={identity} size={22} />
            {honor.label}
          </li>
        );
      })}
      {nationalTournaments.map(({ label }, index) => (
        <li
          className="rounded-[8px] border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-2 text-xs font-bold text-cyan-100"
          key={`national-${index}-${label}`}
        >
          {label}
        </li>
      ))}
      {statuses.map(({ label }, index) => (
        <li
          className="rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-2.5 py-2 text-xs font-bold text-rose-100"
          key={`status-${index}-${label}`}
        >
          {label}
        </li>
      ))}
      {tierChange ? (
        <li className="rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-2.5 py-2 text-xs font-bold text-rose-100">
          {tierChange.label}
        </li>
      ) : null}
    </ul>
  );
}

function enhancedResultToneClass(
  tone: NonNullable<
    CareerPresentation["recentEventResult"]
  >["tone"],
): string {
  switch (tone) {
    case "positive":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
    case "negative":
      return "border-rose-400/25 bg-rose-400/10 text-rose-100";
    case "warning":
      return "border-amber-400/25 bg-amber-400/10 text-amber-100";
    case "neutral":
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function DecisionOption({
  onChoose,
  option,
}: {
  readonly onChoose: () => void;
  readonly option: CareerDecisionOptionPresentation;
}) {
  return (
    <button
      className="block min-h-12 w-full rounded-[10px] border border-white/10 bg-white/[0.045] p-3 text-left outline-none transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/[0.06] focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-enhanced-surface active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
      onClick={onChoose}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          {option.club ? (
            <ClubIdentity club={option.club} size={34} />
          ) : (
            <span
              aria-hidden="true"
              className="text-lg text-emerald-300"
            >
              ›
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">
            {option.title}
          </span>
          <span
            className={`mt-0.5 block text-[11px] text-enhanced-supporting ${
              option.club ? "truncate" : "whitespace-normal leading-4"
            }`}
          >
            {option.subtitle}
          </span>
        </span>
        {option.role ? (
          <span className="shrink-0 text-right">
            <span
              className={`block text-[11px] font-bold ${roleToneClass(option.roleTone)}`}
            >
              {option.role}
            </span>
            <span className="block text-[10px] text-enhanced-supporting">
              {option.stars}
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function roleToneClass(
  tone: CareerDecisionOptionPresentation["roleTone"],
): string {
  switch (tone) {
    case "positive":
      return "text-lime-300";
    case "primary":
      return "text-emerald-300";
    case "warning":
      return "text-amber-300";
    case "danger":
      return "text-red-300";
  }
}

function formatMarketValue(valueEuro: number): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}
