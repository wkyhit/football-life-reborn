export type SetupScreen =
  | "landing"
  | "nationality"
  | "identity"
  | "position"
  | "career";

export type PreferredFoot = "left" | "right";

export type PlayerDraft = {
  foot: PreferredFoot;
  name: string;
  nationality: "CHN" | null;
  number: string;
  position: "ST" | null;
};

export type SetupState = {
  player: PlayerDraft;
  screen: SetupScreen;
};

export type SetupAction =
  | { type: "back" }
  | { type: "begin" }
  | { type: "continue" }
  | { type: "select_nationality" }
  | { type: "select_position" }
  | {
      type: "update_identity";
      foot?: PreferredFoot;
      name?: string;
      number?: string;
    }
  | { type: "start_career" };

const backScreen: Partial<Record<SetupScreen, SetupScreen>> = {
  identity: "nationality",
  nationality: "landing",
  position: "identity",
};

export function createInitialSetupState(): SetupState {
  return {
    player: {
      foot: "right",
      name: "刘",
      nationality: null,
      number: "10",
      position: null,
    },
    screen: "landing",
  };
}

export function setupReducer(
  state: SetupState,
  action: SetupAction,
): SetupState {
  switch (action.type) {
    case "begin":
      return state.screen === "landing"
        ? { ...state, screen: "nationality" }
        : state;
    case "select_nationality":
      return state.screen === "nationality"
        ? {
            ...state,
            player: { ...state.player, nationality: "CHN" },
          }
        : state;
    case "continue":
      if (state.screen === "nationality" && state.player.nationality) {
        return { ...state, screen: "identity" };
      }

      if (
        state.screen === "identity" &&
        state.player.name.trim() &&
        isValidShirtNumber(state.player.number)
      ) {
        return { ...state, screen: "position" };
      }

      return state;
    case "update_identity":
      return state.screen === "identity"
        ? {
            ...state,
            player: {
              ...state.player,
              ...(action.foot === undefined ? {} : { foot: action.foot }),
              ...(action.name === undefined ? {} : { name: action.name }),
              ...(action.number === undefined
                ? {}
                : { number: action.number }),
            },
          }
        : state;
    case "select_position":
      return state.screen === "position"
        ? { ...state, player: { ...state.player, position: "ST" } }
        : state;
    case "start_career":
      return state.screen === "position" && state.player.position
        ? { ...state, screen: "career" }
        : state;
    case "back": {
      const screen = backScreen[state.screen];
      return screen ? { ...state, screen } : state;
    }
  }
}

export function isValidShirtNumber(value: string): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 99;
}
