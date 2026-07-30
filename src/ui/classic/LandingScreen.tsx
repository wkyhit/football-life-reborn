import { primaryButtonClass } from "./classNames";

type LandingScreenProps = {
  onBegin: () => void;
};

export function LandingScreen({ onBegin }: LandingScreenProps) {
  return (
    <main
      className="min-h-dvh bg-canvas px-5 py-8 text-primary sm:py-12"
      id="main-content"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1240px] flex-col sm:min-h-[calc(100dvh-6rem)]">
        <header>
          <p
            className="text-[11px] font-semibold tracking-[0.18em] text-accent"
            lang="en"
          >
            CAREER SIM
          </p>
          <h1 className="mt-4 text-[32px] font-black leading-[1.25] text-primary sm:text-4xl">
            足球生涯模拟器
          </h1>
          <p className="mt-2 text-base text-secondary">
            从青训到传奇，每个决定都算数
          </p>
          <p className="mt-7 max-w-[70ch] text-sm leading-7 text-muted sm:mt-8 sm:text-base">
            选择中国和中锋位置，从 16
            岁一路踢到退役。你只做选择，剩下的交给确定性的命运。
          </p>
        </header>

        <section className="mt-auto pt-16" aria-labelledby="pace-heading">
          <h2
            className="mb-3 text-xs font-medium text-muted"
            id="pace-heading"
          >
            节奏
          </h2>
          <div className="rounded-[16px] border border-accent bg-accent-soft p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-accent">标准</p>
                <p className="mt-1 text-sm text-secondary">
                  每两个赛季一次决策
                </p>
              </div>
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full bg-accent"
              />
            </div>
          </div>
          <button
            className={`${primaryButtonClass} mt-7 w-full`}
            onClick={onBegin}
            type="button"
          >
            开始生涯
          </button>
        </section>
      </div>
    </main>
  );
}
