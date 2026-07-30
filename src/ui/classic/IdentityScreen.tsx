import type {
  PlayerDraft,
  PreferredFoot,
} from "../../app/setupReducer";
import { isValidShirtNumber } from "../../app/setupReducer";
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./classNames";
import { SetupShell } from "./SetupShell";

type IdentityScreenProps = {
  player: PlayerDraft;
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
  const canContinue =
    player.name.trim().length > 0 && isValidShirtNumber(player.number);

  return (
    <SetupShell current={2}>
      <section className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
        <header>
          <h1 className="text-2xl font-black leading-tight">填一下名字</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            姓名、号码和惯用脚只定义你的身份，不改变初始数值。
          </p>
        </header>

        <div className="mx-auto my-8 flex min-h-36 w-full max-w-sm flex-col items-center justify-center rounded-[16px] bg-china px-6 text-center shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
          <span className="text-sm font-semibold text-china-ink">
            {player.name.trim() || "球员"}
          </span>
          <span className="mt-1 text-5xl font-light tabular-nums text-china-ink">
            {player.number || "–"}
          </span>
          <span className="mt-2 text-[10px] font-bold tracking-[0.16em] text-china-ink/75">
            CHN
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <label className="block text-xs text-muted">
            姓名
            <input
              autoComplete="name"
              className={`${fieldClass} mt-2`}
              maxLength={12}
              name="player-name"
              onChange={(event) => onNameChange(event.target.value)}
              value={player.name}
            />
          </label>
          <label className="block text-xs text-muted">
            号码
            <input
              className={`${fieldClass} mt-2 tabular-nums`}
              inputMode="numeric"
              max={99}
              min={1}
              name="shirt-number"
              onChange={(event) => onNumberChange(event.target.value)}
              type="number"
              value={player.number}
            />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs text-muted">惯用脚</legend>
          <div className="mt-2 grid grid-cols-2 rounded-[12px] bg-surface p-1">
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
                    ? "min-h-10 rounded-[8px] bg-accent font-bold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    : "min-h-10 rounded-[8px] text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                }
                key={foot}
                onClick={() => onFootChange(foot)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

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
            disabled={!canContinue}
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
