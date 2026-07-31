import {
  createCatalogClubTrophyContext,
  simulateClubTrophies,
  simulatePersonalAwards,
} from "./awards";
import type { PersonalAward } from "./awards";
import {
  applyCareerEventChoice,
  applyDeferredCareerEventRecovery,
  applyImmediateCareerEventEffects,
  completeCareerEventPlan,
  createCareerEventPlan,
  DEFAULT_CAREER_EVENT_MODIFIERS,
  nextCareerEventSlot,
  selectCareerEvent,
  suspensionSeasonsForEvent,
} from "./careerEvents";
import type {
  CareerEventKey,
  CareerEventModifiers,
  CareerEventOutcomeKind,
  CareerEventPlan,
  CareerEventSelection,
  CareerEventVariant,
  CareerTrophy,
  ClubTrophy,
  ForcedCareerEventOutcome,
  InjuryType,
  NationalTrophy,
  TrophyOverride,
} from "./careerEvents";
import {
  CLASSIC_CATALOG,
  CLASSIC_CONTENT_VERSION,
} from "./catalog/classicCatalog";
import type {
  Club,
  Country,
} from "./catalog/classicCatalog";
import {
  classicChance,
  classicPick,
  createClassicRngState,
  deriveClassicRngState,
} from "./classicRng";
import {
  applyAnnualDevelopment,
  authorizedLegendProfile,
  resolveDevelopmentProfile,
} from "./development";
import type {
  DevelopmentCycle,
  DevelopmentProfile,
} from "./development";
import { simulateMarketValue } from "./economics";
import {
  planNationalTournaments,
  resolveNationalTournamentSeason,
  simulateNationalTeamPeriod,
} from "./nationalTeam";
import type {
  NationalTeamPeriod,
  NationalTournamentRecord,
  PlannedNationalTournament,
} from "./nationalTeam";
import { PACING_CONFIGS } from "./pacing";
import type { PacingMode } from "./pacing";
import {
  resolveClassicSquadRole,
  roleGroupForPosition,
  simulateRoleSeason,
} from "./role";
import type {
  ClassicPosition,
  ClassicSeasonStats,
  ClassicSquadRole,
} from "./role";
import {
  aggregateCareerSummary,
  calculateCareerTotals,
  validateCareerTotals,
} from "./summary";
import type {
  CareerSummary,
  ClassicSummarySeason,
  RetirementReason,
} from "./summary";
import {
  careerRetirementMinimum,
  createCatalogTransferCandidateProvider,
  generateFreeAgentOffers,
  generateLoanOffers,
  generateTransferOffers,
  loanOfferProbability,
  resolveLoanReturn,
  resolveTierChange,
  shouldTriggerContractNonRenewal,
} from "./transfer";
import type {
  TransferCandidate,
  TransferPlayer,
} from "./transfer";

export type ClassicIdentity = {
  readonly firstName?: string;
  readonly lastName: string;
  readonly nationalityFifaCode: string;
  readonly position: ClassicPosition;
  readonly preferredNumber: number;
};

export type ClassicDecisionType =
  | "academy_offer"
  | "career_event"
  | "contract_nonrenewal"
  | "loan_offer"
  | "no_offers_retirement"
  | "post_loan_not_retained"
  | "post_loan_retained"
  | "transfer";

export type ClassicDecisionOption = {
  readonly clubId?: string;
  readonly id: string;
  readonly kind:
    | "career_choice"
    | "join_club"
    | "retire"
    | "stay";
  readonly label: string;
  readonly optionKey?: string;
};

export type ClassicDecision = {
  readonly age: number;
  readonly event?: {
    readonly eventKey: CareerEventKey;
    readonly injuryType?: InjuryType;
    readonly scheduledSlotAge: number;
    readonly targetClubTrophy?: ClubTrophy;
    readonly targetTrophy?: CareerTrophy;
    readonly variantKey?: CareerEventVariant;
  };
  readonly id: string;
  readonly options: readonly ClassicDecisionOption[];
  readonly type: ClassicDecisionType;
};

export type ClassicChoiceLogEntry = {
  readonly decisionId: string;
  readonly decisionType: ClassicDecisionType;
  readonly forcedOutcome?: ForcedCareerEventOutcome | undefined;
  readonly optionId: string;
};

export type ClassicDecisionEffectFacts = {
  readonly clubTrophyOverride:
    | Readonly<TrophyOverride<ClubTrophy>>
    | null;
  readonly clubWorldCupTrophyProbabilityMultiplier: number;
  readonly continentalPrimaryTrophyProbabilityMultiplier: number;
  readonly continentalSecondaryTrophyProbabilityMultiplier: number;
  readonly deferredOverallDelta: number;
  readonly domesticCupTrophyProbabilityMultiplier: number;
  readonly immediateOverallDelta: number;
  readonly leagueTrophyProbabilityMultiplier: number;
  readonly nationalTournament: NationalTrophy | null;
  readonly nationalTournamentParticipation:
    | "force"
    | "skip"
    | null;
  readonly nationalTrophyOverride:
    | Readonly<TrophyOverride<NationalTrophy>>
    | null;
  readonly permanentOverallDelta: number;
  readonly roleOverride: ClassicSquadRole | null;
  readonly roleShift: number;
  readonly statsMultiplier: number;
  readonly suspensionSeasons: number;
};

export type ClassicDecisionResult = {
  readonly decision: ClassicDecision;
  readonly effects: ClassicDecisionEffectFacts | null;
  readonly eventKey: CareerEventKey | null;
  readonly option: ClassicDecisionOption;
  readonly outcomeKind: CareerEventOutcomeKind | null;
};

export type ClassicChoiceTransition = {
  readonly career: ClassicCareerState;
  readonly result: ClassicDecisionResult;
};

export type ClassicCareerSeason = ClassicSummarySeason & {
  readonly competitionTier: 1 | 2;
  readonly nationalTournamentRecords: readonly NationalTournamentRecord[];
  readonly periodIndex: number;
  readonly relegated: boolean;
  readonly role: ClassicSquadRole;
};

export type ClassicCareerState = {
  readonly activeLoan: {
    readonly loanClubId: string;
    readonly parentClubId: string;
  } | null;
  readonly choiceCursor: number;
  readonly choiceLog: readonly ClassicChoiceLogEntry[];
  readonly completedLoan: {
    readonly loanClubId: string;
    readonly parentClubId: string;
  } | null;
  readonly contentVersion: typeof CLASSIC_CONTENT_VERSION;
  readonly contractClubId: string | null;
  readonly currentClubId: string | null;
  readonly currentDecision: ClassicDecision | null;
  readonly developmentCycle: DevelopmentCycle | null;
  readonly developmentProfile: DevelopmentProfile;
  readonly eventPlan: CareerEventPlan;
  readonly identity: ClassicIdentity;
  readonly marketValue: number;
  readonly mode: PacingMode;
  readonly nationalTeamPeriods: readonly NationalTeamPeriod[];
  readonly nationalityFifaCode: string;
  readonly overall: number;
  readonly permanentOverallDelta: number;
  readonly phase: "decision" | "summary";
  readonly playerAge: number;
  readonly retirementReason: RetirementReason | null;
  readonly rngState: number;
  readonly seasons: readonly ClassicCareerSeason[];
  readonly seed: string;
  readonly step: number;
  readonly summary: CareerSummary | null;
  readonly suspensionSeasonsRemaining: number;
  readonly tierOverrides: Readonly<Record<string, 1 | 2>>;
  readonly upcomingNationalTournaments: readonly PlannedNationalTournament[];
};

export type ClassicChoicePolicy = (
  state: ClassicCareerState,
  decision: ClassicDecision,
) =>
  | string
  | {
      readonly forcedOutcome?: ForcedCareerEventOutcome;
      readonly optionId: string;
    };

export type ClassicGoldenState = {
  readonly awards: readonly PersonalAward[];
  readonly badge: CareerSummary["badge"];
  readonly choiceCount: number;
  readonly clubIds: readonly string[];
  readonly contentVersion: typeof CLASSIC_CONTENT_VERSION;
  readonly developmentProfile: DevelopmentProfile;
  readonly ending: RetirementReason;
  readonly eventKeys: readonly CareerEventKey[];
  readonly finalAge: number;
  readonly finalMarketValue: number;
  readonly finalOverall: number;
  readonly hiddenTitles: CareerSummary["hiddenTitles"];
  readonly maxMarketValue: number;
  readonly maxOverall: number;
  readonly mode: PacingMode;
  readonly nationalStats: ClassicSeasonStats;
  readonly nationalTrophies: CareerSummary["nationalTrophies"];
  readonly rngState: number;
  readonly seasonCount: number;
  readonly seed: string;
  readonly suspendedSeasonCount: number;
  readonly totals: CareerSummary["totals"];
};

type ResolvedChoice = {
  readonly forcedOutcome?: ForcedCareerEventOutcome | undefined;
  readonly option: ClassicDecisionOption;
};

type PeriodChoiceEffects = {
  readonly eventOutcomeKind: CareerEventOutcomeKind | null;
  readonly modifiers: CareerEventModifiers;
  readonly nextState: ClassicCareerState;
};

type DecisionResult = {
  readonly decision: ClassicDecision;
  readonly rngState: number;
};

const TRANSFER_CANDIDATES =
  createCatalogTransferCandidateProvider(CLASSIC_CATALOG).all();
const EMPTY_STATS: ClassicSeasonStats = Object.freeze({
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
});

export function startClassicCareer(input: {
  readonly contentVersion?: string;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly seed: string;
}): ClassicCareerState {
  assertClassicContentVersion(
    input.contentVersion ?? CLASSIC_CONTENT_VERSION,
  );
  const country = countryForIdentity(input.identity);
  const roleGroup = roleGroupForPosition(input.identity.position);
  const legend = authorizedLegendProfile({
    isoAlpha2: country.isoAlpha2,
    lastName: input.identity.lastName,
    preferredNumber: input.identity.preferredNumber,
  });
  const developmentProfile = resolveDevelopmentProfile(
    input.seed,
    roleGroup,
    legend,
  );
  let rngState = createClassicRngState(input.seed);
  const academy = academyOffers(country, rngState);
  rngState = academy.rngState;
  const eventPlan = createCareerEventPlan({
    mode: input.mode,
    rngState,
  });
  rngState = eventPlan.rngState;
  const tournaments = planNationalTournaments({
    age: 16,
    continentalReputation: country.continentalReputation,
    rngState,
    seasons: PACING_CONFIGS[input.mode].periodLengthSeasons,
  });
  rngState = tournaments.rngState;

  return {
    activeLoan: null,
    choiceCursor: 0,
    choiceLog: [],
    completedLoan: null,
    contentVersion: CLASSIC_CONTENT_VERSION,
    contractClubId: null,
    currentClubId: null,
    currentDecision: createClubDecision(
      "academy_offer",
      16,
      0,
      academy.offers,
      false,
    ),
    developmentCycle: null,
    developmentProfile,
    eventPlan: eventPlan.plan,
    identity: Object.freeze({ ...input.identity }),
    marketValue: 100_000,
    mode: input.mode,
    nationalTeamPeriods: [],
    nationalityFifaCode: country.fifaCode,
    overall: 50,
    permanentOverallDelta: 0,
    phase: "decision",
    playerAge: 16,
    retirementReason: null,
    rngState,
    seasons: [],
    seed: input.seed,
    step: 0,
    summary: null,
    suspensionSeasonsRemaining: 0,
    tierOverrides: {},
    upcomingNationalTournaments: tournaments.tournaments,
  };
}

export function applyClassicChoice(
  state: ClassicCareerState,
  choice: ClassicChoiceLogEntry,
): ClassicCareerState {
  return applyClassicChoiceWithResult(state, choice).career;
}

export function applyClassicChoiceWithResult(
  state: ClassicCareerState,
  choice: ClassicChoiceLogEntry,
): ClassicChoiceTransition {
  if (state.phase === "summary" || state.currentDecision === null) {
    throw new RangeError("Cannot choose after the Classic career ended");
  }
  const decision = state.currentDecision;

  if (choice.decisionId !== decision.id) {
    throw new RangeError(
      `Choice expected decision ${decision.id}, received ${choice.decisionId}`,
    );
  }
  if (choice.decisionType !== decision.type) {
    throw new RangeError(
      `Choice expected type ${decision.type}, received ${choice.decisionType}`,
    );
  }

  const option = decision.options.find(
    (candidate) => candidate.id === choice.optionId,
  );

  if (option === undefined) {
    throw new RangeError(
      `Unknown option ${choice.optionId} for ${decision.id}`,
    );
  }

  const loggedState: ClassicCareerState = {
    ...state,
    choiceCursor: state.choiceCursor + 1,
    choiceLog: [...state.choiceLog, Object.freeze({ ...choice })],
  };

  if (option.kind === "retire") {
    const reason =
      decision.type === "no_offers_retirement"
        ? "no_offers"
        : "voluntary";
    return createChoiceTransition({
      career: finishClassicCareer(loggedState, reason),
      decision,
      effects: null,
      option,
      outcomeKind: null,
    });
  }

  const effects = resolveChoiceEffects(loggedState, {
    forcedOutcome: choice.forcedOutcome,
    option,
  });
  const career = simulateClassicPeriod(
    effects.nextState,
    effects.modifiers,
  );

  return createChoiceTransition({
    career,
    decision,
    effects:
      decision.type === "career_event"
        ? createDecisionEffectFacts(
            effects.modifiers,
            state.mode,
          )
        : null,
    option,
    outcomeKind: effects.eventOutcomeKind,
  });
}

export function replayClassicCareer(input: {
  readonly choices: readonly ClassicChoiceLogEntry[];
  readonly contentVersion?: string;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly seed: string;
}): ClassicCareerState {
  let state = startClassicCareer(input);

  for (const choice of input.choices) {
    if (state.phase === "summary") {
      throw new RangeError(
        `Replay has ${input.choices.length - state.choiceCursor} choice(s) after retirement`,
      );
    }

    state = applyClassicChoice(state, choice);
  }

  return state;
}

export function playClassicCareer(input: {
  readonly contentVersion?: string;
  readonly identity: ClassicIdentity;
  readonly maxChoices?: number;
  readonly mode: PacingMode;
  readonly policy?: ClassicChoicePolicy;
  readonly seed: string;
}): ClassicCareerState {
  const policy = input.policy ?? defaultClassicChoicePolicy;
  const maximum = input.maxChoices ?? 128;
  let state = startClassicCareer(input);

  while (
    state.phase !== "summary" &&
    state.choiceCursor < maximum
  ) {
    const decision = state.currentDecision;

    if (decision === null) {
      throw new Error("Decision phase is missing its decision");
    }

    const selected = policy(state, decision);
    const normalized =
      typeof selected === "string"
        ? { optionId: selected }
        : selected;
    state = applyClassicChoice(state, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: normalized.optionId,
      ...(normalized.forcedOutcome === undefined
        ? {}
        : { forcedOutcome: normalized.forcedOutcome }),
    });
  }

  if (state.phase !== "summary") {
    throw new RangeError(
      `Classic career exceeded ${maximum} choices`,
    );
  }

  return state;
}

export function defaultClassicChoicePolicy(
  state: ClassicCareerState,
  decision: ClassicDecision,
): string {
  if (decision.type === "no_offers_retirement") {
    return decision.options[0]!.id;
  }

  const retirement = decision.options.find(
    (option) => option.kind === "retire",
  );

  if (retirement !== undefined && state.playerAge >= 38) {
    return retirement.id;
  }

  const stay = decision.options.find(
    (option) => option.kind === "stay",
  );

  return (stay ?? decision.options[0])!.id;
}

export function projectClassicGoldenState(
  state: ClassicCareerState,
): ClassicGoldenState {
  if (state.phase !== "summary" || state.summary === null) {
    throw new RangeError(
      "Cannot project a Classic career before retirement",
    );
  }

  return {
    awards: state.summary.awards,
    badge: state.summary.badge,
    choiceCount: state.choiceLog.length,
    clubIds: state.summary.clubs.map((club) => club.teamId),
    contentVersion: state.contentVersion,
    developmentProfile: state.developmentProfile,
    ending: state.summary.ending,
    eventKeys: state.eventPlan.completedEventKeys,
    finalAge: state.playerAge,
    finalMarketValue: state.marketValue,
    finalOverall: state.overall,
    hiddenTitles: state.summary.hiddenTitles,
    maxMarketValue: state.summary.maxMarketValue,
    maxOverall: state.summary.maxOverall,
    mode: state.mode,
    nationalStats: state.summary.nationalStats,
    nationalTrophies: state.summary.nationalTrophies,
    rngState: state.rngState,
    seasonCount: state.seasons.length,
    seed: state.seed,
    suspendedSeasonCount: state.seasons.filter(
      (season) => season.suspended,
    ).length,
    totals: state.summary.totals,
  };
}

function createChoiceTransition(input: {
  readonly career: ClassicCareerState;
  readonly decision: ClassicDecision;
  readonly effects: ClassicDecisionEffectFacts | null;
  readonly option: ClassicDecisionOption;
  readonly outcomeKind: CareerEventOutcomeKind | null;
}): ClassicChoiceTransition {
  const result: ClassicDecisionResult = Object.freeze({
    decision: input.decision,
    effects: input.effects,
    eventKey: input.decision.event?.eventKey ?? null,
    option: input.option,
    outcomeKind: input.outcomeKind,
  });

  return Object.freeze({
    career: input.career,
    result,
  });
}

function createDecisionEffectFacts(
  modifiers: CareerEventModifiers,
  mode: PacingMode,
): ClassicDecisionEffectFacts {
  return Object.freeze({
    clubTrophyOverride:
      modifiers.clubTrophyOverride === undefined
        ? null
        : Object.freeze({ ...modifiers.clubTrophyOverride }),
    clubWorldCupTrophyProbabilityMultiplier:
      modifiers.clubWorldCupTrophyProbabilityMultiplier,
    continentalPrimaryTrophyProbabilityMultiplier:
      modifiers.continentalPrimaryTrophyProbabilityMultiplier,
    continentalSecondaryTrophyProbabilityMultiplier:
      modifiers.continentalSecondaryTrophyProbabilityMultiplier,
    deferredOverallDelta: modifiers.deferredOverallDelta,
    domesticCupTrophyProbabilityMultiplier:
      modifiers.domesticCupTrophyProbabilityMultiplier,
    immediateOverallDelta: modifiers.immediateOverallDelta,
    leagueTrophyProbabilityMultiplier:
      modifiers.leagueTrophyProbabilityMultiplier,
    nationalTournament:
      modifiers.nationalTournament ?? null,
    nationalTournamentParticipation:
      modifiers.nationalTournamentParticipation ?? null,
    nationalTrophyOverride:
      modifiers.nationalTrophyOverride === undefined
        ? null
        : Object.freeze({ ...modifiers.nationalTrophyOverride }),
    permanentOverallDelta: modifiers.permanentOverallDelta,
    roleOverride: modifiers.roleOverride ?? null,
    roleShift: modifiers.roleShift,
    statsMultiplier: modifiers.statsMultiplier,
    suspensionSeasons: suspensionSeasonsForEvent(
      modifiers,
      mode,
    ),
  });
}

function resolveChoiceEffects(
  state: ClassicCareerState,
  choice: ResolvedChoice,
): PeriodChoiceEffects {
  const decision = state.currentDecision!;
  let nextState: ClassicCareerState = {
    ...state,
    completedLoan:
      decision.type === "post_loan_not_retained" ||
      decision.type === "post_loan_retained"
        ? null
        : state.completedLoan,
    currentDecision: null,
    step: state.step + 1,
  };
  let modifiers: CareerEventModifiers = {
    ...DEFAULT_CAREER_EVENT_MODIFIERS,
  };
  let eventOutcomeKind: CareerEventOutcomeKind | null = null;

  if (choice.option.clubId !== undefined) {
    const clubId = choice.option.clubId;

    if (decision.type === "loan_offer") {
      const parentClubId = requireClubId(state.contractClubId);
      nextState = {
        ...nextState,
        activeLoan: {
          loanClubId: clubId,
          parentClubId,
        },
        currentClubId: clubId,
      };
    } else if (
      decision.type === "post_loan_not_retained" &&
      choice.option.id.startsWith("loan:")
    ) {
      const parentClubId =
        state.completedLoan?.parentClubId ??
        requireClubId(state.contractClubId);
      nextState = {
        ...nextState,
        activeLoan: {
          loanClubId: clubId,
          parentClubId,
        },
        contractClubId: parentClubId,
        currentClubId: clubId,
      };
    } else {
      nextState = {
        ...nextState,
        activeLoan: null,
        contractClubId: clubId,
        currentClubId: clubId,
      };
    }
  } else if (
    decision.type === "post_loan_retained" &&
    choice.option.kind === "stay"
  ) {
    const parentClubId =
      state.completedLoan?.parentClubId ??
      requireClubId(state.contractClubId);
    nextState = {
      ...nextState,
      activeLoan: null,
      contractClubId: parentClubId,
      currentClubId: parentClubId,
    };
  }

  if (decision.type === "career_event") {
    const event = decision.event!;
    const plan = completeCareerEventPlan(
      state.eventPlan,
      event.eventKey,
      event.scheduledSlotAge,
      state.playerAge,
    );
    nextState = {
      ...nextState,
      eventPlan: plan,
    };

    if (
      choice.option.kind === "join_club" &&
      event.eventKey !== "triumphant_return"
    ) {
      modifiers = {
        ...DEFAULT_CAREER_EVENT_MODIFIERS,
      };
    } else {
      const applied = applyCareerEventChoice({
        eventKey: event.eventKey,
        forcedOutcome: choice.forcedOutcome,
        injuryType: event.injuryType,
        optionKey: choice.option.optionKey,
        optionType:
          choice.option.kind === "join_club"
            ? "join_club"
            : "career_choice",
        rngState: nextState.rngState,
        targetClubTrophy: event.targetClubTrophy,
        targetTrophy: event.targetTrophy,
        variantKey: event.variantKey,
      });
      modifiers = applied.modifiers;
      eventOutcomeKind = applied.outcomeKind ?? null;
      nextState = {
        ...nextState,
        rngState: applied.rngState,
      };
    }

    if (
      event.eventKey === "foreign_grandfather" &&
      choice.option.optionKey === "switch_national_team"
    ) {
      const alternative = alternativeNationalities(nextState)[0];

      if (alternative !== undefined) {
        nextState = switchNationality(nextState, alternative);
      }
    }
  }

  const suspension = suspensionSeasonsForEvent(
    modifiers,
    state.mode,
  );
  const overall = applyImmediateCareerEventEffects(
    nextState.overall,
    modifiers,
  );

  return {
    eventOutcomeKind,
    modifiers,
    nextState: {
      ...nextState,
      overall,
      permanentOverallDelta:
        nextState.permanentOverallDelta +
        modifiers.permanentOverallDelta,
      suspensionSeasonsRemaining: Math.max(
        nextState.suspensionSeasonsRemaining,
        suspension,
      ),
    },
  };
}

function simulateClassicPeriod(
  initialState: ClassicCareerState,
  modifiers: CareerEventModifiers,
): ClassicCareerState {
  const clubId = requireClubId(initialState.currentClubId);
  const club = requireClub(clubId);
  const country = requireCountry(initialState.nationalityFifaCode);
  const periodIndex =
    (initialState.seasons.at(-1)?.periodIndex ?? -1) + 1;
  const roleGroup = roleGroupForPosition(
    initialState.identity.position,
  );
  const periodLength =
    PACING_CONFIGS[initialState.mode].periodLengthSeasons;
  let rngState = initialState.rngState;
  let age = initialState.playerAge;
  let overall = initialState.overall;
  let marketValue = initialState.marketValue;
  let developmentCycle = initialState.developmentCycle;
  let suspensionRemaining =
    initialState.suspensionSeasonsRemaining;
  let tierOverrides = { ...initialState.tierOverrides };
  let previousSeason =
    initialState.seasons.length === 0
      ? null
      : initialState.seasons[initialState.seasons.length - 1]!;
  const seasons: ClassicCareerSeason[] = [];
  const nationalPeriodSeasons: Array<{
    age: number;
    overall: number;
    suspended: boolean;
  }> = [];

  for (let offset = 0; offset < periodLength; offset += 1) {
    const suspended = suspensionRemaining > 0;
    const valueBefore = simulateMarketValue({
      age,
      overall,
      rngState,
    });
    rngState = valueBefore.rngState;
    marketValue = valueBefore.value;
    const roleSeason = simulateRoleSeason({
      clubContinentalReputation: club.continentalReputation,
      clubDomesticReputation: club.domesticReputation,
      clubInternationalReputation: club.internationalReputation,
      overall,
      rngState,
      roleGroup,
      roleShift: modifiers.roleShift,
      statsMultiplier: modifiers.statsMultiplier,
      suspended,
      ...(modifiers.roleOverride === undefined
        ? {}
        : { roleOverride: modifiers.roleOverride }),
    });
    rngState = roleSeason.rngState;
    const context = createCatalogClubTrophyContext(
      CLASSIC_CATALOG,
      clubId,
      tierOverrides[clubId],
    );
    const clubTrophies = simulateClubTrophies({
      age,
      club,
      context,
      modifiers,
      overall,
      previousSeason:
        previousSeason === null
          ? null
          : {
              teamId: previousSeason.teamId,
              trophies: previousSeason.trophies.filter(
                isClubTrophy,
              ),
            },
      rngState,
    });
    rngState = clubTrophies.rngState;
    const national = resolveNationalTournamentSeason({
      age,
      continentalReputation: country.continentalReputation,
      fifaReputation: country.fifaReputation,
      internationalReputation:
        country.internationalReputation,
      overall,
      planned: initialState.upcomingNationalTournaments,
      rngState,
      suspended,
      ...(modifiers.nationalTournament === undefined
        ? {}
        : {
            nationalTournament: modifiers.nationalTournament,
          }),
      ...(modifiers.nationalTournamentParticipation ===
      undefined
        ? {}
        : {
            nationalTournamentParticipation:
              modifiers.nationalTournamentParticipation,
          }),
      ...(modifiers.nationalTrophyOverride === undefined
        ? {}
        : {
            nationalTrophyOverride:
              modifiers.nationalTrophyOverride,
          }),
    });
    rngState = national.rngState;
    let trophies = suspended
      ? []
      : [...clubTrophies.trophies, ...national.trophies];
    const awards = simulatePersonalAwards({
      clubTrophies: trophies.filter(isClubTrophy),
      goldenBootEligible: context.tier === 1,
      goals: roleSeason.stats.goals,
      overall,
      rngState,
      roleGroup,
    });
    rngState = awards.rngState;
    const relegationDraw =
      context.tier === 1 && context.hasLowerTier
        ? classicChance(rngState, 1)
        : null;

    if (relegationDraw !== null) {
      rngState = relegationDraw.state;
    }

    const tierChange = resolveTierChange({
      clubDomesticReputation: club.domesticReputation,
      currentTier: context.tier,
      hasLowerTier: context.hasLowerTier,
      hasTopTier: context.hasTopTier,
      overall,
      relegationRoll:
        relegationDraw === null
          ? 1
          : randomValueFromState(relegationDraw.state),
      suspended,
      wonLeague: trophies.includes("league"),
    });

    if (tierChange.tierOverride !== null) {
      tierOverrides[clubId] = tierChange.tierOverride;
    }
    if (tierChange.relegated) {
      trophies = trophies.filter((trophy) => !isClubTrophy(trophy));
    }

    const season: ClassicCareerSeason = Object.freeze({
      age,
      awards: suspended ? [] : awards.awards,
      competitionTier: context.tier,
      id: `${initialState.seed}-season-${initialState.seasons.length + seasons.length}`,
      index: initialState.seasons.length + seasons.length,
      marketValue,
      nationalTournamentRecords: national.records,
      overall,
      periodIndex,
      relegated: tierChange.relegated,
      role: roleSeason.role,
      stats: suspended ? EMPTY_STATS : roleSeason.stats,
      suspended,
      teamId: clubId,
      trophies: Object.freeze(trophies),
    });
    seasons.push(season);
    nationalPeriodSeasons.push({
      age,
      overall,
      suspended,
    });
    previousSeason = season;
    age += 1;
    const development = applyAnnualDevelopment({
      age: age - 1,
      blockPositiveGrowth: suspended,
      cycle: developmentCycle,
      developmentProfile: initialState.developmentProfile,
      overall,
      rngState,
      role: roleSeason.role,
      roleGroup,
    });
    developmentCycle = development.cycle;
    overall = development.overall;
    rngState = development.rngState;
    const valueAfter = simulateMarketValue({
      age,
      overall,
      rngState,
    });
    marketValue = valueAfter.value;
    rngState = valueAfter.rngState;
    suspensionRemaining = Math.max(0, suspensionRemaining - 1);
  }

  const nationalPeriod = simulateNationalTeamPeriod({
    careerId: initialState.seed,
    internationalReputation: country.internationalReputation,
    nationalityFifaCode: country.fifaCode,
    periodIndex,
    roleGroup,
    seasons: nationalPeriodSeasons,
    statsMultiplier: modifiers.statsMultiplier,
    tournaments: initialState.upcomingNationalTournaments,
  });
  overall = applyDeferredCareerEventRecovery(
    overall,
    modifiers,
  );
  const completedLoan =
    initialState.activeLoan === null
      ? initialState.completedLoan
      : {
          loanClubId: initialState.activeLoan.loanClubId,
          parentClubId: initialState.activeLoan.parentClubId,
        };
  const currentClubId =
    initialState.activeLoan === null
      ? initialState.currentClubId
      : initialState.activeLoan.parentClubId;
  const nextTournaments = planNationalTournaments({
    age,
    continentalReputation: country.continentalReputation,
    rngState,
    seasons: periodLength,
  });
  rngState = nextTournaments.rngState;
  let nextState: ClassicCareerState = {
    ...initialState,
    activeLoan: null,
    completedLoan,
    currentClubId,
    developmentCycle,
    marketValue,
    nationalTeamPeriods:
      nationalPeriod === null
        ? initialState.nationalTeamPeriods
        : [...initialState.nationalTeamPeriods, nationalPeriod],
    overall,
    playerAge: age,
    rngState,
    seasons: [...initialState.seasons, ...seasons],
    suspensionSeasonsRemaining: suspensionRemaining,
    tierOverrides,
    upcomingNationalTournaments: nextTournaments.tournaments,
  };

  if (
    age >= 26 &&
    overall < careerRetirementMinimum(age)
  ) {
    return {
      ...nextState,
      currentDecision: createRetirementDecision(
        age,
        nextState.step,
      ),
    };
  }

  const nextDecision = createNextDecision(nextState);

  return {
    ...nextState,
    currentDecision: nextDecision.decision,
    rngState: nextDecision.rngState,
  };
}

function createNextDecision(
  state: ClassicCareerState,
): DecisionResult {
  if (state.suspensionSeasonsRemaining > 0) {
    return createTransferDecision(state);
  }
  if (state.completedLoan !== null) {
    return createPostLoanDecision(state);
  }

  const streaks = lowRoleStreaks(state);

  if (
    shouldTriggerContractNonRenewal({
      age: state.playerAge,
      lowRoleStreak: streaks.lowRotation,
      mode: state.mode,
      substituteStreak: streaks.substitute,
    })
  ) {
    return createContractNonRenewalDecision(state);
  }

  const event = createCareerEventDecision(state);

  if (event !== null) {
    return event;
  }

  const currentClub = requireClub(
    requireClubId(state.currentClubId),
  );
  const role = resolveClassicSquadRole({
    clubInternationalReputation:
      currentClub.internationalReputation,
    overall: state.overall,
    roleGroup: roleGroupForPosition(state.identity.position),
  });
  const loanProbability = loanOfferProbability({
    activeLoan: false,
    age: state.playerAge,
    completedLoan: false,
    hasEnoughSuitableClubs: true,
    predictedRole: role,
  });

  if (loanProbability > 0) {
    const draw = classicChance(state.rngState, loanProbability);
    const withDraw = {
      ...state,
      rngState: draw.state,
    };

    if (draw.success) {
      const loan = createLoanDecision(withDraw);

      if (loan !== null) {
        return loan;
      }
    }

    return createTransferDecision(withDraw);
  }

  return createTransferDecision(state);
}

function createTransferDecision(
  state: ClassicCareerState,
): DecisionResult {
  const result = generateTransferOffers({
    candidates: TRANSFER_CANDIDATES,
    count: 2,
    player: transferPlayer(state),
    rngState: state.rngState,
  });

  return {
    decision: createClubDecision(
      "transfer",
      state.playerAge,
      state.step,
      result.offers,
      true,
    ),
    rngState: result.rngState,
  };
}

function createLoanDecision(
  state: ClassicCareerState,
): {
  readonly decision: ClassicDecision;
  readonly rngState: number;
} | null {
  const result = generateLoanOffers({
    candidates: TRANSFER_CANDIDATES,
    currentClubId: requireClubId(state.contractClubId),
    nationalityConfederation:
      requireCountry(state.nationalityFifaCode).confederation,
    nationalityFifaCode: state.nationalityFifaCode,
    overall: state.overall,
    rngState: state.rngState,
    roleGroup: roleGroupForPosition(state.identity.position),
  });

  if (result === null) {
    return null;
  }

  return {
    decision: createClubDecision(
      "loan_offer",
      state.playerAge,
      state.step,
      result.offers,
      true,
      "loan",
    ),
    rngState: result.rngState,
  };
}

function createPostLoanDecision(
  state: ClassicCareerState,
): DecisionResult {
  const loan = state.completedLoan!;
  const parent = requireClub(loan.parentClubId);
  const role = resolveClassicSquadRole({
    clubInternationalReputation: parent.internationalReputation,
    overall: state.overall,
    roleGroup: roleGroupForPosition(state.identity.position),
  });
  const retained = resolveLoanReturn(role) === "retained";

  if (retained) {
    return {
      decision: {
        age: state.playerAge,
        id: decisionId(
          state.step,
          "post_loan_retained",
          state.playerAge,
        ),
        options: Object.freeze([
          {
            id: "return_parent",
            kind: "stay",
            label: "Return to parent club",
          },
          {
            clubId: loan.loanClubId,
            id: `join:${loan.loanClubId}`,
            kind: "join_club",
            label: `Join ${loan.loanClubId}`,
          },
        ]),
        type: "post_loan_retained",
      },
      rngState: state.rngState,
    };
  }

  const generated = generateLoanOffers({
    candidates: TRANSFER_CANDIDATES.filter(
      (candidate) => candidate.id !== loan.loanClubId,
    ),
    count: 2,
    currentClubId: loan.parentClubId,
    nationalityConfederation:
      requireCountry(state.nationalityFifaCode).confederation,
    nationalityFifaCode: state.nationalityFifaCode,
    overall: state.overall,
    rngState: state.rngState,
    roleGroup: roleGroupForPosition(state.identity.position),
  });
  const offers = generated?.offers ?? [];

  return {
    decision: {
      age: state.playerAge,
      id: decisionId(
        state.step,
        "post_loan_not_retained",
        state.playerAge,
      ),
      options: Object.freeze([
        ...offers.map((club) => ({
          clubId: club.id,
          id: `loan:${club.id}`,
          kind: "join_club" as const,
          label: `Loan to ${club.id}`,
        })),
        {
          clubId: loan.loanClubId,
          id: `join:${loan.loanClubId}`,
          kind: "join_club" as const,
          label: `Join ${loan.loanClubId}`,
        },
      ]),
      type: "post_loan_not_retained",
    },
    rngState: generated?.rngState ?? state.rngState,
  };
}

function createContractNonRenewalDecision(
  state: ClassicCareerState,
): DecisionResult {
  const result = generateFreeAgentOffers({
    ...transferPlayer(state),
    candidates: TRANSFER_CANDIDATES,
    rngState: state.rngState,
  });
  if (result.offers.length === 0) {
    return {
      decision: createRetirementDecision(
        state.playerAge,
        state.step,
      ),
      rngState: result.rngState,
    };
  }

  return {
    decision: createClubDecision(
      "contract_nonrenewal",
      state.playerAge,
      state.step,
      result.offers,
      false,
      "join",
      result.allowRetire,
    ),
    rngState: result.rngState,
  };
}

function createCareerEventDecision(
  state: ClassicCareerState,
): DecisionResult | null {
  const scheduledSlotAge = nextCareerEventSlot(
    state.eventPlan,
    state.playerAge,
  );

  if (scheduledSlotAge === null) {
    return null;
  }

  const currentClubId = requireClubId(state.currentClubId);
  const currentClub = requireClub(currentClubId);
  const transferPreview = generateTransferOffers({
    candidates: TRANSFER_CANDIDATES,
    count: 1,
    player: transferPlayer(state),
    rngState: state.rngState,
  });
  const rivals = TRANSFER_CANDIDATES.filter(
    (club) =>
      club.id !== currentClubId &&
      club.countryFifaCode === currentClub.countryFifaCode &&
      club.domesticReputation >= currentClub.domesticReputation &&
      club.internationalReputation >=
        currentClub.internationalReputation,
  );
  const homeClubs =
    currentClub.countryFifaCode === state.nationalityFifaCode
      ? []
      : TRANSFER_CANDIDATES.filter(
          (club) =>
            club.countryFifaCode === state.nationalityFifaCode,
        );
  const foreignClubs = TRANSFER_CANDIDATES.filter(
    (club) =>
      club.countryFifaCode !== currentClub.countryFifaCode,
  );
  const firstClubId = state.seasons[0]?.teamId ?? null;
  const triumphantReturnTeamId =
    state.playerAge >= 32 &&
    firstClubId !== null &&
    firstClubId !== currentClubId &&
    isAcceptableRole(state, firstClubId)
      ? firstClubId
      : null;
  const hasQualifiedTournament =
    state.upcomingNationalTournaments.some(
      (tournament) => tournament.selectionQualified,
    );
  const targetTrophy = previewTargetTrophy(
    state,
    currentClub,
    hasQualifiedTournament,
  );
  const selected = selectCareerEvent({
    context: {
      age: state.playerAge,
      alternativeNationalityFifaCodes:
        alternativeNationalities(state).map(
          (country) => country.fifaCode,
        ),
      canTransfer: transferPreview.offers.length > 0,
      decisivePenaltyTargetTrophy: targetTrophy,
      foreignTeamIds: foreignClubs.map((club) => club.id),
      hasQualifiedTournament,
      homeCountryTeamIds: homeClubs.map((club) => club.id),
      nationalityInternationalReputation:
        requireCountry(state.nationalityFifaCode)
          .internationalReputation,
      overall: state.overall,
      peakInjuryTargetTrophy:
        targetTrophy !== null && isClubTrophy(targetTrophy)
          ? targetTrophy
          : null,
      position: state.identity.position,
      rivalTeamIds: rivals.map((club) => club.id),
      role: resolveClassicSquadRole({
        clubInternationalReputation:
          currentClub.internationalReputation,
        overall: state.overall,
        roleGroup: roleGroupForPosition(
          state.identity.position,
        ),
      }),
      team: currentClub,
      triumphantReturnTeamId,
    },
    mode: state.mode,
    plan: state.eventPlan,
    rngState: state.rngState,
    seed: state.seed,
    step: state.step,
  });

  if (selected === null) {
    return null;
  }

  return {
    decision: materializeEventDecision({
      foreignClubs,
      homeClubs,
      rivals,
      scheduledSlotAge,
      selection: selected.event,
      state,
      targetTrophy,
      transferPreview: transferPreview.offers[0],
      triumphantReturnTeamId,
    }),
    rngState: selected.rngState,
  };
}

function materializeEventDecision(input: {
  readonly foreignClubs: readonly TransferCandidate[];
  readonly homeClubs: readonly TransferCandidate[];
  readonly rivals: readonly TransferCandidate[];
  readonly scheduledSlotAge: number;
  readonly selection: CareerEventSelection;
  readonly state: ClassicCareerState;
  readonly targetTrophy: CareerTrophy | null;
  readonly transferPreview: TransferCandidate | undefined;
  readonly triumphantReturnTeamId: string | null;
}): ClassicDecision {
  const event = input.selection;
  const options: ClassicDecisionOption[] = event.optionKeys.map(
    (optionKey) => ({
      id: `event:${event.eventKey}:${optionKey}`,
      kind: "career_choice",
      label: optionKey,
      optionKey,
    }),
  );
  const targetClubTrophy =
    input.targetTrophy !== null &&
    isClubTrophy(input.targetTrophy)
      ? input.targetTrophy
      : undefined;
  let targetTrophy = input.targetTrophy ?? undefined;

  if (event.eventKey === "rival_offer" && input.rivals.length > 0) {
    const target = pickDerivedClub(
      input.state,
      "rival",
      input.rivals,
    );
    replaceEventOptionClub(options, "accept", target.id);
  } else if (
    event.eventKey === "triumphant_return" &&
    input.triumphantReturnTeamId !== null
  ) {
    options.push(
      {
        clubId: input.triumphantReturnTeamId,
        id: `join:${input.triumphantReturnTeamId}`,
        kind: "join_club",
        label: `Join ${input.triumphantReturnTeamId}`,
      },
      {
        id: "stay",
        kind: "stay",
        label: "Stay",
      },
    );
  } else if (
    event.eventKey === "club_national_team_conflict"
  ) {
    targetTrophy =
      input.state.upcomingNationalTournaments.find(
        (tournament) => tournament.selectionQualified,
      )?.trophy;
  } else if (event.eventKey === "return_home") {
    appendDerivedClubOption(
      options,
      input.state,
      "home",
      input.homeClubs,
    );
  } else if (event.eventKey === "tax_trouble") {
    appendDerivedClubOption(
      options,
      input.state,
      "foreign",
      input.foreignClubs,
    );
  } else if (input.transferPreview !== undefined) {
    options.push({
      clubId: input.transferPreview.id,
      id: `join:${input.transferPreview.id}`,
      kind: "join_club",
      label: `Join ${input.transferPreview.id}`,
    });
  }

  if (event.retireAvailable) {
    options.push({
      id: "retire",
      kind: "retire",
      label: "Retire",
    });
  }

  if (options.length === 0) {
    options.push({
      id: "stay",
      kind: "stay",
      label: "Stay",
    });
  }

  return {
    age: input.state.playerAge,
    event: {
      eventKey: event.eventKey,
      scheduledSlotAge: input.scheduledSlotAge,
      ...(event.injuryType === undefined
        ? {}
        : { injuryType: event.injuryType }),
      ...(targetClubTrophy === undefined
        ? {}
        : { targetClubTrophy }),
      ...(targetTrophy === undefined
        ? {}
        : { targetTrophy }),
      ...(event.variantKey === undefined
        ? {}
        : { variantKey: event.variantKey }),
    },
    id: decisionId(
      input.state.step,
      "career_event",
      input.state.playerAge,
    ),
    options: Object.freeze(options),
    type: "career_event",
  };
}

function createClubDecision(
  type: ClassicDecisionType,
  age: number,
  step: number,
  clubs: readonly {
    readonly id: string;
  }[],
  includeStay: boolean,
  idPrefix = "join",
  includeRetire = false,
): ClassicDecision {
  const options: ClassicDecisionOption[] = clubs.map((club) => ({
    clubId: club.id,
    id: `${idPrefix}:${club.id}`,
    kind: "join_club",
    label: `Join ${club.id}`,
  }));

  if (includeStay) {
    options.push({
      id: "stay",
      kind: "stay",
      label: "Stay",
    });
  }
  if (includeRetire) {
    options.push({
      id: "retire",
      kind: "retire",
      label: "Retire",
    });
  }
  if (options.length === 0) {
    options.push({
      id: "retire",
      kind: "retire",
      label: "Retire",
    });
  }

  return {
    age,
    id: decisionId(step, type, age),
    options: Object.freeze(options),
    type,
  };
}

function createRetirementDecision(
  age: number,
  step: number,
): ClassicDecision {
  return {
    age,
    id: decisionId(step, "no_offers_retirement", age),
    options: Object.freeze([
      {
        id: "retire",
        kind: "retire",
        label: "Retire",
      },
    ]),
    type: "no_offers_retirement",
  };
}

function finishClassicCareer(
  state: ClassicCareerState,
  retirementReason: RetirementReason,
): ClassicCareerState {
  const country = requireCountry(state.nationalityFifaCode);
  const totals = calculateCareerTotals(
    state.seasons,
    state.nationalTeamPeriods,
  );
  const input = {
    nationalTeamPeriods: state.nationalTeamPeriods,
    player: {
      age: state.playerAge,
      developmentProfile: state.developmentProfile,
      marketValue: state.marketValue,
      nationalityFifaReputation: country.fifaReputation,
      nationalityIsoAlpha2: country.isoAlpha2,
      overall: state.overall,
      position: state.identity.position,
      preferredNumber: state.identity.preferredNumber,
    },
    retirementReason,
    seasons: state.seasons,
    totals,
  } as const;
  const errors = validateCareerTotals(input);

  if (errors.length > 0) {
    throw new Error(
      `Classic career totals are invalid: ${errors.join("; ")}`,
    );
  }

  return {
    ...state,
    currentDecision: null,
    phase: "summary",
    retirementReason,
    summary: aggregateCareerSummary(input),
  };
}

function academyOffers(
  country: Country,
  initialRngState: number,
): {
  readonly offers: readonly TransferCandidate[];
  readonly rngState: number;
} {
  const sameCountry = TRANSFER_CANDIDATES.filter(
    (club) => club.countryFifaCode === country.fifaCode,
  );
  const sameConfederation = TRANSFER_CANDIDATES.filter(
    (club) => club.confederation === country.confederation,
  );
  const uefa = TRANSFER_CANDIDATES.filter(
    (club) => club.confederation === "UEFA",
  );
  const pool =
    sameCountry.length >= 3
      ? sameCountry
      : sameConfederation.length >= 3
        ? sameConfederation
        : uefa.length >= 3
          ? uefa
          : TRANSFER_CANDIDATES;
  const offers: TransferCandidate[] = [];
  let rngState = initialRngState;

  while (offers.length < 3) {
    const available = pool.filter(
      (club) =>
        !offers.some((offer) => offer.id === club.id),
    );
    const selected = classicPick(rngState, available);
    offers.push(selected.item);
    rngState = selected.state;
  }

  return {
    offers: Object.freeze(offers),
    rngState,
  };
}

function transferPlayer(state: ClassicCareerState): TransferPlayer {
  const country = requireCountry(state.nationalityFifaCode);

  return {
    age: state.playerAge,
    currentClubId: requireClubId(
      state.contractClubId ?? state.currentClubId,
    ),
    nationalityConfederation: country.confederation,
    nationalityFifaCode: country.fifaCode,
    overall: state.overall,
  };
}

function lowRoleStreaks(state: ClassicCareerState): {
  readonly lowRotation: number;
  readonly substitute: number;
} {
  const contractClubId = state.contractClubId;
  const periods = new Map<number, ClassicCareerSeason[]>();

  for (const season of state.seasons) {
    const records = periods.get(season.periodIndex) ?? [];
    records.push(season);
    periods.set(season.periodIndex, records);
  }

  const roles = [...periods.values()]
    .filter(
      (seasons) =>
        seasons.some(
          (season) => season.teamId === contractClubId,
        ) && seasons.every((season) => !season.suspended),
    )
    .map((seasons) => seasons[seasons.length - 1]!.role)
    .reverse();
  let lowRotation = 0;
  let substitute = 0;

  for (const role of roles) {
    if (role === "low_rotation" && substitute === 0) {
      lowRotation += 1;
      continue;
    }
    if (
      (role === "substitute" || role === "third_keeper") &&
      lowRotation === 0
    ) {
      substitute += 1;
      continue;
    }
    break;
  }

  return { lowRotation, substitute };
}

function switchNationality(
  state: ClassicCareerState,
  country: Country,
): ClassicCareerState {
  const periodLength =
    PACING_CONFIGS[state.mode].periodLengthSeasons;
  const planned = planNationalTournaments({
    age: state.playerAge,
    continentalReputation: country.continentalReputation,
    rngState: state.rngState,
    seasons: periodLength,
  });

  return {
    ...state,
    nationalityFifaCode: country.fifaCode,
    rngState: planned.rngState,
    seasons: state.seasons.map((season) => ({
      ...season,
      trophies: season.trophies.filter(
        (trophy) =>
          trophy !== "national_continental" &&
          trophy !== "world_cup",
      ),
    })),
    upcomingNationalTournaments: planned.tournaments,
  };
}

function alternativeNationalities(
  state: ClassicCareerState,
): Country[] {
  const current = requireCountry(state.nationalityFifaCode);

  return CLASSIC_CATALOG.countries.filter(
    (country) =>
      country.fifaCode !== current.fifaCode &&
      country.confederation === current.confederation,
  );
}

function previewTargetTrophy(
  state: ClassicCareerState,
  club: Club,
  hasQualifiedTournament: boolean,
): CareerTrophy | null {
  const candidates: CareerTrophy[] = [];

  if (club.continentalReputation >= 2) {
    candidates.push("continental_primary");
  }
  if (club.domesticReputation >= 2) {
    candidates.push("league");
  }
  if (hasQualifiedTournament) {
    candidates.push(
      state.upcomingNationalTournaments.find(
        (tournament) => tournament.selectionQualified,
      )!.trophy,
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return classicPick(
    deriveClassicRngState(
      state.seed,
      "target-trophy",
      state.rngState,
      club.id,
      state.playerAge,
    ),
    candidates,
  ).item;
}

function appendDerivedClubOption(
  options: ClassicDecisionOption[],
  state: ClassicCareerState,
  label: string,
  clubs: readonly TransferCandidate[],
): void {
  if (clubs.length === 0) {
    return;
  }

  const target = pickDerivedClub(state, label, clubs);
  options.push({
    clubId: target.id,
    id: `join:${target.id}`,
    kind: "join_club",
    label: `Join ${target.id}`,
  });
}

function pickDerivedClub(
  state: ClassicCareerState,
  label: string,
  clubs: readonly TransferCandidate[],
): TransferCandidate {
  return classicPick(
    deriveClassicRngState(
      state.seed,
      "event-club",
      state.step,
      label,
    ),
    clubs,
  ).item;
}

function replaceEventOptionClub(
  options: ClassicDecisionOption[],
  optionKey: string,
  clubId: string,
): void {
  const index = options.findIndex(
    (option) => option.optionKey === optionKey,
  );

  if (index >= 0) {
    options[index] = {
      ...options[index]!,
      clubId,
    };
  }
}

function isAcceptableRole(
  state: ClassicCareerState,
  clubId: string,
): boolean {
  const club = requireClub(clubId);
  const role = resolveClassicSquadRole({
    clubInternationalReputation:
      club.internationalReputation,
    overall: state.overall,
    roleGroup: roleGroupForPosition(state.identity.position),
  });

  return role === "starter" || role === "high_rotation";
}

function countryForIdentity(identity: ClassicIdentity): Country {
  const country = CLASSIC_CATALOG.countryByFifaCode.get(
    identity.nationalityFifaCode,
  );

  if (country === undefined) {
    throw new RangeError(
      `Unknown Classic nationality: ${identity.nationalityFifaCode}`,
    );
  }

  return country;
}

function requireCountry(fifaCode: string): Country {
  const country =
    CLASSIC_CATALOG.countryByFifaCode.get(fifaCode);

  if (country === undefined) {
    throw new RangeError(`Unknown Classic country: ${fifaCode}`);
  }

  return country;
}

function requireClub(clubId: string): Club {
  const club = CLASSIC_CATALOG.clubById.get(clubId);

  if (club === undefined) {
    throw new RangeError(`Unknown Classic club: ${clubId}`);
  }

  return club;
}

function requireClubId(
  clubId: string | null,
): string {
  if (clubId === null) {
    throw new Error("Classic career has no current club");
  }

  return clubId;
}

function decisionId(
  step: number,
  type: ClassicDecisionType,
  age: number,
): string {
  return `decision-${step}-${age}-${type}`;
}

function assertClassicContentVersion(
  contentVersion: string,
): asserts contentVersion is typeof CLASSIC_CONTENT_VERSION {
  if (contentVersion !== CLASSIC_CONTENT_VERSION) {
    throw new RangeError(
      `Unsupported Classic content version: ${contentVersion}`,
    );
  }
}

function isClubTrophy(
  trophy: CareerTrophy,
): trophy is ClubTrophy {
  return (
    trophy === "league" ||
    trophy === "cup" ||
    trophy === "continental_primary" ||
    trophy === "continental_secondary" ||
    trophy === "club_world_cup"
  );
}

function randomValueFromState(state: number): number {
  return state / 0x1_0000_0000;
}
