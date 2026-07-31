import type { ReactNode } from "react";

type EnhancedAppBarProps = {
  readonly actions?: ReactNode;
  readonly context: string;
  readonly currentLabel: string;
  readonly stage?: {
    readonly current: 1 | 2 | 3;
    readonly total: 3;
  };
};

export function EnhancedAppBar({
  actions,
  context,
  currentLabel,
  stage,
}: EnhancedAppBarProps) {
  return (
    <header
      className="shrink-0 border-b-2 border-enhanced-line bg-enhanced-canvas"
      data-enhanced-app-bar="n7-slab"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[var(--shell-max)] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <a
          aria-label="返回 Enhanced 入口"
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap font-enhanced-display text-xl font-bold uppercase tracking-[0.04em] text-enhanced-strong"
          href="/?ui=enhanced"
        >
          Football Life
        </a>
        <p className="hidden min-w-0 flex-1 truncate border-l border-enhanced-line pl-4 font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting sm:block">
          {context}
        </p>
        {stage ? (
          <div
            aria-label="球员设置进度"
            aria-valuemax={stage.total}
            aria-valuemin={1}
            aria-valuenow={stage.current}
            className="grid min-w-28 shrink-0 gap-1"
            role="progressbar"
          >
            <span className="whitespace-nowrap text-right font-enhanced-mono text-xs text-enhanced-ink-2">
              {stage.current}.0 / {stage.total}.0
            </span>
            <span
              aria-hidden="true"
              className="block h-px w-full overflow-hidden bg-enhanced-line"
            >
              <span
                className="block h-full bg-enhanced-pitch"
                style={{
                  width: `${(stage.current / stage.total) * 100}%`,
                }}
              />
            </span>
          </div>
        ) : null}
        <nav
          aria-label="Enhanced 导航"
          className="flex min-h-11 items-center gap-2 whitespace-nowrap font-enhanced-mono text-xs uppercase tracking-[0.08em]"
        >
          <span
            aria-current="page"
            className="text-enhanced-pitch"
          >
            {currentLabel}
          </span>
          {actions}
        </nav>
      </div>
    </header>
  );
}
