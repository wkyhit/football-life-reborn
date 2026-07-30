import type { PositionCode } from "../../domain/model";
import { SetupFooter } from "./SetupFooter";
import { SetupShell } from "./SetupShell";

type PositionScreenProps = {
  position: PositionCode | null;
  onBack: () => void;
  onSelect: (position: PositionCode) => void;
  onStart: () => void;
};

const POSITIONS = [
  { code: "LW", label: "左边", left: "18%", top: "18%" },
  { code: "ST", label: "中锋", left: "50%", top: "10%" },
  { code: "RW", label: "右边", left: "82%", top: "18%" },
  { code: "LM", label: "左前", left: "15%", top: "42%" },
  { code: "CAM", label: "前腰", left: "50%", top: "32%" },
  { code: "RM", label: "右前", left: "85%", top: "42%" },
  { code: "LB", label: "左卫", left: "14%", top: "72%" },
  { code: "CM", label: "中前", left: "50%", top: "52%" },
  { code: "RB", label: "右卫", left: "86%", top: "72%" },
  { code: "CDM", label: "后腰", left: "50%", top: "66%" },
  { code: "CB", label: "中卫", left: "50%", top: "82%" },
  { code: "GK", label: "门将", left: "50%", top: "94%" },
] as const satisfies readonly {
  code: PositionCode;
  label: string;
  left: string;
  top: string;
}[];

export function PositionScreen({
  position,
  onBack,
  onSelect,
  onStart,
}: PositionScreenProps) {
  const selectedPosition = POSITIONS.find(
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
          {POSITIONS.map((candidate) => {
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
                  left: candidate.left,
                  top: candidate.top,
                }}
                type="button"
              >
                {candidate.label}
              </button>
            );
          })}
        </div>

        <div className="mb-3 h-5 shrink-0 text-center text-sm font-bold text-accent-bright">
          {selectedPosition?.label ?? ""}
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
