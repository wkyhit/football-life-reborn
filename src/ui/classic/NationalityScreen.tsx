import { primaryButtonClass, secondaryButtonClass } from "./classNames";
import { SetupShell } from "./SetupShell";

type NationalityScreenProps = {
  nationality: "CHN" | null;
  onBack: () => void;
  onContinue: () => void;
  onSelect: () => void;
};

export function NationalityScreen({
  nationality,
  onBack,
  onContinue,
  onSelect,
}: NationalityScreenProps) {
  const selected = nationality === "CHN";

  return (
    <SetupShell current={1}>
      <section className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
        <header>
          <h1 className="text-2xl font-black leading-tight">你是哪国人</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            你将从中国足球起步，国籍会成为这段生涯的一部分。
          </p>
        </header>

        <div className="mt-7">
          <button
            aria-label="中国"
            aria-pressed={selected}
            className={
              selected
                ? "flex min-h-16 w-full touch-manipulation items-center gap-4 rounded-[16px] border border-accent bg-accent-soft px-4 text-left transition-[transform] duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                : "flex min-h-16 w-full touch-manipulation items-center gap-4 rounded-[16px] border border-line bg-surface px-4 text-left transition-[transform] duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            }
            onClick={onSelect}
            type="button"
          >
            <span aria-hidden="true" className="text-2xl">
              🇨🇳
            </span>
            <span>
              <span className="block font-bold">中国</span>
              <span className="mt-1 block text-xs text-muted">
                CHN · 国家队门槛低
              </span>
            </span>
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
            onClick={onContinue}
            type="button"
          >
            下一步
          </button>
        </div>
      </section>
    </SetupShell>
  );
}
