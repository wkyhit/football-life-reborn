import {
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
import { IdentityScreen } from "../ui/classic/IdentityScreen";
import { LandingScreen } from "../ui/classic/LandingScreen";
import { NationalityScreen } from "../ui/classic/NationalityScreen";
import { PositionScreen } from "../ui/classic/PositionScreen";
import { RecoveryScreen } from "../ui/classic/RecoveryScreen";
import { seedFromSearch } from "./seed";

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
    if (recovery !== null || classicCareer !== null) {
      return;
    }

    const result = setupRepository.save(setupState);
    setSaveError(result.ok ? null : result.reason);
  }, [classicCareer, recovery, setupRepository, setupState]);

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
      {classicCareer ? (
        <ClassicCareerExperience
          initialCareer={classicCareer}
          onSaveError={setSaveError}
          repository={classicRepository}
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

type ClassicCareerExperienceProps = {
  readonly initialCareer: ClassicCareerState;
  readonly onSaveError: (reason: string | null) => void;
  readonly repository: ClassicSessionRepository;
};

function ClassicCareerExperience({
  initialCareer,
  onSaveError,
  repository,
}: ClassicCareerExperienceProps) {
  const reveal = useSeasonReveal(initialCareer);

  useEffect(() => {
    const result = repository.save(reveal.committedCareer);
    onSaveError(result.ok ? null : result.reason);
  }, [onSaveError, repository, reveal.committedCareer]);

  const view = createCareerPresentation({
    career: reveal.committedCareer,
    isRevealing: reveal.isRevealing,
    visibleSeasonCount: reveal.visibleSeasonCount,
  });

  return (
    <CareerScreen
      view={view}
      onChoose={(decisionId, optionId) => {
        const decision = reveal.committedCareer.currentDecision;

        if (
          decision === null ||
          decision.id !== decisionId
        ) {
          return;
        }

        reveal.commitCareer(
          applyClassicChoice(reveal.committedCareer, {
            decisionId,
            decisionType: decision.type,
            optionId,
          }),
        );
      }}
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
