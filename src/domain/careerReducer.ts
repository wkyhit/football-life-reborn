import { createRngState } from "./rng";
import {
  PHASE_1_CONTENT_VERSION,
  type CareerAction,
  type CareerPhase,
  type CareerState,
  type ChoiceLogEntry,
} from "./model";

const previousSetupPhase: Partial<Record<CareerPhase, CareerPhase>> = {
  identity: "nationality",
  nationality: "landing",
  position: "identity",
};

export function createInitialCareerState(seed: string): CareerState {
  return {
    activeDecision: null,
    choiceLog: [],
    contentVersion: PHASE_1_CONTENT_VERSION,
    lastChoice: null,
    mode: "standard",
    phase: "landing",
    player: {
      foot: "right",
      name: "刘",
      nationality: null,
      number: "10",
      position: null,
    },
    rngState: createRngState(seed),
    seed,
  };
}

export function careerReducer(
  state: CareerState,
  action: CareerAction,
): CareerState {
  switch (action.type) {
    case "begin_setup":
      return state.phase === "landing"
        ? { ...state, phase: "nationality" }
        : state;
    case "select_nationality":
      return state.phase === "nationality"
        ? {
            ...state,
            player: {
              ...state.player,
              nationality: action.nationality,
            },
          }
        : state;
    case "continue_setup":
      if (state.phase === "nationality" && state.player.nationality) {
        return { ...state, phase: "identity" };
      }

      if (
        state.phase === "identity" &&
        isValidIdentity(state.player.name, state.player.number)
      ) {
        return {
          ...state,
          phase: "position",
          player: {
            ...state.player,
            name: state.player.name.trim(),
          },
        };
      }

      return state;
    case "update_identity":
      return state.phase === "identity"
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
      return state.phase === "position"
        ? {
            ...state,
            player: {
              ...state.player,
              position: action.position,
            },
          }
        : state;
    case "start_career":
      return state.phase === "position" &&
        state.player.nationality &&
        state.player.position &&
        isValidIdentity(state.player.name, state.player.number)
        ? { ...state, phase: "decision" }
        : state;
    case "choose_decision":
      return resolveDecision(state, action.decisionId, action.optionId);
    case "back": {
      const phase = previousSetupPhase[state.phase];
      return phase ? { ...state, phase } : state;
    }
  }
}

export function isValidShirtNumber(value: string): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 99;
}

function isValidIdentity(name: string, number: string): boolean {
  const trimmedName = name.trim();
  return (
    trimmedName.length >= 1 &&
    trimmedName.length <= 12 &&
    isValidShirtNumber(number)
  );
}

function resolveDecision(
  state: CareerState,
  decisionId: string,
  optionId: string,
): CareerState {
  const decision = state.activeDecision;

  if (
    state.phase !== "decision" ||
    decision?.id !== decisionId ||
    !decision.options.some((option) => option.id === optionId)
  ) {
    return state;
  }

  const choice: ChoiceLogEntry = {
    age: decision.age,
    decisionId: decision.id,
    eventType: decision.type,
    optionId,
  };

  return {
    ...state,
    activeDecision: null,
    choiceLog: [...state.choiceLog, choice],
    lastChoice: choice,
    phase: "period_result",
  };
}
