import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
} from "react";

import {
  applyClassicChoice,
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
import { useSeasonReveal } from "../features/season-reveal/seasonReveal";
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

const ShareCardOverlay = lazy(async () => {
  const module = await import(
    "../features/share-card/ShareCardOverlay"
  );
  return { default: module.ShareCardOverlay };
});

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
  const [uiMode] = useState(() =>
    resolveUiMode(
      window.location.search,
      window.localStorage,
    ),
  );

  if (uiMode === "enhanced") {
    return (
      <Suspense fallback={null}>
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
  const [initial] = useState(() =>
    loadInitialState(
      setupRepository,
      classicRepository,
      seedFromSearch(window.location.search),
    ),
  );
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
  const [mode, setMode] = useState<PacingMode>("normal");
  const [recovery, setRecovery] = useState(initial.recovery);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  if (recovery !== null) {
    return (
      <RecoveryScreen
        recovery={recovery}
        onStartNew={() => {
          discardClassicSession();
          setRecovery(null);
          setClassicCareer(null);
          dispatch({
            seed: seedFromSearch(window.location.search),
            type: "reset_career",
          });
        }}
      />
    );
  }

  return (
    <>
      <a
        className="sr-only z-50 rounded-[8px] bg-accent px-4 py-3 font-bold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        跳到主要内容
      </a>
      {saveError ? (
        <p
          className="fixed inset-x-4 top-4 z-40 mx-auto max-w-lg rounded-[12px] border border-china bg-canvas px-4 py-3 text-sm text-primary shadow-xl"
          role="alert"
        >
          本地保存失败：{saveError}
        </p>
      ) : null}
      {uiMode === "enhanced" &&
      (enhancedEntryPending || classicCareer === null) ? (
        <Suspense fallback={null}>
          <EnhancedOnboarding
            dispatch={dispatch}
            hasResume={resumeAvailable}
            isEntryPrompt={enhancedEntryPending}
            newCareerSeed={seedFromSearch(
              window.location.search,
            )}
            onBegin={(selectedMode) => {
              setMode(selectedMode);
              discardClassicSession();
              setClassicCareer(null);
              setResumeAvailable(false);
              setEnhancedEntryPending(false);
              dispatch({
                seed: seedFromSearch(window.location.search),
                type: "reset_career",
              });
              dispatch({ type: "begin_setup" });
            }}
            onRandom={(selectedMode, player) => {
              setMode(selectedMode);
              discardClassicSession();
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
            onStart={() => {
              setClassicCareer(
                startClassicFromSetup(setupState, mode),
              );
            }}
            state={setupState}
          />
        </Suspense>
      ) : classicCareer ? (
        <CareerExperience
          initialCareer={classicCareer}
          onSaveError={setSaveError}
          onRestart={() => {
            discardClassicSession();
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
  readonly initialCareer: ClassicCareerState;
  readonly onSaveError: (reason: string | null) => void;
  readonly onRestart: () => void;
  readonly repository: ClassicSessionRepository;
  readonly uiMode: UiMode;
};

function CareerExperience({
  initialCareer,
  onSaveError,
  onRestart,
  repository,
  uiMode,
}: CareerExperienceProps) {
  const reducedMotion = useReducedMotion();
  const reveal = useSeasonReveal(initialCareer, {
    reducedMotion,
  });
  const [
    enhancedAnnouncement,
    setEnhancedAnnouncement,
  ] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!reducedMotion) {
      setEnhancedAnnouncement(null);
      return;
    }

    if (reveal.isRevealing) {
      setEnhancedAnnouncement(
        `赛季更新完成，已记录 ${reveal.committedCareer.seasons.length} 个赛季`,
      );
    }
  }, [
    reducedMotion,
    reveal.committedCareer.seasons.length,
    reveal.isRevealing,
  ]);

  useEffect(() => {
    const result = repository.save(reveal.committedCareer);
    onSaveError(result.ok ? null : result.reason);
  }, [onSaveError, repository, reveal.committedCareer]);

  if (
    reveal.committedCareer.phase === "summary" &&
    !reveal.isRevealing
  ) {
    const view = createSummaryPresentation(
      reveal.committedCareer,
    );

    return (
      <>
        <SummaryScreen
          onRestart={() => {
            setShareOpen(false);
            onRestart();
          }}
          onShare={() => setShareOpen(true)}
          view={view}
        />
        {shareOpen ? (
          <Suspense fallback={null}>
            <ShareCardOverlay
              onClose={() => setShareOpen(false)}
              qrPayload={new URL("/", window.location.href).href}
              view={view}
            />
          </Suspense>
        ) : null}
      </>
    );
  }

  const view = createCareerPresentation({
    career: reveal.committedCareer,
    isRevealing: reveal.isRevealing,
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

    const nextCareer = applyClassicChoice(
      reveal.committedCareer,
      {
        decisionId,
        decisionType: decision.type,
        optionId,
      },
    );
    reveal.commitCareer(nextCareer);
    setEnhancedAnnouncement(
      reducedMotion &&
        nextCareer.seasons.length >
          reveal.committedCareer.seasons.length
        ? `赛季更新完成，已记录 ${nextCareer.seasons.length} 个赛季`
        : null,
    );
  };

  if (uiMode === "enhanced") {
    return (
      <Suspense fallback={null}>
        <EnhancedCareerScreen
          onChoose={onChoose}
          statusMessage={enhancedAnnouncement}
          view={view}
        />
      </Suspense>
    );
  }

  return <CareerScreen onChoose={onChoose} view={view} />;
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
