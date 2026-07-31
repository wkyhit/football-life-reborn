import { useState } from "react";

import type { PacingMode } from "../../../domain/pacing";
import { challengeDefinition } from "../../../features/challenges/catalog";
import {
  getDailyChallenges,
  type DailyChallenge,
} from "../../../features/challenges/daily";
import { EnhancedAction } from "../components/EnhancedAction";
import { EnhancedAppBar } from "../components/EnhancedAppBar";
import { EnhancedInstallSurface } from "../components/EnhancedStateSurface";

type EnhancedLandingScreenProps = {
  readonly archiveCount?: number;
  readonly dailyChallenges?: readonly DailyChallenge[];
  readonly hasResume: boolean;
  readonly onBegin: (mode: PacingMode) => void;
  readonly onBeginChallenge?: (
    challenge: DailyChallenge,
    mode: PacingMode,
  ) => void;
  readonly onOpenArchive?: () => void;
  readonly onRandom: (mode: PacingMode) => void;
  readonly onResume: () => void;
};

export function EnhancedLandingScreen({
  archiveCount = 0,
  dailyChallenges,
  hasResume,
  onBegin,
  onBeginChallenge,
  onOpenArchive,
  onRandom,
  onResume,
}: EnhancedLandingScreenProps) {
  const [mode, setMode] = useState<PacingMode>("normal");
  const [challenges] = useState(
    () => dailyChallenges ?? getDailyChallenges(),
  );
  const [describedFamily, setDescribedFamily] = useState(
    () => challenges[0]!.family,
  );
  const describedDefinition =
    challengeDefinition(describedFamily);

  return (
    <main
      className="flex min-h-dvh flex-col bg-enhanced-canvas text-enhanced-strong lg:h-dvh lg:overflow-hidden"
      data-enhanced-stage="0.0"
      data-enhanced-setup-shell="landing"
      data-hallmark-macrostructure="Narrative Workflow"
      id="main-content"
      tabIndex={-1}
    >
      <EnhancedAppBar
        actions={
          onOpenArchive ? (
            <button
              aria-label="生涯档案"
              className="min-h-11 whitespace-nowrap px-2 text-enhanced-ink-2"
              onClick={onOpenArchive}
              type="button"
            >
              档案 {archiveCount} / 20
            </button>
          ) : null
        }
        context="Entry · 0.0"
        currentLabel="入口"
      />

      {/* Hallmark · genre: playful · macrostructure: Narrative Workflow · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <section className="mx-auto flex min-h-0 w-full max-w-[var(--shell-max)] flex-1 flex-col px-4 pt-6 pb-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12 lg:px-8 lg:pt-8 lg:pb-12">
        <div
          className="order-2 flex flex-col justify-between border-b border-enhanced-line pb-8 lg:order-1 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12"
          data-enhanced-landing-story=""
        >
          <div>
            <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-pitch">
              FOOTBALL LIFE · ENHANCED
            </p>
            <h1 className="mt-5 max-w-xl [overflow-wrap:anywhere] text-[32px] font-bold leading-[1.12] sm:text-5xl">
              从这里继续你的足球人生
            </h1>
            <p className="mt-5 max-w-lg text-base leading-[1.7] text-enhanced-supporting">
              从 16 岁的第一份报价开始，把每个赛季写进同一本档案。
              相同 seed 和选择会重放出完全相同的职业生涯。
            </p>
          </div>

          <dl className="mt-8 grid grid-cols-3 divide-x divide-enhanced-line border-y border-enhanced-line py-4 lg:mb-2">
            {[
              ["61", "国家"],
              ["192", "俱乐部"],
              ["12", "位置"],
            ].map(([value, label]) => (
              <div className="px-3 first:pl-0" key={label}>
                <dd className="text-xl font-extrabold tabular-nums">
                  {value}
                </dd>
                <dt className="mt-1 text-xs font-bold text-enhanced-supporting">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-8 max-w-[28ch] border-t border-enhanced-line pt-5 lg:mb-2">
            <p className="text-2xl font-bold leading-tight">
              相同 seed，相同人生。
            </p>
            <p className="mt-2 font-enhanced-display text-lg font-bold uppercase tracking-[0.04em] text-enhanced-supporting">
              Football Life
            </p>
          </div>
        </div>

        <div
          className="order-1 flex min-h-0 flex-col py-8 lg:order-2 lg:overflow-y-auto lg:py-3"
          data-enhanced-entry-rail=""
        >
          {hasResume ? (
            <EnhancedAction
              className="mb-6 min-h-14 w-full justify-between px-4 text-left"
              onClick={onResume}
              tone="secondary"
            >
              <span className="flex w-full items-center justify-between gap-3">
                继续上次生涯
                <span aria-hidden="true">›</span>
              </span>
            </EnhancedAction>
          ) : null}

          <fieldset>
            <legend className="text-xs font-bold text-enhanced-supporting">
              生涯节奏
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["long", "沉浸", "每季"],
                  ["normal", "标准", "每两季"],
                  ["express", "速通", "每三季"],
                ] as const
              ).map(([value, label, detail]) => {
                const selected = mode === value;

                return (
                  <button
                    aria-label={label}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "min-h-16 rounded-[10px] border border-enhanced-pitch bg-enhanced-pitch/10 px-2 text-enhanced-pitch"
                        : "min-h-16 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-2 text-enhanced-supporting"
                    }
                    key={value}
                    onClick={() => setMode(value)}
                    type="button"
                  >
                    <span className="block text-sm font-bold">
                      {label}
                      {selected ? (
                        <span
                          aria-hidden="true"
                          className="ml-2"
                        >
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs">
                      {detail}
                      {selected ? " · 已选择" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div
            className="mt-5 border-t border-enhanced-line pt-4"
            data-enhanced-ordinary-entry=""
          >
            <p className="mb-2 font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
              ORDINARY CAREER
            </p>
            <div className="grid gap-2">
              <EnhancedAction
                className="min-h-12 w-full"
                onClick={() => onBegin(mode)}
                tone="primary"
              >
                开始普通生涯
              </EnhancedAction>
              <EnhancedAction
                className="min-h-12 w-full"
                onClick={() => onRandom(mode)}
              >
                随机球员
              </EnhancedAction>
            </div>
          </div>

          {onBeginChallenge ? (
            <details
              className="group mt-5 border-t border-enhanced-line pt-1"
              data-enhanced-challenge-discovery=""
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-enhanced-focus">
                <span>发现今日挑战</span>
                <span className="flex items-center gap-3">
                  <time
                    className="font-enhanced-mono text-xs font-normal tabular-nums text-enhanced-supporting"
                    dateTime={challenges[0]?.calendarDate}
                  >
                    {challenges[0]?.calendarDate}
                  </time>
                  <span
                    aria-hidden="true"
                    className="text-enhanced-pitch transition-transform group-open:rotate-90"
                  >
                    ›
                  </span>
                </span>
              </summary>
              <section
                aria-labelledby="daily-challenges-heading"
                className="pt-2"
              >
                <h2
                  className="sr-only"
                  id="daily-challenges-heading"
                >
                  今日挑战
                </h2>
              <div className="mt-2 grid gap-2">
                {challenges.map((challenge) => {
                  const definition = challengeDefinition(
                    challenge.family,
                  );

                  const descriptionId = `daily-challenge-${challenge.id}-description`;

                  return (
                    <article
                      className="rounded-[10px] border border-enhanced-pitch bg-enhanced-pitch/[0.05]"
                      data-daily-challenge-record=""
                      key={challenge.id}
                    >
                      <button
                        aria-describedby={descriptionId}
                        aria-label={`开始${definition.title}挑战`}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
                        onClick={() =>
                          onBeginChallenge(challenge, mode)
                        }
                        onFocus={() =>
                          setDescribedFamily(challenge.family)
                        }
                        type="button"
                      >
                        <span className="min-w-0 truncate text-[13px] font-extrabold text-enhanced-strong">
                          {definition.title}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-enhanced-pitch"
                        >
                          ›
                        </span>
                      </button>
                      <span className="sr-only" id={descriptionId}>
                        {definition.description}
                      </span>
                    </article>
                  );
                })}
              </div>
              <p
                className="mt-2 min-h-4 line-clamp-1 text-xs leading-4 text-enhanced-supporting"
                data-daily-challenge-description=""
              >
                {describedDefinition.description}
              </p>
              </section>
            </details>
          ) : null}

          <div className="mt-5">
            <EnhancedInstallSurface />
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-enhanced-supporting">
            数据只保存在本机。随机球员同样由当前 seed 确定。
          </p>
        </div>
      </section>
    </main>
  );
}
