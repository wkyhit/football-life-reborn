import {
  ChallengeProgressPanel,
  type ChallengeSurface,
} from "../../../features/challenges/ChallengeProgressPanel";
import type {
  SummaryHonorPresentation,
  SummaryPresentation,
  SummaryTitlePresentation,
} from "../../classic/summaryPresentation";
import { ClubIdentity } from "../../classic/components/ClubIdentity";
import { HonorIdentity } from "../../shared/HonorIdentity";
import { EnhancedAction } from "../components/EnhancedAction";
import { EnhancedAppBar } from "../components/EnhancedAppBar";

export type EnhancedChallengeSummarySurface =
  ChallengeSurface & {
    readonly replayUrl: string;
  };

type EnhancedSummaryScreenProps = {
  readonly challenge?: EnhancedChallengeSummarySurface;
  readonly contextLabel?: string;
  readonly onCopyReplay?: () => void;
  readonly onOpenArchive?: () => void;
  readonly onRestart: () => void;
  readonly onShare: () => void;
  readonly replayCopyMessage?: string | null;
  readonly view: SummaryPresentation;
};

/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */
export function EnhancedSummaryScreen({
  challenge,
  contextLabel = "生涯总结",
  onCopyReplay,
  onOpenArchive,
  onRestart,
  onShare,
  replayCopyMessage,
  view,
}: EnhancedSummaryScreenProps) {
  const replayCopySucceeded =
    replayCopyMessage === "回放链接已复制";
  const replayCopyFailed =
    replayCopyMessage?.startsWith("复制失败") === true;

  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-summary-screen=""
      data-hallmark-macrostructure="Index-First"
      id="main-content"
      tabIndex={-1}
    >
      <EnhancedAppBar
        actions={
          onOpenArchive ? (
            <button
              aria-label="生涯档案"
              className="min-h-11 min-w-11 whitespace-nowrap px-2 text-enhanced-ink-2"
              onClick={onOpenArchive}
              type="button"
            >
              档案
            </button>
          ) : null
        }
        context={`Career record · ${view.seasonCount} seasons`}
        currentLabel={contextLabel}
      />

      <article className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[var(--shell-max)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="grid gap-6 border-b-2 border-enhanced-line pb-8 md:grid-cols-[11rem_minmax(0,1fr)_auto] md:items-end">
            <div
              aria-label={`生涯最高能力 ${view.maxOverall}`}
              className="border-l-4 border-enhanced-trophy pl-4"
            >
              <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
                Peak rating
              </p>
              <p className="mt-1 font-enhanced-display text-6xl font-bold leading-none tabular-nums text-enhanced-trophy">
                {view.maxOverall}
              </p>
              <p className="mt-2 text-sm font-bold text-enhanced-ink-2">
                {badgeLabel(view.badge)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-enhanced-supporting">
                {view.identity.country} · #{view.identity.number} ·{" "}
                {view.identity.position}
              </p>
              <h1 className="mt-2 [overflow-wrap:anywhere] text-4xl font-bold leading-tight sm:text-5xl">
                {view.identity.name}
              </h1>
              <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-enhanced-supporting">
                {view.seasonCount} 个赛季已经写入同一份确定性生涯记录。
              </p>
            </div>

            <dl className="border-t border-enhanced-line pt-4 text-left md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right">
              <dt className="text-xs text-enhanced-supporting">
                巅峰身价
              </dt>
              <dd className="mt-1 font-enhanced-display text-3xl font-bold tabular-nums">
                {formatMarketValue(view.maxMarketValue)}
              </dd>
            </dl>
          </header>

          <dl
            aria-label="生涯总计"
            className="grid grid-cols-3 divide-x divide-enhanced-line border-b border-enhanced-line py-5"
            data-enhanced-summary-record="totals"
          >
            {view.metrics.map((metric) => (
              <div className="px-3 first:pl-0" key={metric.label}>
                <dt className="text-xs text-enhanced-supporting">
                  {metric.label}
                </dt>
                <dd className="mt-1 font-enhanced-display text-3xl font-bold tabular-nums">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>

          {challenge ? (
            <section
              aria-label="挑战回放"
              className="border-b border-enhanced-line py-6"
              data-enhanced-summary-record="challenge"
            >
              <ChallengeProgressPanel
                daily={challenge.daily}
                progress={challenge.progress}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="min-w-0 text-xs text-enhanced-supporting">
                  挑战回放链接
                  <input
                    className="mt-2 h-11 w-full min-w-0 border border-enhanced-line bg-enhanced-surface px-3 font-enhanced-mono text-xs text-enhanced-ink-2"
                    data-enhanced-field=""
                    data-field-state="success"
                    readOnly
                    value={challenge.replayUrl}
                  />
                </label>
                {onCopyReplay ? (
                  <EnhancedAction
                    onClick={onCopyReplay}
                    state={
                      replayCopySucceeded
                        ? "success"
                        : replayCopyFailed
                          ? "error"
                          : "default"
                    }
                  >
                    {replayCopySucceeded
                      ? "已复制"
                      : replayCopyFailed
                        ? "重试复制回放链接"
                        : "复制挑战回放链接"}
                  </EnhancedAction>
                ) : null}
              </div>
              {replayCopyMessage ? (
                <p
                  aria-live="polite"
                  className={[
                    "mt-3 text-sm font-bold",
                    replayCopyFailed
                      ? "text-enhanced-alert"
                      : "text-enhanced-pitch",
                  ].join(" ")}
                  role="status"
                >
                  {replayCopyMessage}
                </p>
              ) : null}
            </section>
          ) : null}

          {view.nationalTeam ? (
            <section
              className="grid gap-3 border-b border-enhanced-line py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              data-enhanced-summary-record="national-team"
            >
              <div>
                <h2 className="text-lg font-bold">
                  {view.nationalTeam.name}
                </h2>
                <p className="mt-1 text-base text-enhanced-supporting">
                  {view.nationalTeam.stats}
                </p>
              </div>
              <p className="text-sm font-bold text-enhanced-trophy">
                {view.nationalTeam.bestTournament ??
                  "暂无大赛淘汰赛记录"}
              </p>
            </section>
          ) : null}

          <TitleRecords titles={view.titles} />
          <HonorRecords honors={view.honors} />
          <ClubRecords view={view} />

          <section className="border-y border-enhanced-line py-5">
            <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
              Deterministic seed
            </p>
            <p className="mt-2 [overflow-wrap:anywhere] font-enhanced-mono text-sm text-enhanced-ink-2">
              {view.seed}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-enhanced-supporting">
              相同编号与选择会重放出完全相同的生涯。
            </p>
          </section>
        </div>
      </article>

      <footer className="shrink-0 border-t border-enhanced-line bg-enhanced-canvas px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[var(--shell-max)] grid-cols-2 gap-3">
          <EnhancedAction
            className="min-h-12 w-full"
            onClick={onRestart}
          >
            再来一局
          </EnhancedAction>
          <EnhancedAction
            className="min-h-12 w-full"
            onClick={onShare}
            tone="primary"
          >
            保存战绩卡
          </EnhancedAction>
        </div>
      </footer>
    </main>
  );
}

function TitleRecords({
  titles,
}: {
  readonly titles: readonly SummaryTitlePresentation[];
}) {
  if (titles.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="enhanced-titles-heading"
      className="border-b border-enhanced-line py-6"
      data-enhanced-summary-record="titles"
    >
      <h2
        className="text-lg font-bold"
        id="enhanced-titles-heading"
      >
        特殊称号
      </h2>
      <ol className="mt-3 divide-y divide-enhanced-line-soft border-y border-enhanced-line">
        {titles.map((title, index) => (
          <li
            className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-3"
            key={title.id}
          >
            <span className="font-enhanced-mono text-xs text-enhanced-trophy">
              T{String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <strong className="block text-base">
                {title.label}
              </strong>
              <span className="mt-1 block text-sm leading-relaxed text-enhanced-supporting">
                {title.description}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HonorRecords({
  honors,
}: {
  readonly honors: readonly SummaryHonorPresentation[];
}) {
  return (
    <section
      aria-label="荣誉室"
      className="border-b border-enhanced-line py-6"
      data-enhanced-summary-record="honors"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold">荣誉室</h2>
        <p className="text-xs tabular-nums text-enhanced-supporting">
          {honors.length} 类荣誉
        </p>
      </div>
      {honors.length === 0 ? (
        <p className="mt-3 text-sm text-enhanced-supporting">
          这段生涯没有留下奖杯或个人奖项。
        </p>
      ) : (
        <ul className="mt-3 grid border-y border-enhanced-line sm:grid-cols-2">
          {honors.map((honor) => (
            <li
              className="flex min-w-0 items-center gap-3 border-b border-enhanced-line-soft py-3 sm:odd:pr-5 sm:even:border-l sm:even:pl-5"
              key={honor.id}
            >
              <HonorIdentity
                honor={honor.identity}
                size={36}
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {honor.label}
                </strong>
                <span className="mt-1 block text-xs text-enhanced-supporting">
                  {honor.kind === "trophy" ? "奖杯" : "个人奖项"}
                </span>
              </span>
              <span className="font-enhanced-display text-2xl font-bold tabular-nums text-enhanced-trophy">
                ×{honor.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ClubRecords({
  view,
}: {
  readonly view: SummaryPresentation;
}) {
  return (
    <section
      aria-label="效力过"
      className="border-b border-enhanced-line py-6"
      data-enhanced-summary-record="clubs"
    >
      <h2 className="text-lg font-bold">效力过</h2>
      <ol className="mt-3 divide-y divide-enhanced-line-soft border-y border-enhanced-line">
        {view.clubs.map(({ club, stats, trophyCount }, index) => (
          <li
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
            key={club.id}
          >
            <span className="font-enhanced-mono text-xs text-enhanced-supporting">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex min-w-0 items-center gap-3">
              <ClubIdentity club={club} size={28} />
              <span className="min-w-0">
                <strong className="block truncate text-sm">
                  {club.shortName}
                </strong>
                <span className="mt-1 block text-xs text-enhanced-supporting">
                  {stats}
                </span>
              </span>
            </span>
            <span className="text-right text-xs font-bold text-enhanced-trophy">
              {trophyCount > 0 ? `荣誉 ×${trophyCount}` : "—"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function badgeLabel(
  badge: SummaryPresentation["badge"],
): string {
  const labels: Readonly<
    Record<SummaryPresentation["badge"], string>
  > = {
    bronze: "青铜生涯",
    cyan: "青蓝生涯",
    elite: "精英生涯",
    gold: "黄金生涯",
    silver: "白银生涯",
    special: "特殊生涯",
  };

  return labels[badge];
}

function formatMarketValue(valueEuro: number): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return value
    .toFixed(2)
    .replace(/\.?0+$/, "");
}
