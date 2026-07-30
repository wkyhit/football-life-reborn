import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
} from "react";

import {
  careerReducer,
  createInitialCareerState,
} from "../domain/careerReducer";
import type { CareerAction, CareerState } from "../domain/model";
import {
  createCareerRepository,
  type CareerLoadResult,
  type CareerRepository,
} from "../storage/careerRepository";
import { CareerScreen } from "../ui/classic/CareerScreen";
import { IdentityScreen } from "../ui/classic/IdentityScreen";
import { LandingScreen } from "../ui/classic/LandingScreen";
import { NationalityScreen } from "../ui/classic/NationalityScreen";
import { PositionScreen } from "../ui/classic/PositionScreen";
import { RecoveryScreen } from "../ui/classic/RecoveryScreen";
import { seedFromSearch } from "./seed";

function renderScreen(
  state: CareerState,
  dispatch: Dispatch<CareerAction>,
) {
  switch (state.phase) {
    case "landing":
      return (
        <LandingScreen onBegin={() => dispatch({ type: "begin_setup" })} />
      );
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
            dispatch({ type: "update_identity", foot })
          }
          onNameChange={(name) =>
            dispatch({ type: "update_identity", name })
          }
          onNumberChange={(number) =>
            dispatch({ type: "update_identity", number })
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
          onStart={() => dispatch({ type: "start_career" })}
        />
      );
    case "decision":
    case "period_result":
    case "retired":
      return (
        <CareerScreen
          state={state}
          onChoose={(decisionId, optionId) =>
            dispatch({
              decisionId,
              optionId,
              type: "choose_decision",
            })
          }
          onContinue={() => dispatch({ type: "continue_career" })}
        />
      );
  }
}

export function App() {
  const repository = useMemo(
    () => createCareerRepository(window.localStorage),
    [],
  );
  const [initial] = useState(() =>
    loadInitialState(
      repository,
      seedFromSearch(window.location.search),
    ),
  );
  const [state, dispatch] = useReducer(
    careerReducer,
    initial.state,
  );
  const [recovery, setRecovery] = useState(initial.recovery);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (recovery !== null) {
      return;
    }

    const result = repository.save(state);
    setSaveError(result.ok ? null : result.reason);
  }, [recovery, repository, state]);

  if (recovery !== null) {
    return (
      <RecoveryScreen
        recovery={recovery}
        onStartNew={() => {
          setRecovery(null);
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
      {renderScreen(state, dispatch)}
    </>
  );
}

type RecoveryIssue = Exclude<
  CareerLoadResult,
  { status: "empty" } | { status: "ready" }
>;

type InitialAppState = {
  recovery: RecoveryIssue | null;
  state: CareerState;
};

function loadInitialState(
  repository: CareerRepository,
  seed: string,
): InitialAppState {
  const loaded = repository.load();

  if (loaded.status === "ready") {
    return {
      recovery: null,
      state: loaded.state,
    };
  }

  return {
    recovery: loaded.status === "empty" ? null : loaded,
    state: createInitialCareerState(seed),
  };
}
