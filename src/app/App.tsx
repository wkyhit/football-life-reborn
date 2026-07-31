import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from "react";

import {
  applyClassicChoiceWithResult,
  startClassicCareer,
  type ClassicCareerState,
} from "../domain/classicEngine";
import {
  careerReducer,
  createInitialCareerState,
} from "../domain/careerReducer";
import type {
  CareerAction,
  CareerState,
} from "../domain/model";
import type { PacingMode } from "../domain/pacing";
import {
  parseDailyChallengeSeed,
  type DailyChallenge,
} from "../features/challenges/daily";
import { evaluateChallengeProgress } from "../features/challenges/progress";
import { createReplayUrl } from "../features/replay/codec";
import { createReplayPayload } from "../features/replay/replay";
import { resolveReplayRoute } from "../features/replay/route";
import { useSeasonReveal } from "../features/season-reveal/seasonReveal";
import {
  createArchiveRepository,
  type ArchiveRepository,
} from "../storage/archiveRepository";
import {
  readActiveArchiveId,
  writeActiveArchiveId,
} from "../storage/activeArchive";
import {
  createCareerRepository,
  type CareerLoadResult,
  type CareerRepository,
} from "../storage/careerRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
  type ClassicSessionLoadResult,
  type ClassicSessionRepository,
} from "../storage/classicSessionRepository";
import { migrateClassicSessionToArchive } from "../storage/migrations/migrations";
import { CareerScreen } from "../ui/classic/CareerScreen";
import {
  createCareerPresentation,
} from "../ui/classic/careerPresentation";
import { ClassicShell } from "../ui/classic/ClassicShell";
import { IdentityScreen } from "../ui/classic/IdentityScreen";
import { LandingScreen } from "../ui/classic/LandingScreen";
import { NationalityScreen } from "../ui/classic/NationalityScreen";
import { PositionScreen } from "../ui/classic/PositionScreen";
import { RecoveryScreen } from "../ui/classic/RecoveryScreen";
import { SummaryScreen } from "../ui/classic/SummaryScreen";
import { createSummaryPresentation } from "../ui/classic/summaryPresentation";
import {
  resolveUiMode,
  type UiMode,
} from "../ui/mode";
import { useReducedMotion } from "../ui/shared/useReducedMotion";
import { seedFromSearch } from "./seed";

const EnhancedCareerScreen = lazy(async () => {
  const module = await import(
    "../ui/enhanced/career/EnhancedCareerScreen"
  );
  return { default: module.EnhancedCareerScreen };
});

const EnhancedArchiveScreen = lazy(async () => {
  const module = await import(
    "../features/archive/EnhancedArchiveScreen"
  );
  return { default: module.EnhancedArchiveScreen };
});

const EnhancedOnboarding = lazy(async () => {
  const module = await import(
    "../ui/enhanced/EnhancedOnboarding"
  );
  return { default: module.EnhancedOnboarding };
});

const EnhancedShell = lazy(async () => {
  const module = await import(
    "../ui/enhanced/EnhancedShell"
  );
  return { default: module.EnhancedShell };
});

const EnhancedRecoveryScreen = lazy(async () => {
  const module = await import(
    "../ui/enhanced/recovery/EnhancedRecoveryScreen"
  );
  return { default: module.EnhancedRecoveryScreen };
});

const EnhancedSummaryScreen = lazy(async () => {
  const module = await import(
    "../ui/enhanced/summary/EnhancedSummaryScreen"
  );
  return { default: module.EnhancedSummaryScreen };
});

const ReplayRouteScreen = lazy(async () => {
  const module = await import(
    "../features/replay/ReplayRouteScreen"
  );
  return { default: module.ReplayRouteScreen };
});

const ShareCardOverlay = lazy(async () => {
  const module = await import(
    "../features/share-card/ShareCardOverlay"
  );
  return { default: module.ShareCardOverlay };
});

function EnhancedLoadingFallback({
  label,
  overlay = false,
}: {
  readonly label: string;
  readonly overlay?: boolean;
}) {
  if (overlay) {
    return (
      <div
        aria-busy="true"
        className="fixed inset-x-4 bottom-4 z-[var(--z-modal)] mx-auto flex min-h-14 max-w-md items-center gap-3 border border-enhanced-line bg-enhanced-raised px-4 text-enhanced-strong"
        data-enhanced-state="loading"
        role="status"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 bg-enhanced-pitch motion-safe:animate-[enhanced-state-pulse_var(--dur-long)_var(--ease-in-out)_infinite]"
        />
        <span className="text-sm font-bold">{label}</span>
      </div>
    );
  }

  return (
    <main
      aria-busy="true"
      className="min-h-dvh bg-enhanced-canvas px-4 py-8 text-enhanced-strong sm:px-6 sm:py-12"
      data-enhanced-state="loading"
      id="main-content"
      role="status"
    >
      <section className="mx-auto grid w-full max-w-[var(--shell-max)] gap-4 border-y border-enhanced-line py-8">
        <p className="flex items-center gap-2 font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 bg-enhanced-pitch motion-safe:animate-[enhanced-state-pulse_var(--dur-long)_var(--ease-in-out)_infinite]"
          />
          Loading
        </p>
        <h1 className="[overflow-wrap:anywhere] text-xl font-bold">
          {label}
        </h1>
        <p className="text-base leading-relaxed text-enhanced-supporting">
          正在读取本机记录，请稍候。
        </p>
      </section>
    </main>
  );
}

type SetupScreenProps = {
  readonly dispatch: Dispatch<CareerAction>;
  readonly onBegin: (mode: PacingMode) => void;
  readonly onStart: () => void;
  readonly state: CareerState;
};

function renderSetupScreen({
  dispatch,
  onBegin,
  onStart,
  state,
}: SetupScreenProps) {
  switch (state.phase) {
    case "landing":
      return <LandingScreen onBegin={onBegin} />;
    case "nationality":
      return (
        <NationalityScreen
          nationality={state.player.nationality}
          onBack={() => dispatch({ type: "back" })}
          onContinue={() => dispatch({ type: "continue_setup" })}
          onSelect={(nationality) =>
            dispatch({ nationality, type: "select_nationality" })
          }
        />
      );
    case "identity":
      return (
        <IdentityScreen
          player={state.player}
          onBack={() => dispatch({ type: "back" })}
          onContinue={() => dispatch({ type: "continue_setup" })}
          onFootChange={(foot) =>
            dispatch({ foot, type: "update_identity" })
          }
          onNameChange={(name) =>
            dispatch({ name, type: "update_identity" })
          }
          onNumberChange={(number) =>
            dispatch({ number, type: "update_identity" })
          }
        />
      );
    case "position":
      return (
        <PositionScreen
          position={state.player.position}
          onBack={() => dispatch({ type: "back" })}
          onSelect={(position) =>
            dispatch({ position, type: "select_position" })
          }
          onStart={onStart}
        />
      );
    case "decision":
    case "period_result":
    case "retired":
      return null;
  }
}

export function App() {
  const [replayRoute] = useState(() =>
    resolveReplayRoute(window.location.hash),
  );
  const [uiMode] = useState(() =>
    replayRoute.status === "absent"
      ? resolveUiMode(
          window.location.search,
          window.localStorage,
        )
      : "enhanced",
  );

  if (replayRoute.status !== "absent") {
    return (
      <Suspense
        fallback={
          <EnhancedLoadingFallback label="正在打开回放" />
        }
      >
        <EnhancedShell>
          <ReplayRouteScreen route={replayRoute} />
        </EnhancedShell>
      </Suspense>
    );
  }

  if (uiMode === "enhanced") {
    return (
      <Suspense
        fallback={
          <EnhancedLoadingFallback label="正在打开足球人生" />
        }
      >
        <EnhancedShell>
          <CareerController uiMode="enhanced" />
        </EnhancedShell>
      </Suspense>
    );
  }

  return (
    <ClassicShell>
      <CareerController uiMode="classic" />
    </ClassicShell>
  );
}

type CareerControllerProps = {
  readonly uiMode: UiMode;
};

function CareerController({
  uiMode,
}: CareerControllerProps) {
  const setupRepository = useMemo(
    () => createCareerRepository(window.localStorage),
    [],
  );
  const classicRepository = useMemo(
    () => createClassicSessionRepository(window.localStorage),
    [],
  );
  const archiveRepository = useMemo(
    () => createArchiveRepository(window.localStorage),
    [],
  );
  const [initial] = useState(() => {
    const loaded = loadInitialState(
      setupRepository,
      classicRepository,
      seedFromSearch(window.location.search),
    );
    let activeArchiveId =
      uiMode === "enhanced"
        ? readActiveArchiveId(window.localStorage)
        : null;

    if (
      uiMode === "enhanced" &&
      activeArchiveId === null
    ) {
      const migration = migrateClassicSessionToArchive(
        window.localStorage,
      );

      if (
        migration.status === "migrated" ||
        migration.status === "already_migrated"
      ) {
        activeArchiveId = migration.archiveId;
        writeActiveArchiveId(
          window.localStorage,
          activeArchiveId,
        );
      }
    }

    return { ...loaded, activeArchiveId };
  });
  const [enhancedEntryPending, setEnhancedEntryPending] =
    useState(() => uiMode === "enhanced");
  const [resumeAvailable, setResumeAvailable] = useState(
    () => hasResumableState(initial),
  );
  const [setupState, dispatch] = useReducer(
    careerReducer,
    initial.setupState,
  );
  const [classicCareer, setClassicCareer] =
    useState<ClassicCareerState | null>(initial.classicCareer);
  const [activeArchiveId, setActiveArchiveIdState] =
    useState<string | null>(initial.activeArchiveId);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveRevision, setArchiveRevision] = useState(0);
  const [mode, setMode] = useState<PacingMode>("normal");
  const [recovery, setRecovery] = useState(initial.recovery);
  const [saveError, setSaveError] = useState<string | null>(null);
  const setActiveArchiveId = useCallback(
    (id: string | null) => {
      setActiveArchiveIdState(id);

      if (!writeActiveArchiveId(window.localStorage, id)) {
        setSaveError("无法保存当前档案标识");
      }
    },
    [],
  );
  const onArchiveChanged = useCallback(() => {
    setArchiveRevision((revision) => revision + 1);
  }, []);
  const archiveCount = useMemo(() => {
    const listed = archiveRepository.list();

    return listed.ok ? listed.entries.length : 0;
  }, [archiveRepository, archiveRevision]);

  useEffect(() => {
    if (
      recovery !== null ||
      classicCareer !== null ||
      enhancedEntryPending
    ) {
      return;
    }

    const result = setupRepository.save(setupState);
    setSaveError(result.ok ? null : result.reason);
  }, [
    classicCareer,
    enhancedEntryPending,
    recovery,
    setupRepository,
    setupState,
  ]);
  const activeChallenge =
    uiMode === "enhanced" && classicCareer !== null
      ? parseDailyChallengeSeed(classicCareer.seed)
      : null;

  if (recovery !== null) {
    const onStartNew = () => {
      discardClassicSession();
      setRecovery(null);
      setClassicCareer(null);
      dispatch({
        seed: seedFromSearch(window.location.search),
        type: "reset_career",
      });
    };

    if (uiMode === "enhanced") {
      return (
        <Suspense
          fallback={
            <EnhancedLoadingFallback label="正在读取恢复记录" />
          }
        >
          <EnhancedRecoveryScreen
            onStartNew={onStartNew}
            recovery={recovery}
          />
        </Suspense>
      );
    }

    return (
      <RecoveryScreen
        recovery={recovery}
        onStartNew={onStartNew}
      />
    );
  }

  if (uiMode === "enhanced" && archiveOpen) {
    return (
      <Suspense
        fallback={
          <EnhancedLoadingFallback label="正在打开生涯档案" />
        }
      >
        <EnhancedArchiveScreen
          activeArchiveId={activeArchiveId}
          onActiveDeleted={(id) => {
            if (id === activeArchiveId) {
              discardClassicSession();
              setActiveArchiveId(null);
              setClassicCareer(null);
              setResumeAvailable(false);
              setEnhancedEntryPending(true);
            }
          }}
          onBack={() => setArchiveOpen(false)}
          onChanged={onArchiveChanged}
          onContinue={(career, archiveId) => {
            setClassicCareer(career);
            setActiveArchiveId(archiveId);
            setResumeAvailable(false);
            setEnhancedEntryPending(false);
            setArchiveOpen(false);
          }}
          repository={archiveRepository}
          storage={window.localStorage}
        />
      </Suspense>
    );
  }

  return (
    <>
      <a
        className={
          uiMode === "enhanced"
            ? "fixed -top-24 left-4 z-[var(--z-tooltip)] inline-flex min-h-11 items-center rounded-[var(--radius-input)] bg-enhanced-pitch px-4 font-bold text-enhanced-pitch-ink outline-none focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-enhanced-focus"
            : "sr-only z-50 rounded-[8px] bg-accent px-4 py-3 font-bold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        }
        href="#main-content"
      >
        跳到主要内容
      </a>
      {saveError ? (
        <p
          className={
            uiMode === "enhanced"
              ? "fixed inset-x-4 top-4 z-[var(--z-toast)] mx-auto max-w-lg border border-enhanced-alert bg-enhanced-raised px-4 py-3 text-sm text-enhanced-strong"
              : "fixed inset-x-4 top-4 z-40 mx-auto max-w-lg rounded-[12px] border border-china bg-canvas px-4 py-3 text-sm text-primary shadow-xl"
          }
          data-enhanced-state={
            uiMode === "enhanced" ? "error" : undefined
          }
          role="alert"
        >
          本地保存失败：{saveError}
        </p>
      ) : null}
      {uiMode === "enhanced" &&
      (enhancedEntryPending || classicCareer === null) ? (
        <Suspense
          fallback={
            <EnhancedLoadingFallback label="正在准备球员设置" />
          }
        >
          <EnhancedOnboarding
            archiveCount={archiveCount}
            dispatch={dispatch}
            hasResume={resumeAvailable}
            isEntryPrompt={enhancedEntryPending}
            newCareerSeed={seedFromSearch(
              window.location.search,
            )}
            onBegin={(selectedMode) => {
              setMode(selectedMode);
              discardClassicSession();
              setActiveArchiveId(null);
              setClassicCareer(null);
              setResumeAvailable(false);
              setEnhancedEntryPending(false);
              dispatch({
                seed: seedFromSearch(window.location.search),
                type: "reset_career",
              });
              dispatch({ type: "begin_setup" });
            }}
            onBeginChallenge={(challenge, selectedMode) => {
              setMode(selectedMode);
              discardClassicSession();
              setActiveArchiveId(null);
              setClassicCareer(null);
              setResumeAvailable(false);
              setEnhancedEntryPending(false);
              dispatch({
                seed: challenge.seed,
                type: "reset_career",
              });
              dispatch({ type: "begin_setup" });
            }}
            onRandom={(selectedMode, player) => {
              setMode(selectedMode);
              discardClassicSession();
              setActiveArchiveId(null);
              setClassicCareer(null);
              setResumeAvailable(false);
              setEnhancedEntryPending(false);
              dispatch({
                seed: seedFromSearch(window.location.search),
                type: "reset_career",
              });
              dispatch({ type: "begin_setup" });
              dispatch({
                nationality: player.nationality,
                type: "select_nationality",
              });
              dispatch({ type: "continue_setup" });
              dispatch({
                foot: player.foot,
                name: player.name,
                number: player.number,
                type: "update_identity",
              });
              dispatch({ type: "continue_setup" });
              dispatch({
                position: player.position,
                type: "select_position",
              });
            }}
            onResume={() => {
              setResumeAvailable(false);
              setEnhancedEntryPending(false);
            }}
            onOpenArchive={() => setArchiveOpen(true)}
            onStart={() => {
              setActiveArchiveId(null);
              setClassicCareer(
                startClassicFromSetup(setupState, mode),
              );
            }}
            state={setupState}
          />
        </Suspense>
      ) : classicCareer ? (
        <CareerExperience
          activeArchiveId={activeArchiveId}
          archiveRepository={
            uiMode === "enhanced"
              ? archiveRepository
              : null
          }
          challenge={activeChallenge}
          initialCareer={classicCareer}
          key={
            uiMode === "enhanced"
              ? activeArchiveId ?? "new-enhanced-career"
              : "classic-career"
          }
          onActiveArchiveId={setActiveArchiveId}
          onArchiveChanged={onArchiveChanged}
          onOpenArchive={(career) => {
            setClassicCareer(career);
            setArchiveOpen(true);
          }}
          onSaveError={setSaveError}
          onRestart={() => {
            discardClassicSession();
            setActiveArchiveId(null);
            setClassicCareer(null);
            dispatch({
              seed: seedFromSearch(window.location.search),
              type: "reset_career",
            });
          }}
          repository={classicRepository}
          uiMode={uiMode}
        />
      ) : (
        renderSetupScreen({
          dispatch,
          onBegin: (selectedMode) => {
            setMode(selectedMode);
            dispatch({ type: "begin_setup" });
          },
          onStart: () => {
            setClassicCareer(
              startClassicFromSetup(setupState, mode),
            );
          },
          state: setupState,
        })
      )}
    </>
  );
}

type CareerExperienceProps = {
  readonly activeArchiveId: string | null;
  readonly archiveRepository: ArchiveRepository | null;
  readonly challenge: DailyChallenge | null;
  readonly initialCareer: ClassicCareerState;
  readonly onActiveArchiveId: (id: string | null) => void;
  readonly onArchiveChanged: () => void;
  readonly onOpenArchive: (
    career: ClassicCareerState,
  ) => void;
  readonly onSaveError: (reason: string | null) => void;
  readonly onRestart: () => void;
  readonly repository: ClassicSessionRepository;
  readonly uiMode: UiMode;
};

function CareerExperience({
  activeArchiveId,
  archiveRepository,
  challenge,
  initialCareer,
  onActiveArchiveId,
  onArchiveChanged,
  onOpenArchive,
  onSaveError,
  onRestart,
  repository,
  uiMode,
}: CareerExperienceProps) {
  const reducedMotion = useReducedMotion();
  const reveal = useSeasonReveal(initialCareer, {
    reducedMotion,
  });
  const [replayCopyMessage, setReplayCopyMessage] =
    useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const pendingArchiveId = useRef<string | null>(null);
  const challengeProgress =
    challenge === null
      ? null
      : evaluateChallengeProgress(
          challenge.family,
          reveal.committedCareer,
        );

  if (
    archiveRepository !== null &&
    pendingArchiveId.current === null
  ) {
    pendingArchiveId.current =
      globalThis.crypto.randomUUID();
  }

  useEffect(() => {
    const result = repository.save(reveal.committedCareer);
    onSaveError(result.ok ? null : result.reason);
  }, [onSaveError, repository, reveal.committedCareer]);

  useEffect(() => {
    if (archiveRepository === null) {
      return;
    }

    const career = reveal.committedCareer;
    const displayName = `${career.identity.lastName}的生涯`;
    const archiveId =
      activeArchiveId ?? pendingArchiveId.current;

    if (archiveId === null) {
      onSaveError("无法生成本地档案标识");
      return;
    }

    const updated =
      activeArchiveId === null
        ? { ok: false as const, reason: "not_found" as const }
        : archiveRepository.update(archiveId, career);

    if (updated.ok) {
      onSaveError(null);
      onArchiveChanged();
      return;
    }

    if (updated.reason !== "not_found") {
      onSaveError(
        updated.reason === "unavailable" ||
          updated.reason === "corrupt_index"
          ? updated.detail
          : `档案更新失败：${updated.reason}`,
      );
      return;
    }

    const created = archiveRepository.create({
      career,
      displayName,
      id: archiveId,
    });

    if (created.ok) {
      onActiveArchiveId(created.entry.id);
      onArchiveChanged();
      onSaveError(null);
      return;
    }

    if (created.reason === "duplicate_id") {
      const existing = archiveRepository.load(archiveId);

      if (existing.status === "ready") {
        onActiveArchiveId(archiveId);
        onArchiveChanged();
        onSaveError(null);
        return;
      }
    }

    onSaveError(
      created.reason === "capacity"
        ? `档案已满（${created.capacity} / ${created.capacity}），请先导出或删除`
        : created.reason === "unavailable" ||
            created.reason === "corrupt_index"
          ? created.detail
          : `档案保存失败：${created.reason}`,
    );
  }, [
    activeArchiveId,
    archiveRepository,
    onActiveArchiveId,
    onArchiveChanged,
    onSaveError,
    reveal.committedCareer,
  ]);

  if (
    reveal.committedCareer.phase === "summary" &&
    !reveal.isRevealing
  ) {
    const view = createSummaryPresentation(
      reveal.committedCareer,
    );
    const replayUrl =
      challenge === null
        ? null
        : createReplayUrl(
            new URL("/", window.location.href),
            createReplayPayload({
              career: reveal.committedCareer,
              challengeId: challenge.id,
            }),
          );
    const copyReplay =
      replayUrl === null
        ? undefined
        : () => {
            if (navigator.clipboard === undefined) {
              setReplayCopyMessage(
                "复制失败，请手动选择回放链接",
              );
              return;
            }

            void navigator.clipboard
              .writeText(replayUrl)
              .then(() =>
                setReplayCopyMessage("回放链接已复制"),
              )
              .catch(() =>
                setReplayCopyMessage(
                  "复制失败，请手动选择回放链接",
                ),
              );
          };
    const summaryProps = {
      ...(challenge === null ||
      challengeProgress === null ||
      replayUrl === null ||
      copyReplay === undefined
        ? {}
        : {
            challenge: {
              daily: challenge,
              progress: challengeProgress,
              replayUrl,
            },
            onCopyReplay: copyReplay,
            replayCopyMessage,
          }),
      onRestart: () => {
        setShareOpen(false);
        onRestart();
      },
      onShare: () => setShareOpen(true),
      view,
    };

    return (
      <>
        {uiMode === "enhanced" ? (
          <Suspense
            fallback={
              <EnhancedLoadingFallback label="正在整理生涯记录" />
            }
          >
            <EnhancedSummaryScreen
              {...summaryProps}
              onOpenArchive={() =>
                onOpenArchive(reveal.committedCareer)
              }
            />
          </Suspense>
        ) : (
          <SummaryScreen {...summaryProps} />
        )}
        {shareOpen ? (
          <Suspense
            fallback={
              uiMode === "enhanced" ? (
                <EnhancedLoadingFallback
                  label="正在生成分享卡片"
                  overlay
                />
              ) : null
            }
          >
            <ShareCardOverlay
              {...(challenge === null ||
              challengeProgress === null
                ? {}
                : {
                    challenge: {
                      calendarDate: challenge.calendarDate,
                      status: challengeProgress.status,
                      title: challengeProgress.title,
                    },
                  })}
              onClose={() => setShareOpen(false)}
              qrPayload={
                replayUrl ??
                new URL("/", window.location.href).href
              }
              variant={
                uiMode === "enhanced"
                  ? "enhanced"
                  : "classic"
              }
              view={view}
            />
          </Suspense>
        ) : null}
      </>
    );
  }

  const view = createCareerPresentation({
    activeRevealItem: reveal.activeItem,
    career: reveal.committedCareer,
    isRevealing: reveal.isRevealing,
    recentEventResult: reveal.recentEventResult,
    visibleSeasonCount: reveal.visibleSeasonCount,
  });

  const onChoose = (decisionId: string, optionId: string) => {
    const decision = reveal.committedCareer.currentDecision;

    if (
      decision === null ||
      decision.id !== decisionId
    ) {
      return;
    }

    const transition = applyClassicChoiceWithResult(
      reveal.committedCareer,
      {
        decisionId,
        decisionType: decision.type,
        optionId,
      },
    );
    reveal.commitTransition(transition);
  };

  if (uiMode === "enhanced") {
    return (
      <Suspense
        fallback={
          <EnhancedLoadingFallback label="正在载入生涯记录" />
        }
      >
        <EnhancedCareerScreen
          {...(challenge === null ||
          challengeProgress === null
            ? {}
            : {
                challenge: {
                  daily: challenge,
                  progress: challengeProgress,
                },
              })}
          onChoose={onChoose}
          onOpenArchive={() =>
            onOpenArchive(reveal.committedCareer)
          }
          statusMessage={reveal.announcement}
          view={view}
        />
      </Suspense>
    );
  }

  return (
    <CareerScreen
      onChoose={onChoose}
      statusMessage={reveal.announcement}
      view={view}
    />
  );
}

type RecoveryIssue =
  | Exclude<
      CareerLoadResult,
      { status: "empty" } | { status: "ready" }
    >
  | Exclude<
      ClassicSessionLoadResult,
      { status: "empty" } | { status: "ready" }
    >;

type InitialAppState = {
  readonly classicCareer: ClassicCareerState | null;
  readonly recovery: RecoveryIssue | null;
  readonly setupState: CareerState;
};

function hasResumableState(initial: InitialAppState): boolean {
  return (
    initial.classicCareer !== null ||
    initial.setupState.phase !== "landing"
  );
}

function loadInitialState(
  setupRepository: CareerRepository,
  classicRepository: ClassicSessionRepository,
  seed: string,
): InitialAppState {
  const classicLoaded = classicRepository.load();

  if (classicLoaded.status === "ready") {
    return {
      classicCareer: classicLoaded.state,
      recovery: null,
      setupState: createInitialCareerState(seed),
    };
  }

  if (classicLoaded.status !== "empty") {
    return {
      classicCareer: null,
      recovery: classicLoaded,
      setupState: createInitialCareerState(seed),
    };
  }

  const setupLoaded = setupRepository.load();

  if (setupLoaded.status === "ready") {
    if (isSetupPhase(setupLoaded.state)) {
      return {
        classicCareer: null,
        recovery: null,
        setupState: setupLoaded.state,
      };
    }

    return {
      classicCareer: startClassicFromSetup(
        setupLoaded.state,
        "normal",
      ),
      recovery: null,
      setupState: setupLoaded.state,
    };
  }

  return {
    classicCareer: null,
    recovery:
      setupLoaded.status === "empty" ? null : setupLoaded,
    setupState: createInitialCareerState(seed),
  };
}

function startClassicFromSetup(
  state: CareerState,
  mode: PacingMode,
): ClassicCareerState {
  const { nationality, number, position } = state.player;

  if (nationality === null || position === null) {
    throw new RangeError(
      "Nationality and position are required before starting",
    );
  }

  const preferredNumber = Number(number);

  if (
    !Number.isInteger(preferredNumber) ||
    preferredNumber < 1 ||
    preferredNumber > 99
  ) {
    throw new RangeError("Shirt number must be between 1 and 99");
  }

  return startClassicCareer({
    identity: {
      lastName: state.player.name.trim(),
      nationalityFifaCode: nationality,
      position,
      preferredNumber,
    },
    mode,
    seed: state.seed,
  });
}

function isSetupPhase(state: CareerState): boolean {
  return (
    state.phase === "landing" ||
    state.phase === "nationality" ||
    state.phase === "identity" ||
    state.phase === "position"
  );
}

function discardClassicSession(): void {
  try {
    window.localStorage.removeItem(
      ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
    );
  } catch {
    // Recovery can continue in memory when storage is unavailable.
  }
}
