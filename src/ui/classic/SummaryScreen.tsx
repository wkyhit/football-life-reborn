import type {
  SummaryHonorPresentation,
  SummaryPresentation,
} from "./summaryPresentation";
import {
  ChallengeProgressPanel,
  type ChallengeSurface,
} from "../../features/challenges/ChallengeProgressPanel";
import { formatYuan } from "../../domain/economy/economyPolicy";
import { HonorIdentity } from "../shared/HonorIdentity";
import { ClubIdentity } from "./components/ClubIdentity";

type ChallengeSummarySurface = ChallengeSurface & {
  readonly replayUrl: string;
};

type SummaryScreenProps = {
  readonly challenge?: ChallengeSummarySurface;
  readonly contextLabel?: string;
  readonly onCopyReplay?: () => void;
  readonly onRestart: () => void;
  readonly onShare: () => void;
  readonly replayCopyMessage?: string | null;
  readonly view: SummaryPresentation;
};

export function SummaryScreen({
  challenge,
  contextLabel,
  onCopyReplay,
  onRestart,
  onShare,
  replayCopyMessage,
  view,
}: SummaryScreenProps) {
  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100"
      data-classic-summary-shell=""
      id="main-content"
      tabIndex={-1}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6"
        data-classic-summary-scroll=""
      >
        <article className="animate-rise overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          {contextLabel ? (
            <p
              className="mb-3 text-[10px] font-extrabold tracking-[0.14em] text-emerald-300"
              data-summary-context=""
            >
              {contextLabel}
            </p>
          ) : null}
          <SummaryHeader view={view} />
          <SummaryMetrics view={view} />
          <SummaryStory view={view} />
          {challenge ? (
            <div className="mt-4">
              <ChallengeProgressPanel
                daily={challenge.daily}
                progress={challenge.progress}
              />
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  aria-label="挑战回放链接"
                  className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-[10px] text-zinc-500"
                  readOnly
                  value={challenge.replayUrl}
                />
                {onCopyReplay ? (
                  <button
                    className="min-h-10 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-[11px] font-bold text-emerald-300"
                    onClick={onCopyReplay}
                    type="button"
                  >
                    复制挑战回放链接
                  </button>
                ) : null}
              </div>
              {replayCopyMessage ? (
                <p
                  aria-live="polite"
                  className="mt-1 text-center text-[10px] font-bold text-emerald-300"
                  role="status"
                >
                  {replayCopyMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {view.nationalTeam ? (
            <div className="mt-3 rounded-xl bg-zinc-950/60 py-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-zinc-500">
                  {view.nationalTeam.name}
                </span>
                <span className="text-[13px] font-black tabular-nums text-zinc-200">
                  {view.nationalTeam.stats}
                </span>
              </div>
              {view.nationalTeam.bestTournament ? (
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-500">
                    大赛最佳
                  </span>
                  <span className="text-[12px] font-black text-emerald-300">
                    {view.nationalTeam.bestTournament}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {view.titles.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {view.titles.map((title) => (
                <div
                  className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent px-3 py-1.5"
                  key={title.id}
                >
                  <span className="text-sm">✨</span>
                  <span className="text-[13px] font-black text-amber-300">
                    {title.label}
                  </span>
                  <span className="min-w-0 truncate text-[10px] text-amber-200/60">
                    {title.description}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <SummaryHonors honors={view.honors} />
          <SummaryClubs view={view} />
          <div className="mt-4 border-t border-zinc-800 pt-3 text-center text-[10px] text-zinc-600">
            足球生涯模拟器 · {view.seasonCount} 个赛季
          </div>
        </article>
      </div>

      <footer
        className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 pb-5 pt-3"
        data-classic-summary-footer=""
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            className="h-12 rounded-xl border border-zinc-700 px-5 text-[15px] text-zinc-100 transition-colors active:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            onClick={onRestart}
            type="button"
          >
            再来一局
          </button>
          <button
            className="h-12 rounded-xl bg-emerald-500 px-5 text-[15px] font-bold text-zinc-950 transition-colors active:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            onClick={onShare}
            type="button"
          >
            保存战绩卡
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-zinc-600">
          这一局的编号{" "}
          <span className="font-mono text-zinc-500">{view.seed}</span>{" "}
          · 同一个编号永远走出同一条生涯
        </p>
      </footer>
    </main>
  );
}

function SummaryHeader({
  view,
}: {
  readonly view: SummaryPresentation;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border text-4xl font-black tabular-nums ${badgeClass(view.badge)}`}
      >
        <span className="text-[8px] font-bold leading-none opacity-70">
          生涯最高
        </span>
        <span className="leading-none">{view.maxOverall}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-black uppercase text-zinc-50">
          {view.identity.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {view.identity.country}
          </span>
          <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
            #{view.identity.number} {view.identity.position}
          </span>
        </div>
      </div>
      <div className="shrink-0 self-start text-right">
        <div className="text-[10px] font-bold text-zinc-400">
          巅峰身价
        </div>
        <div className="text-xl font-black text-amber-300">
          {formatMarketValue(view.maxMarketValue)}
        </div>
      </div>
    </div>
  );
}

function SummaryMetrics({
  view,
}: {
  readonly view: SummaryPresentation;
}) {
  return (
    <dl className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl bg-zinc-950/60 py-3">
      {view.metrics.map((metric) => (
        <div className="text-center" key={metric.label}>
          <dt className="text-[10px] text-zinc-500">
            {metric.label}
          </dt>
          <dd className="text-2xl font-black tabular-nums text-zinc-50">
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryStory({
  view,
}: {
  readonly view: SummaryPresentation;
}) {
  return (
    <section
      aria-labelledby="classic-career-ending"
      className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
      data-summary-story=""
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="text-[10px] font-bold tracking-[0.14em] text-zinc-500"
            id="classic-career-ending"
          >
            生涯结局
          </h2>
          <p className="mt-1 text-base font-black text-amber-300">
            {view.story.ending.label}
          </p>
        </div>
        <p className="text-right text-[10px] font-bold text-zinc-400">
          {view.story.highestHonor}
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-2 divide-x divide-zinc-800 border-y border-zinc-800 py-2">
        <div className="pr-2">
          <dt className="text-[10px] text-zinc-500">
            模拟生涯分位
          </dt>
          <dd className="mt-0.5 text-sm font-black tabular-nums text-emerald-300">
            P{view.story.simulatedPercentile.value}
          </dd>
        </div>
        <div className="pl-2 text-right">
          <dt className="text-[10px] text-zinc-500">
            总收入
          </dt>
          <dd className="mt-0.5 text-sm font-black tabular-nums text-zinc-100">
            {formatYuan(view.story.totalIncome)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
        {view.story.narrative}
      </p>
    </section>
  );
}

function SummaryHonors({
  honors,
}: {
  readonly honors: readonly SummaryHonorPresentation[];
}) {
  if (honors.length === 0) {
    return (
      <div className="mt-4 text-center text-[11px] text-zinc-600">
        还没有奖杯
      </div>
    );
  }

  return (
    <section className="mt-4" aria-label="荣誉室">
      <h2 className="mb-2 text-center text-[10px] font-bold tracking-[0.15em] text-zinc-500">
        荣誉室
      </h2>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
        {honors.map((honor) => (
          <div className="flex w-14 flex-col items-center" key={honor.id}>
            <div className="relative">
              <HonorMark honor={honor} />
              {honor.count > 1 ? (
                <span className="absolute -right-2 -top-1 rounded-full bg-zinc-800 px-1 text-[8px] font-black text-zinc-300">
                  ×{honor.count}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 w-full truncate text-center text-[9px] font-bold text-zinc-400">
              {honor.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HonorMark({
  honor,
}: {
  readonly honor: SummaryHonorPresentation;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 items-center justify-center"
      data-classic-summary-art=""
    >
      <HonorIdentity honor={honor.identity} size={36} />
    </span>
  );
}

function SummaryClubs({
  view,
}: {
  readonly view: SummaryPresentation;
}) {
  return (
    <section className="mt-4" aria-label="效力过">
      <h2 className="mb-2 text-center text-[10px] font-bold tracking-[0.15em] text-zinc-500">
        效力过
      </h2>
      <div className="space-y-1">
        {view.clubs.map(({ club, stats, trophyCount }) => (
          <div
            className="flex items-center gap-2 rounded-lg bg-zinc-950/60 px-2.5 py-1.5"
            key={club.id}
          >
            <ClubIdentity club={club} size={20} />
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-zinc-200">
              {club.shortName}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
              {stats}
            </span>
            {trophyCount > 0 ? (
              <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                荣誉
                <span className="font-black text-emerald-400">
                  ×{trophyCount}
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function badgeClass(badge: SummaryPresentation["badge"]): string {
  switch (badge) {
    case "bronze":
      return "border-amber-600/50 bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50";
    case "silver":
      return "border-zinc-200/50 bg-gradient-to-br from-zinc-300 to-zinc-500 text-zinc-900";
    case "gold":
      return "border-yellow-200/50 bg-gradient-to-br from-amber-300 to-yellow-500 text-zinc-950";
    case "cyan":
      return "border-cyan-200/50 bg-gradient-to-br from-cyan-300 to-sky-500 text-zinc-950";
    case "elite":
      return "border-violet-300/50 bg-gradient-to-br from-violet-400 to-fuchsia-600 text-white";
    case "special":
      return "border-rose-300/50 bg-gradient-to-br from-amber-300 via-rose-400 to-violet-500 text-zinc-950";
  }
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
