import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "../../classic/careerPresentation";
import {
  createMarketValuePresentation,
  createYuanPresentation,
  getCareerMetricPresentation,
  type CareerMetricPresentation,
} from "../../classic/careerPresentation";
import {
  ChallengeProgressPanel,
  type ChallengeSurface,
} from "../../../features/challenges/ChallengeProgressPanel";
import {
  CareerDecisionEssentials,
  CareerDecisionEconomyDetails,
  CareerEventResultNarrative,
  CareerRecentEventResult,
  CareerSeasonEconomy,
  EnhancedExactMoneyMetric,
  ExactMoneyDisclosure,
} from "../../shared/CareerMilestoneNarrative";
import { useDecisionFocusRestore } from "../../shared/useDecisionFocusRestore";
import { useReducedMotion } from "../../shared/useReducedMotion";
import { ClubIdentity } from "../../classic/components/ClubIdentity";
import { EnhancedAppBar } from "../components/EnhancedAppBar";
import { useTimelineFollow } from "./useTimelineFollow";

const CareerKeyEventDialog = lazy(async () => {
  const module = await import("./CareerKeyEventDialog");
  return { default: module.CareerKeyEventDialog };
});

type EnhancedCareerScreenProps = {
  readonly challenge?: ChallengeSurface;
  readonly onChoose: (
    decisionId: string,
    optionId: string,
  ) => boolean | void;
  readonly onContinueReveal?: () => void;
  readonly onOpenArchive?: () => void;
  readonly statusMessage?: string | null;
  readonly view: CareerPresentation;
};

type ChoiceReceipt = {
  readonly decisionId: string;
  readonly option: CareerDecisionOptionPresentation;
  readonly selectedAt: number;
};

const MINIMUM_CHOICE_RECEIPT_MS = 150;

export function EnhancedCareerScreen({
  challenge,
  onChoose,
  onContinueReveal,
  onOpenArchive,
  statusMessage,
  view,
}: EnhancedCareerScreenProps) {
  const choiceGuardRef = useRef<string | null>(null);
  const [choiceReceipt, setChoiceReceipt] =
    useState<ChoiceReceipt | null>(null);
  const nextDecisionId =
    view.panel.kind === "decision"
      ? view.panel.decisionId
      : null;

  useEffect(() => {
    if (
      choiceReceipt === null ||
      nextDecisionId === null ||
      nextDecisionId === choiceReceipt.decisionId
    ) {
      return;
    }

    const elapsed =
      performance.now() - choiceReceipt.selectedAt;
    const delay = Math.max(
      0,
      MINIMUM_CHOICE_RECEIPT_MS - elapsed,
    );
    const timer = window.setTimeout(() => {
      choiceGuardRef.current = null;
      setChoiceReceipt(null);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [choiceReceipt, nextDecisionId]);

  const choose = (
    decisionId: string,
    option: CareerDecisionOptionPresentation,
  ) => {
    if (choiceGuardRef.current !== null) {
      return;
    }

    choiceGuardRef.current = decisionId;

    try {
      const accepted = onChoose(decisionId, option.id);

      if (accepted === false) {
        choiceGuardRef.current = null;
        return;
      }

      setChoiceReceipt({
        decisionId,
        option,
        selectedAt: performance.now(),
      });
    } catch (error) {
      choiceGuardRef.current = null;
      throw error;
    }
  };

  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-career-shell=""
      data-hallmark-macrostructure="Workbench"
      data-scroll-boundary="viewport"
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
        className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,7fr)_380px] lg:grid-rows-1 lg:gap-6 lg:p-6"
        data-enhanced-career-layout=""
      >
        <CareerTimeline view={view} />
        <DecisionRail
          confirm={onContinueReveal}
          choose={choose}
          progress={challenge}
          receipt={choiceReceipt}
          view={view}
        />
      </div>
      {view.panel.kind === "milestone" ? (
        <Suspense
          fallback={
            <DeferredSurfaceStatus label="关键事件" />
          }
        >
          <CareerKeyEventDialog
            onContinue={onContinueReveal ?? (() => undefined)}
            panel={view.panel}
          />
        </Suspense>
      ) : null}
    </main>
  );
}

function CareerHeader({
  view,
}: {
  readonly view: CareerPresentation;
}) {
  const { header, totals } = view;
  const marketValue = createMarketValuePresentation(
    header.marketValue,
  );
  const annualSalary =
    view.economy?.annualSalary === null ||
    view.economy === null
      ? null
      : createYuanPresentation(view.economy.annualSalary);
  const totalIncome =
    view.economy === null
      ? null
      : createYuanPresentation(view.economy.totalIncome);
  const summaryMetrics = [
    ...getCareerMetricPresentation(view.goalkeeper, totals),
    { label: "奖杯" as const, value: totals.trophies },
  ];

  return (
    <header
      className="shrink-0 border-b border-enhanced-line bg-enhanced-canvas px-4 py-2 sm:px-6 lg:px-8 lg:py-3"
      data-enhanced-career-header=""
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(20rem,auto)] lg:gap-5"
          data-enhanced-career-identity=""
        >
          <div
            className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[8px] border border-enhanced-trophy/40 bg-enhanced-surface text-enhanced-trophy"
            data-enhanced-career-overall=""
          >
            <span className="text-xs font-bold leading-none text-enhanced-trophy">
              能力
            </span>
            <strong className="mt-[2px] text-xl font-black leading-none tabular-nums">
              {header.overall}
            </strong>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="flex flex-wrap items-center gap-2"
              data-enhanced-player-badges=""
            >
              <span className="rounded-[6px] border border-enhanced-line bg-enhanced-surface px-[6px] py-[2px] text-xs font-bold text-enhanced-ink-2">
                {header.countryFlag} {header.countryCode}
              </span>
              <span className="rounded-[6px] border border-enhanced-pitch/20 bg-enhanced-pitch/10 px-[6px] py-[2px] text-xs font-bold text-enhanced-pitch">
                #{header.number} {header.position}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {header.club ? (
                <ClubIdentity club={header.club} size={22} />
              ) : null}
              <span className="truncate text-base font-extrabold">
                {header.club?.shortName ?? "自由身"}
              </span>
            </div>
          </div>

          <div className="shrink-0 border-l border-enhanced-line pl-2 text-right lg:pl-5">
            <div className="text-xs font-bold text-enhanced-supporting">
              年龄
            </div>
            <div className="text-xl font-black tabular-nums">
              {header.age}
            </div>
          </div>

          <dl className="hidden grid-cols-4 divide-x divide-enhanced-line lg:col-span-1 lg:grid">
            {summaryMetrics.map(({ label, value }) => (
              <div
                className="px-2 text-center lg:min-w-20 lg:px-4"
                key={label}
              >
                <dt className="text-xs font-bold text-enhanced-supporting">
                  {label}
                </dt>
                <dd className="mt-1 text-base font-extrabold tabular-nums lg:text-lg">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          className="mt-2 grid min-h-11 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] divide-x divide-enhanced-line rounded-[8px] border border-enhanced-line bg-enhanced-surface lg:grid-cols-3"
          data-enhanced-primary-career-facts=""
        >
          <EnhancedExactMoneyMetric
            currency={marketValue.currency}
            fullValue={marketValue.full}
            label="身价"
            value={marketValue.compact}
          />
          <EnhancedExactMoneyMetric
            {...(annualSalary === null
              ? {}
              : {
                  currency: annualSalary.currency,
                  fullValue: annualSalary.full,
                })}
            label="年薪"
            value={
              view.economy === null
                ? "—"
                : view.economy.annualSalary === null
                  ? "暂无合同"
                  : annualSalary?.compact ?? "—"
            }
          />
          <details
            className="relative"
            data-enhanced-career-economy-details=""
            data-enhanced-secondary-career-facts=""
          >
            <summary className="flex min-h-11 items-center justify-center px-2 text-center text-xs font-bold text-enhanced-pitch">
              生涯收入与明细
            </summary>
            <div
              className="absolute right-0 z-[var(--z-dropdown)] mt-1 rounded-[8px] border border-enhanced-line bg-enhanced-raised p-3"
              data-enhanced-secondary-career-panel=""
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {summaryMetrics.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-enhanced-supporting">
                      {label}
                    </dt>
                    <dd className="mt-[2px] break-words text-sm font-bold leading-tight tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-enhanced-supporting">
                    累计收入
                  </dt>
                  <dd className="mt-[2px] break-words text-sm font-bold leading-tight tabular-nums">
                    <ExactMoneyDisclosure
                      currency={totalIncome?.currency}
                      fullValue={totalIncome?.full}
                      label="累计收入"
                      value={
                        view.economy === null
                          ? "—"
                          : totalIncome?.compact ?? "—"
                      }
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        </div>
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
  const activeAge = view.timeline.findLast(
    (row) => row.kind === "current" || row.kind === "season",
  )?.age ?? null;
  const timelineFollow = useTimelineFollow({
    activeAge,
    reducedMotion: useReducedMotion(),
  });
  const nationalMetrics = getCareerMetricPresentation(
    view.goalkeeper,
    view.nationalTeam.stats,
  );

  return (
    <section
      aria-labelledby="enhanced-timeline-heading"
      className="flex min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:rounded-[16px] lg:border lg:border-enhanced-line lg:bg-enhanced-surface lg:p-5"
      data-enhanced-timeline=""
    >
      <div
        className="mb-3 flex shrink-0 items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs font-bold tracking-[0.10em] text-enhanced-pitch">
            SEASON ARCHIVE
          </p>
          <h1
            className="mt-1 text-[22px] font-extrabold leading-tight"
            id="enhanced-timeline-heading"
          >
            生涯时间线
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-enhanced-supporting">
            已记录{" "}
            <span className="text-enhanced-ink-2 tabular-nums">
              {recordedSeasons}
            </span>{" "}
            赛季
          </p>
          {!timelineFollow.isFollowing ? (
            <button
              className="mt-1 min-h-11 rounded-[8px] px-2 text-xs font-bold text-enhanced-pitch"
              data-enhanced-return-latest=""
              onClick={timelineFollow.resume}
              type="button"
            >
              回到最新
            </button>
          ) : null}
        </div>
      </div>

      <div
        aria-label="生涯赛季数据"
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-enhanced-line bg-enhanced-canvas/10"
        role="table"
      >
        <div className="sr-only" role="row">
          <span role="columnheader">年龄</span>
          <span role="columnheader">俱乐部</span>
          <span role="columnheader">能力</span>
          {nationalMetrics.map(({ label }) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="enhanced-timeline-grid grid shrink-0 items-center gap-1 border-b border-enhanced-line px-3 py-2 text-xs font-bold text-enhanced-supporting"
        >
          <span>岁</span>
          <span>俱乐部</span>
          <span className="text-center">能力</span>
          {nationalMetrics.map(({ label }) => (
            <span className="text-right" key={label}>
              {label}
            </span>
          ))}
        </div>

        <div
          aria-label="生涯年份"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-scroll-region="career-timeline"
          onKeyDown={timelineFollow.onKeyDown}
          onPointerDown={timelineFollow.onPointerDown}
          onTouchStart={timelineFollow.onTouchStart}
          onWheel={timelineFollow.onWheel}
          ref={timelineFollow.containerRef}
          role="region"
          tabIndex={0}
        >
          <div
            className="divide-y divide-enhanced-line-soft"
            data-enhanced-timeline-rows=""
            role="rowgroup"
          >
            {view.timeline.map((row) => (
              <TimelineRow
                goalkeeper={view.goalkeeper}
                key={row.age}
                metrics={nationalMetrics}
                row={row}
              />
            ))}
            <CareerTimelineSemanticRow
              club={view.nationalTeam.name}
              metrics={nationalMetrics}
              overall={null}
            >
              <div
                aria-hidden="true"
                className="enhanced-timeline-grid grid items-center gap-1 bg-enhanced-surface px-3 py-2"
              >
                <span className="text-center text-sm">
                  {view.nationalTeam.countryFlag}
                </span>
                <span className="truncate text-xs font-bold text-enhanced-supporting">
                  {view.nationalTeam.name}
                </span>
                <span />
                {nationalMetrics.map(({ label, value }) => (
                  <span
                    className="text-right text-xs tabular-nums text-enhanced-supporting"
                    key={label}
                  >
                    {value}
                  </span>
                ))}
              </div>
            </CareerTimelineSemanticRow>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  goalkeeper,
  metrics: emptyMetrics,
  row,
}: {
  readonly goalkeeper: boolean;
  readonly metrics: readonly CareerMetricPresentation[];
  readonly row: CareerTimelineRowPresentation;
}) {
  const gridClass =
    "enhanced-timeline-grid grid items-center gap-1 px-3 py-2";

  if (row.kind === "current") {
    return (
      <CareerTimelineSemanticRow
        age={row.age}
        club="决策中"
        current="step"
        metrics={emptyMetrics}
        overall={null}
      >
        <div
          aria-hidden="true"
          className={`${gridClass} min-h-11 bg-enhanced-pitch/[0.06]`}
        >
          <span className="text-xs font-black tabular-nums text-enhanced-pitch">
            {row.age}
          </span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-enhanced-pitch">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-enhanced-pitch" />
            决策中
          </span>
          <span />
          <span />
          <span />
          <span />
        </div>
      </CareerTimelineSemanticRow>
    );
  }

  if (row.kind === "empty") {
    return (
      <CareerTimelineSemanticRow
        age={row.age}
        club="待书写"
        metrics={emptyMetrics}
        overall={null}
      >
        <div aria-hidden="true" className={gridClass}>
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
      </CareerTimelineSemanticRow>
    );
  }

  const metrics = getCareerMetricPresentation(
    goalkeeper,
    row.stats,
  );

  return (
    <CareerTimelineSemanticRow
      age={row.age}
      club={row.club.shortName}
      metrics={metrics}
      overall={row.overall}
    >
      <details data-enhanced-season-row="season">
        <summary aria-label={`${row.age} 岁赛季详情`}>
          <span
            aria-hidden="true"
            className={`${gridClass} min-h-11`}
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
                <span className="block truncate text-xs text-enhanced-supporting">
                  {row.club.subtitle.replace(" · 次级联赛", "")}
                </span>
              </span>
            </span>
            <span className="text-center">
              <span className="inline-block min-w-8 rounded-[6px] border border-enhanced-trophy/35 bg-enhanced-surface px-1 py-1 text-xs font-black tabular-nums text-enhanced-trophy">
                {row.overall}
              </span>
            </span>
            {metrics.map(({ label, value }) => (
              <span
                className="text-right text-xs tabular-nums text-enhanced-ink-2"
                key={label}
              >
                {value}
              </span>
            ))}
          </span>
        </summary>
        <div className="border-t border-enhanced-line-soft px-2 pb-2">
          <CareerSeasonEconomy row={row} variant="enhanced" />
        </div>
      </details>
    </CareerTimelineSemanticRow>
  );
}

function CareerTimelineSemanticRow({
  age,
  children,
  club,
  current,
  metrics,
  overall,
}: {
  readonly age?: number;
  readonly children: ReactNode;
  readonly club: string;
  readonly current?: "step";
  readonly metrics: readonly CareerMetricPresentation[];
  readonly overall: number | null;
}) {
  return (
    <div
      aria-current={current}
      data-career-season-row={age}
      role="row"
    >
      <span className="sr-only" role="rowheader">
        {age === undefined ? "国家队汇总" : `${age} 岁`}
      </span>
      <div aria-label={club} role="cell">
        {children}
      </div>
      <span className="sr-only" role="cell">
        {overall ?? "—"}
      </span>
      {metrics.map(({ label, value }) => (
        <span className="sr-only" key={label} role="cell">
          {age !== undefined && overall === null ? "—" : value}
        </span>
      ))}
    </div>
  );
}

function DecisionRail({
  confirm,
  choose,
  progress,
  receipt,
  view,
}: {
  readonly confirm?: (() => void) | undefined;
  readonly choose: (
    decisionId: string,
    option: CareerDecisionOptionPresentation,
  ) => void;
  readonly progress: ChallengeSurface | undefined;
  readonly receipt: ChoiceReceipt | null;
  readonly view: CareerPresentation;
}) {
  const { panel } = view;
  const decisionFocusRef =
    useDecisionFocusRestore<HTMLElement>(
      panel.kind === "decision" && receipt === null
        ? panel.decisionId
        : null,
    );
  const simulating = panel.kind === "simulating";
  const labelledBy =
    panel.kind === "event_result"
      ? "enhanced-event-result-heading"
      : panel.kind === "decision"
          ? "enhanced-decision-heading"
          : undefined;

  return (
    <aside
      aria-label={simulating ? "赛季状态" : undefined}
      aria-labelledby={labelledBy}
      aria-busy={simulating || undefined}
      className={`lg:w-[380px]${
        simulating
          ? " flex flex-col items-center justify-center"
          : ""
      }`}
      data-enhanced-decision-rail=""
      data-scroll-region="decision-rail"
      ref={decisionFocusRef}
    >
      {receipt ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="sr-only"
          data-enhanced-choice-receipt=""
          id="enhanced-choice-receipt"
          role="status"
        >
          已选择：{receipt.option.title}。正在提交本次选择
        </p>
      ) : null}
      {receipt && panel.kind !== "decision" ? (
        <div className="mb-3 w-full">
          <DecisionOption
            disabled
            option={receipt.option}
            selected
          />
        </div>
      ) : null}
      {progress ? (
        <>
          <details
            className="mb-3 lg:hidden"
            data-enhanced-challenge-disclosure=""
          >
            <summary className="flex min-h-11 items-center justify-between border-y border-enhanced-line text-xs font-bold text-enhanced-pitch">
              挑战进度
              <span aria-hidden="true">＋</span>
            </summary>
            <ChallengeProgressPanel {...progress} />
          </details>
          <div
            className={`${simulating ? "mb-4 w-full" : "mb-4"} hidden lg:block`}
          >
            <ChallengeProgressPanel {...progress} />
          </div>
        </>
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
            onContinue={confirm}
            panel={panel}
            variant="enhanced"
          />
        </div>
      ) : panel.kind === "milestone" ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="flex items-center gap-2 text-sm font-bold text-enhanced-trophy"
          role="status"
        >
          关键事件等待确认
        </p>
      ) : (
        <>
          {view.recentEventResult ? (
            <CareerRecentEventResult
              result={view.recentEventResult}
              variant="enhanced"
            />
          ) : null}
          <p
            className="text-xs font-bold tracking-[0.10em] text-enhanced-pitch"
            data-enhanced-decision-eyebrow=""
          >
            DECISION RAIL · {panel.age} 岁
          </p>
          <h2
            className="mt-2 text-[22px] font-extrabold leading-tight"
            id="enhanced-decision-heading"
          >
            {panel.title}
          </h2>
          <p className="mt-2 text-[13px] leading-[1.7] text-enhanced-supporting">
            {panel.description}
          </p>
          <DecisionComparison options={panel.options} />
          <div
            className="mt-3 space-y-3"
            data-enhanced-decision-options=""
          >
            {panel.options.map((option) => (
              <DecisionOption
                disabled={receipt !== null}
                key={option.id}
                onChoose={() =>
                  choose(panel.decisionId, option)
                }
                option={option}
                selected={
                  receipt?.decisionId ===
                    panel.decisionId &&
                  receipt.option.id === option.id
                }
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function DecisionComparison({
  options,
}: {
  readonly options: readonly CareerDecisionOptionPresentation[];
}) {
  return (
    <ul
      aria-label="选项首屏比较"
      data-enhanced-mobile-decision-comparison=""
    >
      {options.map((option) => (
        <li
          data-enhanced-decision-comparison-option=""
          key={option.id}
        >
          <strong className="min-w-0 truncate text-xs">
            {option.club?.name ?? option.title}
          </strong>
          <CareerDecisionEssentials option={option} />
        </li>
      ))}
    </ul>
  );
}

function DeferredSurfaceStatus({
  label,
}: {
  readonly label: string;
}) {
  return (
    <p
      aria-live="polite"
      className="text-xs text-enhanced-supporting"
      role="status"
    >
      正在加载{label}
    </p>
  );
}

function DecisionOption({
  disabled,
  onChoose,
  option,
  selected,
}: {
  readonly disabled: boolean;
  readonly onChoose?: () => void;
  readonly option: CareerDecisionOptionPresentation;
  readonly selected: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] border transition-opacity ${
        selected
          ? "border-enhanced-pitch bg-enhanced-pitch/[0.08] text-enhanced-pitch"
          : "border-enhanced-line bg-enhanced-surface"
      }`}
      data-enhanced-decision-card=""
      data-choice-state={
        selected ? "selected" : disabled ? "pending-sibling" : "idle"
      }
    >
      <button
        aria-describedby={
          disabled ? "enhanced-choice-receipt" : undefined
        }
        aria-pressed={selected}
        className="block min-h-12 w-full p-3 text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-enhanced-focus active:translate-y-px motion-reduce:transform-none"
        data-career-decision-option=""
        disabled={disabled}
        onClick={onChoose}
        type="button"
      >
        <span className="flex items-start gap-3">
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
              className={`mt-1 block text-xs text-enhanced-supporting ${
                option.club ? "truncate" : "whitespace-normal leading-4"
              }`}
            >
              {option.subtitle}
            </span>
            <CareerDecisionEssentials option={option} />
          </span>
          {selected ? (
            <span
              aria-hidden="true"
              className="shrink-0 text-base font-black text-enhanced-pitch"
            >
              ✓
            </span>
          ) : null}
        </span>
      </button>
      <CareerDecisionEconomyDetails
        option={option}
        variant="enhanced"
      />
    </div>
  );
}
