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
  CareerEventResultNarrative,
  CareerMilestoneNarrative,
  CareerRecentEventResult,
  CareerSeasonNarrative,
} from "../../shared/CareerMilestoneNarrative";
import { ClubIdentity } from "../../classic/components/ClubIdentity";
import { EnhancedAppBar } from "../components/EnhancedAppBar";

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
      data-hallmark-macrostructure="Workbench"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Workbench · theme: custom (tuned) · design-system: design.md · designed-as-app */}
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
      <EnhancedAppBar
        actions={
          onOpenArchive ? (
            <button
              aria-label="生涯档案"
              className="min-h-11 min-w-11 px-2 font-bold"
              onClick={onOpenArchive}
              type="button"
            >
              档案
            </button>
          ) : null
        }
        context={`${view.header.age} 岁 · ${view.header.club?.shortName ?? "自由身"} · OVR ${view.header.overall}`}
        currentLabel="生涯工作台"
      />
      <CareerHeader view={view} />
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
  view,
}: {
  readonly view: CareerPresentation;
}) {
  const { header, totals } = view;

  return (
    <header
      className="shrink-0 border-b border-enhanced-line bg-enhanced-canvas px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-4"
    >
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(20rem,auto)] lg:gap-5">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[10px] border border-enhanced-trophy/40 bg-enhanced-trophy/50 text-enhanced-trophy">
          <span className="text-[9px] font-bold leading-none text-enhanced-trophy">
            能力
          </span>
          <strong className="mt-0.5 text-2xl font-black leading-none tabular-nums">
            {header.overall}
          </strong>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-[6px] border border-enhanced-line bg-enhanced-surface px-1.5 py-0.5 text-[10px] font-bold text-enhanced-ink-2">
              {header.countryFlag} {header.countryCode}
            </span>
            <span className="rounded-[6px] border border-enhanced-pitch/20 bg-enhanced-pitch/10 px-1.5 py-0.5 text-[10px] font-bold text-enhanced-pitch">
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

        <div className="shrink-0 border-l border-enhanced-line pl-3 text-right lg:pl-5">
          <div className="text-[10px] font-bold text-enhanced-supporting">
            年龄
          </div>
          <div className="text-xl font-black tabular-nums">
            {header.age}
          </div>
          <div className="text-[11px] font-bold text-enhanced-pitch">
            {formatMarketValue(header.marketValue)}
          </div>
        </div>

        <dl className="col-span-3 mt-3 grid grid-cols-4 divide-x divide-enhanced-line lg:col-span-1 lg:mt-0">
          {(
            [
              ["出场", totals.appearances],
              ["进球", totals.goals],
              ["助攻", totals.assists],
              ["奖杯", totals.trophies],
            ] as const
          ).map(([label, value]) => (
            <div className="px-2 text-center lg:min-w-20 lg:px-4" key={label}>
              <dt className="text-[9px] font-bold text-enhanced-supporting lg:text-[10px]">
                {label}
              </dt>
              <dd className="mt-0.5 text-base font-extrabold tabular-nums lg:text-lg">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
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
      className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-enhanced-focus sm:px-6 lg:rounded-[16px] lg:border lg:border-enhanced-line lg:bg-enhanced-surface lg:p-5"
      data-enhanced-timeline=""
      tabIndex={0}
    >
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.12em] text-enhanced-pitch">
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
          <span className="text-enhanced-ink-2 tabular-nums">
            {recordedSeasons}
          </span>{" "}
          赛季
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-enhanced-line bg-enhanced-canvas/10">
        <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 border-b border-enhanced-line px-2.5 py-2 text-[9px] font-bold text-enhanced-supporting">
          <span>岁</span>
          <span>俱乐部</span>
          <span className="text-center">能力</span>
          <span className="text-right">场</span>
          <span className="text-right">球</span>
          <span className="text-right">助</span>
        </div>

        <div className="divide-y divide-enhanced-line-soft">
          {view.timeline.map((row) => (
            <TimelineRow key={row.age} row={row} />
          ))}
          <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 bg-enhanced-surface px-2.5 py-2">
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
        className={`${gridClass} bg-enhanced-pitch/[0.06]`}
        data-enhanced-season-row="current"
      >
        <span className="text-xs font-black tabular-nums text-enhanced-pitch">
          {row.age}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-enhanced-pitch">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-enhanced-pitch"
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
      <span className="text-xs font-black tabular-nums text-enhanced-supporting">
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
        <span className="inline-block min-w-8 rounded-[6px] border border-enhanced-trophy/35 bg-enhanced-trophy/40 px-1 py-0.5 text-[11px] font-black tabular-nums text-enhanced-trophy">
          {row.overall}
        </span>
      </span>
      <SeasonNumber>{row.stats.appearances}</SeasonNumber>
      <SeasonNumber>{row.stats.goals}</SeasonNumber>
      <SeasonNumber>{row.stats.assists}</SeasonNumber>
      <CareerSeasonNarrative row={row} variant="enhanced" />
    </div>
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
    <span className="text-right text-xs tabular-nums text-enhanced-ink-2">
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
    "min-h-0 max-h-[48dvh] overflow-y-auto overscroll-contain border-t border-enhanced-line bg-enhanced-surface px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:h-full lg:max-h-none lg:w-[380px] lg:rounded-[16px] lg:border lg:p-5";
  const simulating = panel.kind === "simulating";
  const labelledBy =
    panel.kind === "event_result"
      ? "enhanced-event-result-heading"
      : panel.kind === "milestone"
        ? "enhanced-milestone-heading"
        : panel.kind === "decision"
          ? "enhanced-decision-heading"
          : undefined;

  return (
    <aside
      aria-label={simulating ? "赛季状态" : undefined}
      aria-labelledby={labelledBy}
      className={`${railClass}${
        simulating
          ? " flex flex-col items-center justify-center"
          : ""
      }`}
      data-enhanced-decision-rail=""
    >
      {challenge ? (
        <div className={simulating ? "mb-4 w-full" : "mb-4"}>
          <ChallengeProgressPanel {...challenge} />
        </div>
      ) : null}
      {panel.kind === "simulating" ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="flex items-center gap-2 text-sm font-bold text-enhanced-supporting"
          role="status"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-enhanced-pitch"
          />
          赛季进行中
        </p>
      ) : panel.kind === "event_result" ? (
        <div className="enhanced-reveal-enter">
          <CareerEventResultNarrative
            headingId="enhanced-event-result-heading"
            panel={panel}
            variant="enhanced"
          />
        </div>
      ) : panel.kind === "milestone" ? (
        <div
          className="enhanced-reveal-enter"
          data-enhanced-milestone-reveal=""
        >
          <p className="text-[10px] font-bold tracking-[0.12em] text-enhanced-trophy">
            MILESTONE · {panel.age} 岁 · {panel.club.shortName}
          </p>
          <h2
            className="mt-1.5 text-[22px] font-extrabold leading-tight"
            id="enhanced-milestone-heading"
          >
            {panel.title}
          </h2>
          <CareerMilestoneNarrative
            honors={panel.honors}
            nationalTournaments={panel.nationalTournaments}
            statuses={panel.statuses}
            tierChange={panel.tierChange}
            variant="enhanced"
          />
        </div>
      ) : (
        <>
          {view.recentEventResult ? (
            <CareerRecentEventResult
              result={view.recentEventResult}
              variant="enhanced"
            />
          ) : null}
          <p className="text-[10px] font-bold tracking-[0.12em] text-enhanced-pitch">
            DECISION RAIL · {panel.age} 岁
          </p>
          <h2
            className="mt-1.5 text-[22px] font-extrabold leading-tight"
            id="enhanced-decision-heading"
          >
            {panel.title}
          </h2>
          <p className="mt-2 text-[13px] leading-[1.7] text-enhanced-supporting">
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
        </>
      )}
    </aside>
  );
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
      className="block min-h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface p-3 text-left outline-none transition-[transform,background-color,border-color] hover:border-enhanced-pitch/40 hover:bg-enhanced-pitch/[0.06] focus-visible:ring-2 focus-visible:ring-enhanced-focus focus-visible:ring-offset-2 focus-visible:ring-offset-enhanced-surface active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
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
              className="text-lg text-enhanced-pitch"
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
      return "text-enhanced-success";
    case "primary":
      return "text-enhanced-pitch";
    case "warning":
      return "text-enhanced-trophy";
    case "danger":
      return "text-enhanced-alert";
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
