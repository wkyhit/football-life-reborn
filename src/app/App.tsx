import { useReducer, type Dispatch } from "react";

import {
  careerReducer,
  createInitialCareerState,
} from "../domain/careerReducer";
import type { CareerAction, CareerState } from "../domain/model";
import { CareerScreen } from "../ui/classic/CareerScreen";
import { IdentityScreen } from "../ui/classic/IdentityScreen";
import { LandingScreen } from "../ui/classic/LandingScreen";
import { NationalityScreen } from "../ui/classic/NationalityScreen";
import { PositionScreen } from "../ui/classic/PositionScreen";

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
          onSelect={() =>
            dispatch({ nationality: "CHN", type: "select_nationality" })
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
          onSelect={() =>
            dispatch({ position: "ST", type: "select_position" })
          }
          onStart={() => dispatch({ type: "start_career" })}
        />
      );
    case "decision":
    case "period_result":
    case "retired":
      return <CareerScreen player={state.player} />;
  }
}

export function App() {
  const [state, dispatch] = useReducer(
    careerReducer,
    undefined,
    () => createInitialCareerState("phase-1-default"),
  );

  return (
    <>
      <a
        className="sr-only z-50 rounded-[8px] bg-accent px-4 py-3 font-bold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        跳到主要内容
      </a>
      {renderScreen(state, dispatch)}
    </>
  );
}
