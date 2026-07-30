export const PHASE_1_CONTENT_VERSION = "phase-1" as const;

export type CareerPhase =
  | "landing"
  | "nationality"
  | "identity"
  | "position"
  | "decision"
  | "period_result"
  | "retired";

export type PreferredFoot = "left" | "right";
export type NationalityCode = "CHN";
export type PositionCode = "ST";

export type Phase1EventType =
  | "academy_offer"
  | "transfer"
  | "loan_offer"
  | "post_loan_retained"
  | "post_loan_not_retained"
  | "training_extra"
  | "season_load"
  | "no_offers_retirement";

export type DecisionOption = {
  id: string;
  label: string;
};

export type CareerDecision = {
  age: number;
  description: string;
  id: string;
  options: readonly DecisionOption[];
  title: string;
  type: Phase1EventType;
};

export type ChoiceLogEntry = {
  age: number;
  decisionId: string;
  eventType: Phase1EventType;
  optionId: string;
};

export type PlayerProfile = {
  foot: PreferredFoot;
  name: string;
  nationality: NationalityCode | null;
  number: string;
  position: PositionCode | null;
};

export type CareerTotals = {
  appearances: number;
  assists: number;
  goals: number;
};

export type SquadRole = "reserve" | "rotation" | "starter" | "star";

export type SeasonRecord = {
  abilityAfter: number;
  abilityBefore: number;
  age: number;
  appearances: number;
  assists: number;
  clubId: string;
  goals: number;
  role: SquadRole;
  trophies: readonly string[];
  valueEuroAfter: number;
  valueEuroBefore: number;
};

export type CareerProgress = {
  ability: number;
  age: number;
  clubId: string | null;
  parentClubId: string | null;
  retirementReason: string | null;
  role: "free_agent" | SquadRole;
  seasons: readonly SeasonRecord[];
  totals: CareerTotals;
  trophies: readonly string[];
  valueEuro: number;
};

export type CareerState = {
  activeDecision: CareerDecision | null;
  career: CareerProgress;
  choiceLog: readonly ChoiceLogEntry[];
  contentVersion: typeof PHASE_1_CONTENT_VERSION;
  lastChoice: ChoiceLogEntry | null;
  mode: "standard";
  phase: CareerPhase;
  player: PlayerProfile;
  rngState: number;
  seed: string;
};

export type CareerAction =
  | { type: "back" }
  | { type: "begin_setup" }
  | { type: "continue_setup" }
  | { nationality: NationalityCode; type: "select_nationality" }
  | { position: PositionCode; type: "select_position" }
  | {
      foot?: PreferredFoot;
      name?: string;
      number?: string;
      type: "update_identity";
    }
  | { type: "start_career" }
  | { type: "continue_career" }
  | {
      decisionId: string;
      optionId: string;
      type: "choose_decision";
    };
