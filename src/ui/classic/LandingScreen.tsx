import { useState } from "react";

import type { PacingMode } from "../../domain/pacing";
import { primaryButtonClass } from "./classNames";

type LandingScreenProps = {
  onBegin: (mode: PacingMode) => void;
};

export function LandingScreen({ onBegin }: LandingScreenProps) {
  const [mode, setMode] = useState<PacingMode>("normal");

  return (
    <main
      className="flex h-dvh flex-col justify-between overflow-hidden bg-canvas px-5 pb-8 pt-16 text-primary"
      data-classic-surface="landing"
      id="main-content"
    >
      <header>
        <p
          className="text-[11px] font-bold leading-[16.5px] tracking-[0.2em] text-accent"
          lang="en"
        >
          CAREER SIM
        </p>
        <h1 className="mt-3 text-4xl font-black leading-[45px] text-primary">
          足球生涯模拟器
        </h1>
        <p className="mt-2 text-base font-medium leading-6 text-secondary">
          从青训到传奇，每个决定都算数
        </p>
        <p className="mt-6 text-[15px] leading-[1.625] text-muted">
          选一个国籍和位置，从 16
          岁踢到退役。转会、伤病、更衣室风波、点球大战 ——
          你只做选择，剩下的交给命运。
        </p>
      </header>

      <section aria-labelledby="pace-heading">
        <h2
          className="mb-3 text-xs font-bold leading-4 tracking-[0.025em] text-muted"
          id="pace-heading"
        >
          节奏
        </h2>
        {(
          [
            ["long", "沉浸", "每个赛季一次决策，最完整的一生"],
            ["normal", "标准", "每两个赛季一次决策，推荐"],
            ["express", "速通", "每三个赛季一次决策，十分钟一生"],
          ] as const
        ).map(([value, title, description]) => {
          const selected = mode === value;

          return (
            <button
              aria-pressed={selected}
              className={
                selected
                  ? "mb-3 block w-full rounded-[16px] border border-accent bg-accent-soft p-4 text-left"
                  : "mb-3 block w-full rounded-[16px] border border-line bg-surface/60 p-4 text-left"
              }
              key={value}
              onClick={() => setMode(value)}
              type="button"
            >
              <span
                className="flex items-center justify-between"
                data-classic-pace-option={value}
              >
                <span
                  className={
                    selected
                      ? "block text-base font-bold leading-6 text-accent-bright"
                      : "block text-base font-bold leading-6 text-foreground"
                  }
                >
                  {title}
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="text-accent"
                  >
                    ●
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[13px] leading-[19.5px] text-muted">
                {description}
              </span>
            </button>
          );
        })}
        <button
          className={`${primaryButtonClass} mt-4 h-12 w-full`}
          onClick={() => onBegin(mode)}
          type="button"
        >
          开始生涯
        </button>
      </section>
    </main>
  );
}
