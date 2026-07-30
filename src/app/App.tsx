import { useReducer } from "react";

import {
  createInitialSetupState,
  setupReducer,
  type SetupState,
} from "./setupReducer";
import { CareerScreen } from "../ui/classic/CareerScreen";
import { IdentityScreen } from "../ui/classic/IdentityScreen";
import { LandingScreen } from "../ui/classic/LandingScreen";
import { NationalityScreen } from "../ui/classic/NationalityScreen";
import { PositionScreen } from "../ui/classic/PositionScreen";

function renderScreen(
  state: SetupState,
  dispatch: React.Dispatch<Parameters<typeof setupReducer>[1]>,
) {
  switch (state.screen) {
    case "landing":
      return <LandingScreen onBegin={() => dispatch({ type: "begin" })} />;
    case "nationality":
      return (
        <NationalityScreen
          nationality={state.player.nationality}
          onBack={() => dispatch({ type: "back" })}
          onContinue={() => dispatch({ type: "continue" })}
          onSelect={() => dispatch({ type: "select_nationality" })}
        />
      );
    case "identity":
      return (
        <IdentityScreen
          player={state.player}
          onBack={() => dispatch({ type: "back" })}
          onContinue={() => dispatch({ type: "continue" })}
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
          onSelect={() => dispatch({ type: "select_position" })}
          onStart={() => dispatch({ type: "start_career" })}
        />
      );
    case "career":
      return <CareerScreen player={state.player} />;
  }
}

export function App() {
  const [state, dispatch] = useReducer(
    setupReducer,
    undefined,
    createInitialSetupState,
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
