import { createNextDecision } from "./decisionFactory";
import { createRngState } from "./rng";
import {
  simulateStandardPeriod,
  squadRoleForAbility,
} from "./seasonSimulator";
import {
  PHASE_1_CONTENT_VERSION,
  type CareerAction,
  type CareerDecision,
  type CareerPhase,
  type CareerProgress,
  type CareerState,
  type ChoiceLogEntry,
  type SquadRole,
} from "./model";

const previousSetupPhase: Partial<Record<CareerPhase, CareerPhase>> = {
  identity: "nationality",
  nationality: "landing",
  position: "identity",
};

export function createInitialCareerState(seed: string): CareerState {
  return {
    activeDecision: null,
    career: {
      ability: 50,
      age: 16,
      clubId: null,
      parentClubId: null,
      retirementReason: null,
      role: "free_agent",
      seasons: [],
      totals: {
        appearances: 0,
        assists: 0,
        goals: 0,
      },
      trophies: [],
      valueEuro: 100_000,
    },
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
      return startCareer(state);
    case "continue_career":
      return continueCareer(state);
    case "reset_career":
      return createInitialCareerState(action.seed);
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

  if (decision.type === "no_offers_retirement") {
    return {
      ...state,
      activeDecision: null,
      career: {
        ...state.career,
        clubId: null,
        parentClubId: null,
        retirementReason: "连续两个赛季没有收到职业合同",
        role: "free_agent",
      },
      choiceLog: [...state.choiceLog, choice],
      lastChoice: choice,
      phase: "retired",
    };
  }

  const career = applyDecisionChoice(state.career, decision, optionId);

  if (career.clubId === null || career.role === "free_agent") {
    return state;
  }

  const period = simulateStandardPeriod({
    ability: career.ability,
    age: career.age,
    clubId: career.clubId,
    rngState: state.rngState,
    role: career.role,
    valueEuro: career.valueEuro,
  });

  return {
    ...state,
    activeDecision: null,
    career: {
      ...career,
      ability: period.ability,
      age: period.age,
      role: period.role,
      seasons: [...career.seasons, ...period.seasons],
      totals: {
        appearances:
          career.totals.appearances + period.totals.appearances,
        assists: career.totals.assists + period.totals.assists,
        goals: career.totals.goals + period.totals.goals,
      },
      trophies: [...career.trophies, ...period.trophies],
      valueEuro: period.valueEuro,
    },
    choiceLog: [...state.choiceLog, choice],
    lastChoice: choice,
    phase: "period_result",
    rngState: period.rngState,
  };
}

function startCareer(state: CareerState): CareerState {
  if (
    state.phase !== "position" ||
    !state.player.nationality ||
    !state.player.position ||
    !isValidIdentity(state.player.name, state.player.number)
  ) {
    return state;
  }

  const next = createNextDecision(state.career, state.rngState);

  return {
    ...state,
    activeDecision: next.decision,
    phase: "decision",
    rngState: next.rngState,
  };
}

function continueCareer(state: CareerState): CareerState {
  if (state.phase !== "period_result") {
    return state;
  }

  const next = createNextDecision(state.career, state.rngState);

  return {
    ...state,
    activeDecision: next.decision,
    phase: "decision",
    rngState: next.rngState,
  };
}

function applyDecisionChoice(
  career: CareerProgress,
  decision: CareerDecision,
  optionId: string,
): CareerProgress {
  switch (decision.type) {
    case "academy_offer": {
      const clubId = optionTarget(optionId, "join:");
      return clubId
        ? {
            ...career,
            clubId,
            parentClubId: null,
            role: "reserve",
          }
        : career;
    }
    case "transfer": {
      const clubId = optionTarget(optionId, "transfer:");
      return clubId
        ? {
            ...career,
            clubId,
            parentClubId: null,
            role: squadRoleForAbility(career.ability),
          }
        : career;
    }
    case "loan_offer": {
      const clubId = optionTarget(optionId, "accept-loan:");
      return clubId && career.clubId
        ? {
            ...career,
            clubId,
            parentClubId: career.clubId,
            role: "starter",
          }
        : career;
    }
    case "post_loan_retained": {
      const clubId =
        optionTarget(optionId, "return-loan:") ??
        optionTarget(optionId, "stay-loan:");
      return clubId
        ? {
            ...career,
            clubId,
            parentClubId: null,
            role: squadRoleForAbility(career.ability),
          }
        : career;
    }
    case "post_loan_not_retained": {
      const clubId = optionTarget(optionId, "join:");
      return clubId
        ? {
            ...career,
            clubId,
            parentClubId: null,
            role: squadRoleForAbility(career.ability),
          }
        : career;
    }
    case "training_extra": {
      if (optionId !== "train-extra") {
        return career;
      }

      const ability = Math.min(99, career.ability + 2);
      return {
        ...career,
        ability,
        role:
          career.role === "free_agent"
            ? career.role
            : squadRoleForAbility(ability),
      };
    }
    case "season_load":
      return optionId === "manage-load"
        ? {
            ...career,
            ability: Math.min(99, career.ability + 1),
            role: managedRole(career.role),
          }
        : career;
    case "no_offers_retirement":
      return career;
  }
}

function optionTarget(optionId: string, prefix: string): string | null {
  return optionId.startsWith(prefix) ? optionId.slice(prefix.length) : null;
}

function managedRole(role: CareerProgress["role"]): SquadRole | "free_agent" {
  if (role === "free_agent") {
    return role;
  }

  if (role === "star" || role === "starter") {
    return "rotation";
  }

  return role;
}
