import {
  useId,
  useState,
  type Dispatch,
} from "react";

import { isValidShirtNumber } from "../../domain/careerReducer";
import type {
  CareerAction,
  CareerState,
  PreferredFoot,
} from "../../domain/model";
import type { PacingMode } from "../../domain/pacing";
import type { DailyChallenge } from "../../features/challenges/daily";
import { JerseyPreview } from "../classic/JerseyPreview";
import { CAREER_POSITION_PRESENTATIONS } from "../shared/positionPresentation";
import { EnhancedAction } from "./components/EnhancedAction";
import { EnhancedAppBar } from "./components/EnhancedAppBar";
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

  if (state.phase === "nationality") {
    return (
      <EnhancedNationalityScreen
        dispatch={dispatch}
        state={state}
      />
    );
  }

  if (state.phase === "identity") {
    return (
      <EnhancedIdentityScreen
        dispatch={dispatch}
        state={state}
      />
    );
  }

  if (state.phase === "position") {
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
  const trimmedName = state.player.name.trim();
  const validName =
    trimmedName.length > 0 && trimmedName.length < 9;
  const [touched, setTouched] = useState({
    name: false,
    number: false,
  });
  const nameInputId = useId();
  const numberInputId = useId();
  const touch = (field: keyof typeof touched) =>
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));

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
      data-enhanced-stage="2.0"
      data-enhanced-setup-shell="identity"
      data-hallmark-macrostructure="Narrative Workflow"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Narrative Workflow · theme: custom (tuned) · design-system: design.md · designed-as-app */}
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
            name={trimmedName || "输入姓名"}
            number={
              validNumber ? state.player.number : "10"
            }
          />
        </div>

        <div className="flex min-h-0 flex-col justify-end pt-4 lg:justify-center lg:pt-0">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(88px,1fr)] gap-3">
            <IdentityField
              autoComplete="name"
              field="name"
              inputId={nameInputId}
              label="姓名"
              maxLength={8}
              onBlur={() => touch("name")}
              onChange={(name) =>
                updateIdentity({ name })
              }
              rule="1–8 个字符"
              touched={touched.name}
              valid={validName}
              value={state.player.name}
            />
            <IdentityField
              centered
              field="number"
              inputId={numberInputId}
              inputMode="numeric"
              label="号码"
              onBlur={() => touch("number")}
              onChange={(number) =>
                updateIdentity({ number })
              }
              rule="1–99 的整数号码"
              touched={touched.number}
              valid={validNumber}
              value={state.player.number}
            />
          </div>

          <fieldset className="mt-4">
            <legend className="text-xs font-bold text-enhanced-supporting">
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
                        ? "min-h-12 rounded-[10px] border border-enhanced-pitch bg-enhanced-pitch/10 text-sm font-bold text-enhanced-pitch"
                        : "min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface text-sm font-bold text-enhanced-supporting"
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
            nextDisabledReason={identityDisabledReason(
              validName,
              validNumber,
            )}
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
      data-enhanced-stage="3.0"
      data-enhanced-setup-shell="position"
      data-hallmark-macrostructure="Narrative Workflow"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Narrative Workflow · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <EnhancedStepHeader
        description="位置决定赛季数据结构、竞争方式和奖项资格"
        step={3}
        title="选择场上位置"
      />

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            aria-label="足球场位置"
            className="relative mx-auto h-[520px] w-full max-w-3xl overflow-hidden rounded-[16px] border border-enhanced-pitch/30 bg-enhanced-pitch/5"
            role="group"
          >
            {CAREER_POSITION_PRESENTATIONS.map(
              (presentation) => {
                const selected =
                  state.player.position ===
                  presentation.code;

                return (
                  <button
                    aria-pressed={selected}
                    className={`absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-[8px] border px-2 outline-none focus-visible:ring-2 focus-visible:ring-enhanced-focus ${
                      selected
                        ? "border-enhanced-pitch bg-enhanced-pitch text-enhanced-pitch-ink"
                        : "border-enhanced-line bg-enhanced-canvas text-enhanced-supporting"
                    }`}
                    data-enhanced-position={
                      presentation.code
                    }
                    key={presentation.code}
                    onClick={() =>
                      dispatch({
                        position: presentation.code,
                        type: "select_position",
                      })
                    }
                    style={{
                      left: presentation.x,
                      top: presentation.y,
                    }}
                    type="button"
                  >
                    <strong className="block text-xs">
                      {presentation.label}
                    </strong>
                    <small className="block">
                      {presentation.code}
                    </small>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <EnhancedStepFooter
          nextDisabled={state.player.position === null}
          nextDisabledReason="选择一个场上位置后才能开始"
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
    <>
      <EnhancedAppBar
        context={`Player setup · ${step}.0`}
        currentLabel={title}
        stage={{ current: step, total: 3 }}
      />
      <div className="shrink-0 border-b border-enhanced-line px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="[overflow-wrap:anywhere] text-[22px] font-bold">
            {title}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-enhanced-supporting">
            {description}
          </p>
        </div>
      </div>
    </>
  );
}

function EnhancedStepFooter({
  nextDisabled,
  nextDisabledReason,
  nextLabel,
  onBack,
  onNext,
}: {
  readonly nextDisabled: boolean;
  readonly nextDisabledReason: string;
  readonly nextLabel: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  return (
    <footer className="mt-4 grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-enhanced-line pt-3">
      <EnhancedAction
        className="min-h-12"
        onClick={onBack}
      >
        返回
      </EnhancedAction>
      <EnhancedAction
        className="min-h-12 w-full"
        disabled={nextDisabled}
        disabledReason={nextDisabledReason}
        onClick={onNext}
        tone="primary"
      >
        {nextLabel}
      </EnhancedAction>
    </footer>
  );
}

type FieldState = "default" | "error" | "success";

function IdentityField({
  autoComplete,
  centered,
  field,
  inputId,
  inputMode,
  label,
  maxLength,
  onBlur,
  onChange,
  rule,
  touched,
  valid,
  value,
}: {
  readonly autoComplete?: string;
  readonly centered?: boolean;
  readonly field: "name" | "number";
  readonly inputId: string;
  readonly inputMode?: "numeric";
  readonly label: string;
  readonly maxLength?: number;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  readonly rule: string;
  readonly touched: boolean;
  readonly valid: boolean;
  readonly value: string;
}) {
  const messageId = `${inputId}-m`;
  const state: FieldState = touched
    ? valid
      ? "success"
      : "error"
    : "default";

  return (
    <div>
      <label
        className="text-xs font-bold text-enhanced-supporting"
        htmlFor={inputId}
      >
        {label}
      </label>
      <span className="relative mt-1 block">
        <input
          aria-describedby={messageId}
          aria-invalid={touched ? !valid : undefined}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 pr-10 text-[15px] font-bold outline-none focus:border-enhanced-pitch focus:ring-2 focus:ring-enhanced-focus/25${centered ? " text-center" : ""}`}
          data-enhanced-field=""
          data-field-state={state}
          id={inputId}
          inputMode={inputMode}
          maxLength={maxLength}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-3 flex w-4 items-center justify-center text-sm font-bold ${state === "error" ? "text-enhanced-alert" : "text-enhanced-success"}`}
        >
          {state === "default"
            ? null
            : state === "success"
              ? "✓"
              : "×"}
        </span>
      </span>
      <span
        className={`mt-1 block min-h-5 text-xs leading-5 ${state === "error" ? "text-enhanced-alert" : "text-enhanced-supporting"}`}
        data-enhanced-field-message={field}
        id={messageId}
        role={state === "error" ? "alert" : undefined}
      >
        {state === "error"
          ? `请输入 ${rule}`
          : state === "success"
            ? `${label}可用`
            : `填写 ${rule}`}
      </span>
    </div>
  );
}

function identityDisabledReason(
  validName: boolean,
  validNumber: boolean,
): string {
  if (!validName && !validNumber) {
    return "输入 1–8 个字符的姓名和 1–99 的整数号码后才能继续";
  }

  if (!validName) {
    return "输入 1–8 个字符的姓名后才能继续";
  }

  return "输入 1–99 的整数号码后才能继续";
}
