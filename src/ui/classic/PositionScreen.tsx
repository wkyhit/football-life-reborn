import type { PositionCode } from "../../domain/model";
import { SetupFooter } from "./SetupFooter";
import { SetupShell } from "./SetupShell";
import { CAREER_POSITION_PRESENTATIONS } from "../shared/positionPresentation";

type PositionScreenProps = {
  position: PositionCode | null;
  onBack: () => void;
  onSelect: (position: PositionCode) => void;
  onStart: () => void;
};

export function PositionScreen({
  position,
  onBack,
  onSelect,
  onStart,
}: PositionScreenProps) {
  const selectedPosition =
    CAREER_POSITION_PRESENTATIONS.find(
    (candidate) => candidate.code === position,
  );

  return (
    <SetupShell current={3}>
      <section className="flex min-h-0 flex-1 flex-col">
        <h1 className="shrink-0 text-2xl font-black leading-8 text-primary">
          踢哪个位置
        </h1>
        <p className="mt-1.5 shrink-0 text-[13px] leading-[19.5px] text-muted">
          位置决定你的进球权重，也决定你有没有资格拿金球
        </p>

        <div className="relative my-4 min-h-0 flex-1 overflow-hidden rounded-[16px] border border-emerald-900/60 bg-gradient-to-b from-emerald-950 to-zinc-950">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-emerald-800/50"
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-800/50"
          />
          {CAREER_POSITION_PRESENTATIONS.map((candidate) => {
            const selected = position === candidate.code;

            return (
              <button
                aria-pressed={selected}
                className={
                  selected
                    ? "absolute -translate-x-1/2 -translate-y-1/2 scale-110 rounded-[8px] bg-accent px-2.5 py-1.5 text-[11px] font-bold leading-[16.5px] text-accent-ink shadow-lg shadow-emerald-500/30 transition-all"
                    : "absolute -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-surface-elevated/90 px-2.5 py-1.5 text-[11px] font-bold leading-[16.5px] text-zinc-300 transition-all"
                }
                data-classic-position={candidate.code}
                key={candidate.code}
                onClick={() => onSelect(candidate.code)}
                style={{
                  left: candidate.x,
                  top: candidate.y,
                }}
                type="button"
              >
                {candidate.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mb-3 h-5 shrink-0 text-center text-sm font-bold text-accent-bright">
          {selectedPosition?.shortLabel ?? ""}
        </div>
        <SetupFooter
          nextDisabled={position === null}
          nextLabel="开始踢球"
          onBack={onBack}
          onNext={onStart}
          paddingTop="none"
        />
      </section>
    </SetupShell>
  );
}
