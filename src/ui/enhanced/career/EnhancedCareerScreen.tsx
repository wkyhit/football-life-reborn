import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "../../classic/careerPresentation";
import {
  createMarketValuePresentation,
  createYuanPresentation,
  type CareerCurrencyPresentation,
} from "../../classic/careerPresentation";
import {
  ChallengeProgressPanel,
  type ChallengeSurface,
} from "../../../features/challenges/ChallengeProgressPanel";
import {
  CareerDecisionEconomyDetails,
  CareerEventResultNarrative,
  CareerRecentEventResult,
  CareerSeasonEconomy,
} from "../../shared/CareerMilestoneNarrative";
import { useDecisionFocusRestore } from "../../shared/useDecisionFocusRestore";
import { useReducedMotion } from "../../shared/useReducedMotion";
import { ClubIdentity } from "../../classic/components/ClubIdentity";
import { EnhancedAppBar } from "../components/EnhancedAppBar";
import { CareerKeyEventDialog } from "./CareerKeyEventDialog";
import { useTimelineFollow } from "./useTimelineFollow";

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
  readonly optionId: string;
  readonly selectedAt: number;
  readonly title: string;
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
        optionId: option.id,
        selectedAt: performance.now(),
        title: option.title,
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
          choiceReceipt={choiceReceipt}
          onChoose={choose}
          view={view}
          {...(challenge === undefined ? {} : { challenge })}
        />
      </div>
      {view.panel.kind === "milestone" ? (
        <CareerKeyEventDialog
          onContinue={onContinueReveal ?? (() => undefined)}
          panel={view.panel}
        />
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

  return (
    <header
      className="shrink-0 border-b border-enhanced-line bg-enhanced-canvas px-4 py-2 sm:px-6 lg:px-8 lg:py-3"
      data-enhanced-career-header=""
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(20rem,auto)] lg:gap-5">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[8px] border border-enhanced-trophy/40 bg-enhanced-surface text-enhanced-trophy">
            <span className="text-xs font-bold leading-none text-enhanced-trophy">
              能力
            </span>
            <strong className="mt-0.5 text-xl font-black leading-none tabular-nums">
              {header.overall}
            </strong>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[6px] border border-enhanced-line bg-enhanced-surface px-1.5 py-0.5 text-xs font-bold text-enhanced-ink-2">
                {header.countryFlag} {header.countryCode}
              </span>
              <span className="rounded-[6px] border border-enhanced-pitch/20 bg-enhanced-pitch/10 px-1.5 py-0.5 text-xs font-bold text-enhanced-pitch">
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
            {(
              [
                ["出场", totals.appearances],
                ["进球", totals.goals],
                ["助攻", totals.assists],
                ["奖杯", totals.trophies],
              ] as const
            ).map(([label, value]) => (
              <div className="px-2 text-center lg:min-w-20 lg:px-4" key={label}>
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
          <HeaderMetric
            currency={marketValue.currency}
            fullValue={marketValue.full}
            label="身价"
            value={marketValue.compact}
          />
          <HeaderMetric
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
                {(
                  [
                    ["出场", totals.appearances],
                    ["进球", totals.goals],
                    ["助攻", totals.assists],
                    ["奖杯", totals.trophies],
                    [
                      "累计收入",
                      view.economy === null
                        ? "—"
                        : totalIncome?.compact ?? "—",
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-enhanced-supporting">
                      {label}
                    </dt>
                    <dd
                      aria-label={
                        label === "累计收入" &&
                        totalIncome !== null
                          ? `累计收入：${totalIncome.full}`
                          : undefined
                      }
                      className="mt-0.5 break-words text-sm font-bold leading-tight tabular-nums"
                      data-currency={
                        label === "累计收入"
                          ? totalIncome?.currency
                          : undefined
                      }
                      title={
                        label === "累计收入"
                          ? totalIncome?.full
                          : undefined
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function HeaderMetric({
  className = "",
  currency,
  fullValue,
  label,
  value,
}: {
  readonly className?: string;
  readonly currency?: CareerCurrencyPresentation["currency"];
  readonly fullValue?: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <dl className={`min-w-0 px-2 py-1.5 text-center ${className}`}>
      <dt className="text-xs font-bold text-enhanced-supporting">
        {label}
      </dt>
      <dd
        aria-label={
          fullValue === undefined
            ? undefined
            : `${label}：${fullValue}`
        }
        className="mt-0.5 min-w-0 break-words text-xs font-bold leading-tight tabular-nums"
        data-currency={currency}
        title={fullValue}
      >
        {value}
      </dd>
    </dl>
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
  const activeAge = [...view.timeline]
    .reverse()
    .find(
      (row) => row.kind === "current" || row.kind === "season",
    )?.age ?? null;
  const timelineFollow = useTimelineFollow({
    activeAge,
    reducedMotion: useReducedMotion(),
  });

  return (
    <section
      aria-labelledby="enhanced-timeline-heading"
      className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-enhanced-focus sm:px-6 lg:rounded-[16px] lg:border lg:border-enhanced-line lg:bg-enhanced-surface lg:p-5"
      data-enhanced-timeline=""
      onKeyDown={timelineFollow.onKeyDown}
      onTouchStart={timelineFollow.onTouchStart}
      onWheel={timelineFollow.onWheel}
      ref={timelineFollow.containerRef}
      tabIndex={0}
    >
      <div className="mb-3 flex items-end justify-between gap-4">
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

      <div className="overflow-hidden rounded-[10px] border border-enhanced-line bg-enhanced-canvas/10">
        <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 border-b border-enhanced-line px-3 py-2 text-xs font-bold text-enhanced-supporting">
          <span>岁</span>
          <span>俱乐部</span>
          <span className="text-center">能力</span>
          <span className="text-right">场</span>
          <span className="text-right">球</span>
          <span className="text-right">助</span>
        </div>

        <div
          className="divide-y divide-enhanced-line-soft"
          data-enhanced-timeline-rows=""
        >
          {view.timeline.map((row) => (
            <TimelineRow key={row.age} row={row} />
          ))}
          <div className="grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 bg-enhanced-surface px-3 py-2">
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
    "grid grid-cols-[32px_minmax(0,1fr)_42px_32px_32px_32px] items-center gap-1 px-3 py-2";

  if (row.kind === "current") {
    return (
      <div
        aria-current="step"
        className={`${gridClass} bg-enhanced-pitch/[0.06]`}
        data-career-season-row={row.age}
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
        data-career-season-row={row.age}
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
      data-career-season-row={row.age}
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
      <SeasonNumber>{row.stats.appearances}</SeasonNumber>
      <SeasonNumber>{row.stats.goals}</SeasonNumber>
      <SeasonNumber>{row.stats.assists}</SeasonNumber>
      <CareerSeasonEconomy row={row} variant="enhanced" />
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
  choiceReceipt,
  onChoose,
  view,
}: {
  readonly challenge?: ChallengeSurface;
  readonly choiceReceipt: ChoiceReceipt | null;
  readonly onChoose: (
    decisionId: string,
    option: CareerDecisionOptionPresentation,
  ) => void;
  readonly view: CareerPresentation;
}) {
  const { panel } = view;
  const decisionFocusRef =
    useDecisionFocusRestore<HTMLElement>(
      panel.kind === "decision" && choiceReceipt === null
        ? panel.decisionId
        : null,
    );
  const railClass =
    "min-h-0 overflow-y-auto overscroll-contain border-t border-enhanced-line bg-enhanced-surface px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:h-full lg:max-h-none lg:w-[380px] lg:rounded-[16px] lg:border lg:p-5";
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
      aria-busy={choiceReceipt === null ? undefined : true}
      className={`${railClass}${
        simulating
          ? " flex flex-col items-center justify-center"
          : ""
      }`}
      data-enhanced-decision-rail=""
      ref={decisionFocusRef}
    >
      {choiceReceipt ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="mb-3 border-l-2 border-enhanced-pitch bg-enhanced-pitch/[0.06] px-3 py-2 text-xs text-enhanced-strong"
          data-enhanced-choice-receipt=""
          id="enhanced-choice-receipt"
          role="status"
        >
          <strong className="block text-enhanced-pitch">
            已选择：{choiceReceipt.title}
          </strong>
          <span className="mt-1 block text-enhanced-supporting">
            正在提交本次选择
          </span>
        </div>
      ) : null}
      {challenge ? (
        <>
          <details
            className="mb-3 lg:hidden"
            data-enhanced-challenge-disclosure=""
          >
            <summary className="flex min-h-11 items-center justify-between border-y border-enhanced-line text-xs font-bold text-enhanced-pitch">
              挑战进度
              <span aria-hidden="true">＋</span>
            </summary>
            <ChallengeProgressPanel {...challenge} />
          </details>
          <div
            className={`${simulating ? "mb-4 w-full" : "mb-4"} hidden lg:block`}
          >
            <ChallengeProgressPanel {...challenge} />
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
          <p className="text-xs font-bold tracking-[0.10em] text-enhanced-pitch">
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
          <div
            className="mt-3 space-y-3"
            data-enhanced-decision-options=""
          >
            {panel.options.map((option) => (
              <DecisionOption
                disabled={choiceReceipt !== null}
                key={option.id}
                onChoose={() =>
                  onChoose(panel.decisionId, option)
                }
                option={option}
                selected={
                  choiceReceipt?.decisionId ===
                    panel.decisionId &&
                  choiceReceipt.optionId === option.id
                }
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function DecisionOption({
  disabled,
  onChoose,
  option,
  selected,
}: {
  readonly disabled: boolean;
  readonly onChoose: () => void;
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
              className={`mt-1 block text-xs text-enhanced-supporting ${
                option.club ? "truncate" : "whitespace-normal leading-4"
              }`}
            >
              {option.subtitle}
            </span>
          </span>
          {option.role ? (
            <span className="shrink-0 text-right">
              <span
                className={`block text-xs font-bold ${roleToneClass(option.roleTone)}`}
              >
                {option.role}
              </span>
              <span className="block text-xs text-enhanced-supporting">
                {option.stars}
              </span>
            </span>
          ) : null}
          {selected ? (
            <span
              aria-hidden="true"
              className="shrink-0 text-base font-black text-enhanced-pitch"
            >
              ✓
            </span>
          ) : null}
        </span>
        <span className="sr-only">
          合同与完整故事可在本选项下方展开
        </span>
      </button>
      <CareerDecisionEconomyDetails
        option={option}
        variant="enhanced"
      />
    </div>
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
