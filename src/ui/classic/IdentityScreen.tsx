import { isValidShirtNumber } from "../../domain/careerReducer";
import type {
  PlayerProfile,
  PreferredFoot,
} from "../../domain/model";
import { JerseyPreview } from "./JerseyPreview";
import { SetupFooter } from "./SetupFooter";
import { SetupShell } from "./SetupShell";

type IdentityScreenProps = {
  player: PlayerProfile;
  onBack: () => void;
  onContinue: () => void;
  onFootChange: (foot: PreferredFoot) => void;
  onNameChange: (name: string) => void;
  onNumberChange: (number: string) => void;
};

export function IdentityScreen({
  player,
  onBack,
  onContinue,
  onFootChange,
  onNameChange,
  onNumberChange,
}: IdentityScreenProps) {
  const validNumber = isValidShirtNumber(player.number);
  const canContinue =
    player.name.trim().length > 0 && validNumber;

  return (
    <SetupShell current={2}>
      <section className="flex min-h-0 flex-1 flex-col">
        <h1 className="shrink-0 text-2xl font-black leading-8 text-primary">
          填一下名字
        </h1>
        <p className="mt-1.5 shrink-0 text-[13px] leading-[19.5px] text-muted">
          这些只是好看，不影响数值
        </p>

        <div className="flex min-h-0 flex-1 items-center justify-center py-3">
          <JerseyPreview
            countryFifaCode={player.nationality ?? "CHN"}
            name={player.name.trim() || "输入姓名"}
            number={validNumber ? player.number : "10"}
          />
        </div>

        <div className="shrink-0 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 block">
              <span className="text-[10px] font-bold leading-[15px] tracking-wide text-muted">
                姓名
              </span>
              <input
                autoComplete="name"
                className="mt-1 h-11 w-full rounded-[12px] border border-line bg-surface px-3 text-center text-[15px] font-bold text-foreground outline-none placeholder:font-normal placeholder:text-zinc-600 focus:border-emerald-600"
                maxLength={8}
                name="player-name"
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="输入姓名"
                value={player.name}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold leading-[15px] tracking-wide text-muted">
                号码
              </span>
              <input
                className={`mt-1 h-11 w-full rounded-[12px] border bg-surface px-3 text-center text-[15px] font-bold text-foreground outline-none ${
                  validNumber
                    ? "border-line focus:border-emerald-600"
                    : "border-red-600"
                }`}
                inputMode="numeric"
                name="shirt-number"
                onChange={(event) =>
                  onNumberChange(event.target.value)
                }
                value={player.number}
              />
            </label>
          </div>

          <div>
            <span className="text-[10px] font-bold leading-[15px] tracking-wide text-muted">
              惯用脚
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-surface p-1">
              {(
                [
                  ["left", "左脚"],
                  ["right", "右脚"],
                ] as const
              ).map(([foot, label]) => (
                <button
                  aria-pressed={player.foot === foot}
                  className={
                    player.foot === foot
                      ? "h-9 rounded-[8px] bg-accent text-sm font-bold text-accent-ink transition-colors"
                      : "h-9 rounded-[8px] text-sm font-bold text-muted transition-colors"
                  }
                  key={foot}
                  onClick={() => onFootChange(foot)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SetupFooter
            nextDisabled={!canContinue}
            nextLabel="下一步"
            onBack={onBack}
            onNext={onContinue}
            paddingTop="small"
          />
        </div>
      </section>
    </SetupShell>
  );
}
