import { primaryButtonClass, secondaryButtonClass } from "./classNames";
import { SetupShell } from "./SetupShell";

type PositionScreenProps = {
  position: "ST" | null;
  onBack: () => void;
  onSelect: () => void;
  onStart: () => void;
};

export function PositionScreen({
  position,
  onBack,
  onSelect,
  onStart,
}: PositionScreenProps) {
  const selected = position === "ST";

  return (
    <SetupShell current={3}>
      <section className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
        <header>
          <h1 className="text-2xl font-black leading-tight">踢哪个位置</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            中锋决定你的进球权重，也是这段生涯唯一可选的位置。
          </p>
        </header>

        <div className="relative mt-6 min-h-[320px] overflow-hidden rounded-[16px] border border-field-line bg-field sm:min-h-[430px]">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-field-line"
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-field-line"
          />
          <button
            aria-pressed={selected}
            className={
              selected
                ? "absolute left-1/2 top-[18%] min-h-12 min-w-20 -translate-x-1/2 touch-manipulation rounded-[12px] bg-accent px-4 font-bold text-accent-ink shadow-[0_10px_26px_rgba(0,0,0,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                : "absolute left-1/2 top-[18%] min-h-12 min-w-20 -translate-x-1/2 touch-manipulation rounded-[12px] bg-surface-elevated px-4 font-bold text-primary shadow-[0_10px_26px_rgba(0,0,0,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
            onClick={onSelect}
            type="button"
          >
            中锋
          </button>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
          <button
            className={secondaryButtonClass}
            onClick={onBack}
            type="button"
          >
            上一步
          </button>
          <button
            className={primaryButtonClass}
            disabled={!selected}
            onClick={onStart}
            type="button"
          >
            开始踢球
          </button>
        </div>
      </section>
    </SetupShell>
  );
}
