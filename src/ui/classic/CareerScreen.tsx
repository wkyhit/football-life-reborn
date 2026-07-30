import { getCslClub } from "../../domain/catalog/csl";
import type {
  CareerDecision,
  CareerPhase,
  CareerProgress,
  CareerState,
} from "../../domain/model";

type CareerScreenProps = {
  onChoose: (decisionId: string, optionId: string) => void;
  onContinue: () => void;
  state: CareerState;
};

const timelineAges = Array.from({ length: 12 }, (_, index) => 16 + index * 2);

export function CareerScreen({
  onChoose,
  onContinue,
  state,
}: CareerScreenProps) {
  const { career, player } = state;
  const clubName = career.clubId
    ? (getCslClub(career.clubId)?.name ?? "未知球队")
    : "自由身";

  return (
    <main
      className="min-h-dvh bg-canvas px-4 py-5 text-primary sm:px-5"
      id="main-content"
    >
      <div className="mx-auto max-w-[1240px]">
        <header className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
          <div className="flex size-14 flex-col items-center justify-center rounded-[12px] bg-ability text-ability-ink shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
            <span className="text-[10px]">能力</span>
            <strong className="text-2xl font-black tabular-nums">
              {career.ability}
            </strong>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-[4px] bg-surface-elevated px-2 py-1 text-secondary">
                🇨🇳 CHN
              </span>
              <span className="rounded-[4px] bg-accent-soft px-2 py-1 text-accent">
                #{player.number} 中锋
              </span>
            </div>
            <h1 className="mt-2 truncate text-xl font-black">
              {player.name.trim()}
            </h1>
            <p className="mt-1 text-sm text-secondary">{clubName}</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-muted">年龄</span>
            <strong className="block text-xl font-black tabular-nums">
              {career.age} 岁
            </strong>
            <span className="mt-1 block text-[11px] text-secondary">
              身价 {formatValue(career.valueEuro)}
            </span>
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-4 divide-x divide-line border-b border-line pb-4 text-center">
          {[
            ["出场", String(career.totals.appearances)],
            ["进球", String(career.totals.goals)],
            ["助攻", String(career.totals.assists)],
            ["奖杯", String(career.trophies.length)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] text-muted">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section
          aria-labelledby="timeline-heading"
          className="mt-4 overflow-hidden rounded-[12px] bg-surface shadow-[0_1px_0_rgba(255,255,255,0.05)]"
        >
          <h2 className="sr-only" id="timeline-heading">
            生涯时间线
          </h2>
          <div className="grid grid-cols-[56px_1fr] border-b border-line px-3 py-2 text-[10px] text-muted">
            <span>岁</span>
            <span>球队与状态</span>
          </div>
          <ol className="max-h-48 overflow-y-auto overscroll-contain">
            {timelineAges.map((age) => {
              const isCurrent = age === career.age;

              return (
                <li
                  className={
                    isCurrent
                      ? "grid min-h-10 grid-cols-[56px_1fr] items-center border-b border-line bg-accent-soft px-3 text-xs text-accent last:border-b-0"
                      : "grid min-h-10 grid-cols-[56px_1fr] items-center border-b border-line px-3 text-xs text-muted last:border-b-0"
                  }
                  key={age}
                >
                  <span className="tabular-nums">{age}</span>
                  <span>{timelineLabel(career, state.phase, age)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <CareerPanel
          career={career}
          decision={state.activeDecision}
          phase={state.phase}
          onChoose={onChoose}
          onContinue={onContinue}
        />
      </div>
    </main>
  );
}

type CareerPanelProps = {
  career: CareerProgress;
  decision: CareerDecision | null;
  onChoose: CareerScreenProps["onChoose"];
  onContinue: CareerScreenProps["onContinue"];
  phase: CareerPhase;
};

function CareerPanel({
  career,
  decision,
  onChoose,
  onContinue,
  phase,
}: CareerPanelProps) {
  if (phase === "decision" && decision) {
    return (
      <section className="py-7" aria-labelledby="decision-heading">
        <p className="text-xs text-accent">{decision.age} 岁 · 决策</p>
        <h2 className="mt-2 text-xl font-black" id="decision-heading">
          {decision.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {decision.description}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {decision.options.map((option, index) => (
            <button
              className={
                index === 0
                  ? "min-h-12 rounded-[12px] bg-accent px-4 py-3 text-sm font-bold text-accent-ink transition-colors hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  : "min-h-12 rounded-[12px] border border-line bg-surface px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              }
              key={option.id}
              onClick={() => onChoose(decision.id, option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (phase === "period_result") {
    const latestSeasons = career.seasons.slice(-2);
    const appearances = latestSeasons.reduce(
      (total, season) => total + season.appearances,
      0,
    );
    const goals = latestSeasons.reduce(
      (total, season) => total + season.goals,
      0,
    );
    const assists = latestSeasons.reduce(
      (total, season) => total + season.assists,
      0,
    );

    return (
      <section className="py-7" aria-labelledby="decision-heading">
        <p className="text-xs text-accent">
          {career.age - 2}–{career.age - 1} 岁 · 阶段完成
        </p>
        <h2 className="mt-2 text-xl font-black" id="decision-heading">
          两赛季小结
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          你在这段周期出场 {appearances} 次，打进 {goals} 球并送出{" "}
          {assists} 次助攻。
        </p>
        <button
          className="mt-5 min-h-12 w-full rounded-[12px] bg-accent px-4 py-3 text-sm font-bold text-accent-ink transition-colors hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:min-w-48"
          onClick={onContinue}
          type="button"
        >
          继续生涯
        </button>
      </section>
    );
  }

  if (phase === "retired") {
    return (
      <section className="py-7" aria-labelledby="decision-heading">
        <p className="text-xs text-accent">{career.age} 岁 · 退役</p>
        <h2 className="mt-2 text-xl font-black" id="decision-heading">
          职业生涯结束
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {career.retirementReason ?? "你结束了职业球员生涯。"}
        </p>
        <p className="mt-4 text-sm leading-6 text-secondary">
          共出场 {career.totals.appearances} 次，打进{" "}
          {career.totals.goals} 球，赢得 {career.trophies.length} 座奖杯。
        </p>
      </section>
    );
  }

  return null;
}

function timelineLabel(
  career: CareerProgress,
  phase: CareerPhase,
  age: number,
): string {
  const seasons = career.seasons.filter(
    (season) => season.age === age || season.age === age + 1,
  );

  if (seasons.length > 0) {
    const club = getCslClub(seasons[0]!.clubId);
    const appearances = seasons.reduce(
      (total, season) => total + season.appearances,
      0,
    );
    const goals = seasons.reduce(
      (total, season) => total + season.goals,
      0,
    );
    return `${club?.shortName ?? "未知"} · ${appearances} 场 ${goals} 球`;
  }

  if (age === career.age) {
    return phase === "retired" ? "正式退役" : "等待决定";
  }

  return "—";
}

function formatValue(valueEuro: number): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
