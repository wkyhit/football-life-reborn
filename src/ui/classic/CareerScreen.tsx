import type { PlayerDraft } from "../../app/setupReducer";

type CareerScreenProps = {
  player: PlayerDraft;
};

const timelineAges = Array.from({ length: 13 }, (_, index) => 16 + index * 2);

export function CareerScreen({ player }: CareerScreenProps) {
  return (
    <main
      className="min-h-dvh bg-canvas px-4 py-5 text-primary sm:px-5"
      id="main-content"
    >
      <div className="mx-auto max-w-[1240px]">
        <header className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
          <div className="flex size-14 flex-col items-center justify-center rounded-[12px] bg-ability text-ability-ink shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
            <span className="text-[10px]">能力</span>
            <strong className="text-2xl font-black tabular-nums">50</strong>
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
            <p className="mt-1 text-sm text-secondary">自由身</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-muted">年龄</span>
            <strong className="block text-xl font-black tabular-nums">
              16 岁
            </strong>
            <span className="mt-1 block text-[11px] text-secondary">
              身价 €10万
            </span>
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-4 divide-x divide-line border-b border-line pb-4 text-center">
          {[
            ["出场", "0"],
            ["进球", "0"],
            ["助攻", "0"],
            ["奖杯", "0"],
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
            {timelineAges.map((age, index) => (
              <li
                className={
                  index === 0
                    ? "grid min-h-10 grid-cols-[56px_1fr] items-center border-b border-line bg-accent-soft px-3 text-xs text-accent last:border-b-0"
                    : "grid min-h-10 grid-cols-[56px_1fr] items-center border-b border-line px-3 text-xs text-muted last:border-b-0"
                }
                key={age}
              >
                <span className="tabular-nums">{age}</span>
                <span>{index === 0 ? "等待决定" : "—"}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-7" aria-labelledby="decision-heading">
          <p className="text-xs text-accent">16 岁 · 决策</p>
          <h2 className="mt-2 text-xl font-black" id="decision-heading">
            等待青训报价
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            你的球员档案已经建立，首个确定性决定将出现在这里。
          </p>
        </section>
      </div>
    </main>
  );
}
