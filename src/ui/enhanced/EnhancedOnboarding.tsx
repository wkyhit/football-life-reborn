import type { Dispatch } from "react";

import { isValidShirtNumber } from "../../domain/careerReducer";
import type {
  CareerAction,
  CareerState,
  PositionCode,
  PreferredFoot,
} from "../../domain/model";
import type { PacingMode } from "../../domain/pacing";
import type { DailyChallenge } from "../../features/challenges/daily";
import { JerseyPreview } from "../classic/JerseyPreview";
import { EnhancedLandingScreen } from "./onboarding/EnhancedLandingScreen";
import { EnhancedNationalityScreen } from "./onboarding/EnhancedNationalityScreen";
import {
  createRandomPlayerSetup,
  type RandomPlayerSetup,
} from "./randomPlayer";

export type EnhancedOnboardingProps = {
  readonly archiveCount?: number;
  readonly dailyChallenges?: readonly DailyChallenge[];
  readonly dispatch: Dispatch<CareerAction>;
  readonly hasResume: boolean;
  readonly isEntryPrompt: boolean;
  readonly newCareerSeed: string;
  readonly onBegin: (mode: PacingMode) => void;
  readonly onBeginChallenge?: (
    challenge: DailyChallenge,
    mode: PacingMode,
  ) => void;
  readonly onOpenArchive?: () => void;
  readonly onRandom: (
    mode: PacingMode,
    player: RandomPlayerSetup,
  ) => void;
  readonly onResume: () => void;
  readonly onStart: () => void;
  readonly state: CareerState;
};

export function EnhancedOnboarding({
  archiveCount = 0,
  dailyChallenges,
  dispatch,
  hasResume,
  isEntryPrompt,
  newCareerSeed,
  onBegin,
  onBeginChallenge,
  onOpenArchive,
  onRandom,
  onResume,
  onStart,
  state,
}: EnhancedOnboardingProps) {
  if (isEntryPrompt || state.phase === "landing") {
    return (
      <EnhancedLandingScreen
        archiveCount={archiveCount}
        hasResume={hasResume}
        onBegin={onBegin}
        onRandom={(mode) =>
          onRandom(
            mode,
            createRandomPlayerSetup(newCareerSeed),
          )
        }
        onResume={onResume}
        {...(dailyChallenges === undefined
          ? {}
          : { dailyChallenges })}
        {...(onBeginChallenge === undefined
          ? {}
          : { onBeginChallenge })}
        {...(onOpenArchive === undefined
          ? {}
          : { onOpenArchive })}
      />
    );
  }

  if (!isEntryPrompt && state.phase === "nationality") {
    return (
      <EnhancedNationalityScreen
        dispatch={dispatch}
        state={state}
      />
    );
  }

  if (!isEntryPrompt && state.phase === "identity") {
    return (
      <EnhancedIdentityScreen
        dispatch={dispatch}
        state={state}
      />
    );
  }

  if (!isEntryPrompt && state.phase === "position") {
    return (
      <EnhancedPositionScreen
        dispatch={dispatch}
        onStart={onStart}
        state={state}
      />
    );
  }

  return null;
}

function EnhancedIdentityScreen({
  dispatch,
  state,
}: {
  readonly dispatch: Dispatch<CareerAction>;
  readonly state: CareerState;
}) {
  const validNumber = isValidShirtNumber(
    state.player.number,
  );
  const validName =
    state.player.name.trim().length >= 1 &&
    state.player.name.trim().length <= 8;

  const updateIdentity = (
    update:
      | { readonly foot: PreferredFoot }
      | { readonly name: string }
      | { readonly number: string },
  ) => {
    dispatch({
      ...update,
      type: "update_identity",
    });
  };

  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-setup-shell="identity"
      id="main-content"
      tabIndex={-1}
    >
      <EnhancedStepHeader
        description="姓名、号码和惯用脚只定义你的身份，不改变模拟数值"
        step={2}
        title="确认球员身份"
      />

      <section className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-rows-[minmax(0,1fr)_auto] px-4 py-4 sm:px-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:grid-rows-1 lg:gap-10 lg:px-8 lg:py-8">
        <div className="flex min-h-0 items-center justify-center overflow-hidden border-b border-enhanced-line pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
          <JerseyPreview
            countryFifaCode={
              state.player.nationality ?? "CHN"
            }
            name={state.player.name.trim() || "输入姓名"}
            number={
              validNumber ? state.player.number : "10"
            }
          />
        </div>

        <div className="flex min-h-0 flex-col justify-end pt-4 lg:justify-center lg:pt-0">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(88px,1fr)] gap-3">
            <label className="block">
              <span className="text-[11px] font-bold text-enhanced-supporting">
                姓名
              </span>
              <input
                autoComplete="name"
                className="mt-1 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-[15px] font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25"
                maxLength={8}
                onChange={(event) =>
                  updateIdentity({
                    name: event.target.value,
                  })
                }
                value={state.player.name}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-enhanced-supporting">
                号码
              </span>
              <input
                aria-invalid={!validNumber}
                className="mt-1 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-center text-[15px] font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25"
                inputMode="numeric"
                onChange={(event) =>
                  updateIdentity({
                    number: event.target.value,
                  })
                }
                value={state.player.number}
              />
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="text-[11px] font-bold text-enhanced-supporting">
              惯用脚
            </legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(
                [
                  ["left", "左脚"],
                  ["right", "右脚"],
                ] as const
              ).map(([foot, label]) => {
                const selected = state.player.foot === foot;

                return (
                  <button
                    aria-pressed={selected}
                    className={
                      selected
                        ? "min-h-12 rounded-[10px] border border-emerald-400 bg-emerald-400/10 text-sm font-bold text-emerald-300"
                        : "min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface text-sm font-bold text-zinc-400"
                    }
                    key={foot}
                    onClick={() =>
                      updateIdentity({ foot })
                    }
                    type="button"
                  >
                    {label}
                    {selected ? (
                      <span
                        aria-hidden="true"
                        className="ml-2"
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <EnhancedStepFooter
            nextDisabled={!validName || !validNumber}
            nextLabel="下一步"
            onBack={() => dispatch({ type: "back" })}
            onNext={() =>
              dispatch({ type: "continue_setup" })
            }
          />
        </div>
      </section>
    </main>
  );
}

const ENHANCED_POSITIONS = [
  ["LW", "左边锋", "进攻"],
  ["ST", "中锋", "进攻"],
  ["RW", "右边锋", "进攻"],
  ["LM", "左前卫", "组织"],
  ["CAM", "前腰", "组织"],
  ["RM", "右前卫", "组织"],
  ["LB", "左后卫", "支援"],
  ["CM", "中前卫", "支援"],
  ["RB", "右后卫", "支援"],
  ["CDM", "后腰", "防守"],
  ["CB", "中后卫", "防守"],
  ["GK", "门将", "门将"],
] as const satisfies readonly [
  PositionCode,
  string,
  string,
][];

function EnhancedPositionScreen({
  dispatch,
  onStart,
  state,
}: {
  readonly dispatch: Dispatch<CareerAction>;
  readonly onStart: () => void;
  readonly state: CareerState;
}) {
  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-setup-shell="position"
      id="main-content"
      tabIndex={-1}
    >
      <EnhancedStepHeader
        description="位置决定赛季数据结构、竞争方式和奖项资格"
        step={3}
        title="选择场上位置"
      />

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 lg:grid-cols-4">
            {ENHANCED_POSITIONS.map(
              ([position, label, group]) => {
                const selected =
                  state.player.position === position;

                return (
                  <button
                    aria-pressed={selected}
                    className={
                      selected
                        ? "min-h-20 rounded-[10px] border border-emerald-400 bg-emerald-400/10 p-3 text-left"
                        : "min-h-20 rounded-[10px] border border-enhanced-line bg-enhanced-surface p-3 text-left"
                    }
                    data-enhanced-position={position}
                    key={position}
                    onClick={() =>
                      dispatch({
                        position,
                        type: "select_position",
                      })
                    }
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold">
                        {label}
                      </span>
                      <span className="text-[10px] font-black text-enhanced-supporting">
                        {position}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-enhanced-supporting">
                      {group}
                      {selected ? " · 已选择" : ""}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <EnhancedStepFooter
          nextDisabled={state.player.position === null}
          nextLabel="开始踢球"
          onBack={() => dispatch({ type: "back" })}
          onNext={onStart}
        />
      </section>
    </main>
  );
}

function EnhancedStepHeader({
  description,
  step,
  title,
}: {
  readonly description: string;
  readonly step: 1 | 2 | 3;
  readonly title: string;
}) {
  return (
    <header className="shrink-0 border-b border-enhanced-line px-4 pb-4 pt-[max(20px,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
            PLAYER SETUP · 0{step}
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-zinc-400">
            {description}
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold text-enhanced-supporting">
          {step} / 3
        </span>
      </div>
    </header>
  );
}

function EnhancedStepFooter({
  nextDisabled,
  nextLabel,
  onBack,
  onNext,
}: {
  readonly nextDisabled: boolean;
  readonly nextLabel: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  return (
    <footer className="mt-4 grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-enhanced-line pt-3">
      <button
        className="min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-5 text-sm font-bold"
        onClick={onBack}
        type="button"
      >
        返回
      </button>
      <button
        className="min-h-12 rounded-[10px] bg-enhanced-pitch px-5 text-sm font-bold text-enhanced-pitch-ink disabled:bg-zinc-800 disabled:text-zinc-600"
        disabled={nextDisabled}
        onClick={onNext}
        type="button"
      >
        {nextLabel}
      </button>
    </footer>
  );
}
