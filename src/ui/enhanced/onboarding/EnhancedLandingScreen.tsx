import { useState } from "react";

import type { PacingMode } from "../../../domain/pacing";

type EnhancedLandingScreenProps = {
  readonly hasResume: boolean;
  readonly onBegin: (mode: PacingMode) => void;
  readonly onRandom: (mode: PacingMode) => void;
  readonly onResume: () => void;
};

export function EnhancedLandingScreen({
  hasResume,
  onBegin,
  onRandom,
  onResume,
}: EnhancedLandingScreenProps) {
  const [mode, setMode] = useState<PacingMode>("normal");

  return (
    <main
      className="min-h-dvh bg-enhanced-canvas px-4 py-[max(24px,env(safe-area-inset-top))] text-enhanced-strong sm:px-6 lg:flex lg:h-dvh lg:items-stretch lg:overflow-hidden lg:px-10 lg:py-10"
      data-enhanced-setup-shell="landing"
      id="main-content"
      tabIndex={-1}
    >
      <section className="mx-auto flex w-full max-w-6xl flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
        <div className="flex flex-col justify-between border-b border-enhanced-line pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
              FOOTBALL LIFE · ENHANCED
            </p>
            <h1 className="mt-5 max-w-xl text-[32px] font-extrabold leading-[1.12] sm:text-5xl">
              从这里继续你的足球人生
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-[1.7] text-zinc-400">
              从 16 岁的第一份报价开始，把每个赛季写进同一本档案。
              相同 seed 和选择会重放出完全相同的职业生涯。
            </p>
          </div>

          <dl className="mt-8 grid grid-cols-3 divide-x divide-enhanced-line border-y border-enhanced-line py-4 lg:mb-2">
            {[
              ["61", "国家"],
              ["192", "俱乐部"],
              ["12", "位置"],
            ].map(([value, label]) => (
              <div className="px-3 first:pl-0" key={label}>
                <dd className="text-xl font-extrabold tabular-nums">
                  {value}
                </dd>
                <dt className="mt-0.5 text-[10px] font-bold text-enhanced-supporting">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col justify-center py-8 lg:py-0">
          {hasResume ? (
            <button
              className="mb-6 min-h-14 rounded-[10px] border border-emerald-400/40 bg-emerald-400/[0.07] px-4 text-left"
              onClick={onResume}
              type="button"
            >
              <span
                aria-hidden="true"
                className="block text-[10px] font-bold tracking-[0.12em] text-emerald-400"
              >
                LOCAL SAVE
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-[15px] font-bold">
                继续上次生涯
                <span aria-hidden="true">›</span>
              </span>
            </button>
          ) : null}

          <fieldset>
            <legend className="text-[11px] font-bold text-enhanced-supporting">
              生涯节奏
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["long", "沉浸", "每季"],
                  ["normal", "标准", "每两季"],
                  ["express", "速通", "每三季"],
                ] as const
              ).map(([value, label, detail]) => {
                const selected = mode === value;

                return (
                  <button
                    aria-label={label}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "min-h-16 rounded-[10px] border border-emerald-400 bg-emerald-400/10 px-2 text-emerald-300"
                        : "min-h-16 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-2 text-zinc-400"
                    }
                    key={value}
                    onClick={() => setMode(value)}
                    type="button"
                  >
                    <span className="block text-sm font-bold">
                      {label}
                      {selected ? (
                        <span
                          aria-hidden="true"
                          className="ml-1.5"
                        >
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[10px]">
                      {detail}
                      {selected ? " · 已选择" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-3">
            <button
              className="min-h-12 rounded-[10px] bg-enhanced-pitch px-5 text-[15px] font-bold text-enhanced-pitch-ink"
              onClick={() => onBegin(mode)}
              type="button"
            >
              开始新生涯
            </button>
            <button
              className="min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-5 text-[15px] font-bold"
              onClick={() => onRandom(mode)}
              type="button"
            >
              随机球员
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-enhanced-supporting">
            数据只保存在本机。随机球员同样由当前 seed 确定。
          </p>
        </div>
      </section>
    </main>
  );
}
