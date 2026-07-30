import type { PersonalAward } from "./awards";
import {
  applyClassicChoice,
  startClassicCareer,
  type ClassicCareerState,
} from "./classicEngine";
import type {
  CareerEventKey,
  CareerTrophy,
  ForcedCareerEventOutcome,
  InjuryType,
} from "./careerEvents";
import {
  deterministicHash,
  stableStringify,
} from "./deterministicHash";
import type { ClassicSquadRole } from "./role";

type LedgerBase = {
  readonly age: number;
  readonly choiceLogIndex: number;
  readonly decisionId: string;
  readonly id: string;
};

type SeasonLedgerBase = LedgerBase & {
  readonly seasonId: string;
  readonly seasonIndex: number;
};

export type AwardLedgerEntry = SeasonLedgerBase & {
  readonly award: PersonalAward;
  readonly type: "award";
};

export type EventLedgerEntry = LedgerBase & {
  readonly eventKey: CareerEventKey;
  readonly forcedOutcome: ForcedCareerEventOutcome | null;
  readonly immediateOverallDelta: number;
  readonly optionId: string;
  readonly type: "event";
};

export type GrowthLedgerEntry = SeasonLedgerBase & {
  readonly overallAfter: number;
  readonly overallBefore: number;
  readonly overallDelta: number;
  readonly source:
    | "annual_development"
    | "annual_development_and_event_recovery";
  readonly type: "growth";
};

export type InjuryLedgerEntry = LedgerBase & {
  readonly eventKey: "injury" | "injury_at_peak";
  readonly injuryType: InjuryType | "peak_injury";
  readonly overallAfter: number;
  readonly overallBefore: number;
  readonly overallDelta: number;
  readonly source: "career_event";
  readonly type: "injury";
};

export type RoleLedgerEntry = SeasonLedgerBase & {
  readonly changed: boolean;
  readonly previousRole: ClassicSquadRole | null;
  readonly role: ClassicSquadRole;
  readonly type: "role";
};

export type SuspensionLedgerEntry = SeasonLedgerBase & {
  readonly sourceChoiceLogIndex: number;
  readonly sourceDecisionId: string;
  readonly type: "suspension";
};

export type TrophyLedgerEntry = SeasonLedgerBase & {
  readonly trophy: CareerTrophy;
  readonly type: "trophy";
};

export type ValueLedgerEntry = LedgerBase & {
  readonly marketValueAfter: number;
  readonly marketValueBefore: number;
  readonly marketValueDelta: number;
  readonly phase: "season_start" | "season_end";
  readonly seasonId: string;
  readonly seasonIndex: number;
  readonly type: "value";
};

export type CareerLedgerEntry =
  | AwardLedgerEntry
  | EventLedgerEntry
  | GrowthLedgerEntry
  | InjuryLedgerEntry
  | RoleLedgerEntry
  | SuspensionLedgerEntry
  | TrophyLedgerEntry
  | ValueLedgerEntry;

type LedgerEntryDraft<T> = T extends unknown
  ? Omit<T, "id">
  : never;
type CareerLedgerEntryDraft =
  LedgerEntryDraft<CareerLedgerEntry>;

type SuspensionCause = {
  readonly choiceLogIndex: number;
  readonly decisionId: string;
};

export function createCareerLedger(
  career: ClassicCareerState,
): readonly CareerLedgerEntry[] {
  let replayed = startClassicCareer({
    contentVersion: career.contentVersion,
    identity: career.identity,
    mode: career.mode,
    seed: career.seed,
  });
  let suspensionCause: SuspensionCause | null = null;
  const entries: CareerLedgerEntry[] = [];

  const add = (draft: CareerLedgerEntryDraft): void => {
    const id = createLedgerEntryId(entries.length, draft);
    entries.push(
      Object.freeze({
        ...draft,
        id,
      }) as CareerLedgerEntry,
    );
  };

  for (
    let choiceLogIndex = 0;
    choiceLogIndex < career.choiceLog.length;
    choiceLogIndex += 1
  ) {
    const choice = career.choiceLog[choiceLogIndex]!;
    const before = replayed;
    const decision = before.currentDecision;

    if (decision === null) {
      throw new RangeError(
        "Career choice log continues after retirement",
      );
    }

    const selectedOption = decision.options.find(
      (option) => option.id === choice.optionId,
    );
    replayed = applyClassicChoice(before, choice);
    const newSeasons = replayed.seasons.slice(
      before.seasons.length,
    );
    const appliedEvent =
      decision.type === "career_event" &&
      decision.event !== undefined &&
      selectedOption?.kind !== "retire"
        ? decision.event
        : null;
    const firstOverall =
      newSeasons[0]?.overall ?? before.overall;

    if (appliedEvent !== null) {
      add({
        age: before.playerAge,
        choiceLogIndex,
        decisionId: decision.id,
        eventKey: appliedEvent.eventKey,
        forcedOutcome: choice.forcedOutcome ?? null,
        immediateOverallDelta:
          firstOverall - before.overall,
        optionId: choice.optionId,
        type: "event",
      });
    }

    if (
      appliedEvent !== null &&
      (appliedEvent.eventKey === "injury" ||
        appliedEvent.eventKey === "injury_at_peak") &&
      newSeasons.length > 0
    ) {
      add({
        age: before.playerAge,
        choiceLogIndex,
        decisionId: decision.id,
        eventKey: appliedEvent.eventKey,
        injuryType:
          appliedEvent.injuryType ?? "peak_injury",
        overallAfter: firstOverall,
        overallBefore: before.overall,
        overallDelta: firstOverall - before.overall,
        source: "career_event",
        type: "injury",
      });
    }

    if (
      appliedEvent !== null &&
      newSeasons.some((season) => season.suspended)
    ) {
      suspensionCause = {
        choiceLogIndex,
        decisionId: decision.id,
      };
    }

    addSeasonEntries({
      add,
      after: replayed,
      before,
      choiceLogIndex,
      decisionId: decision.id,
      newSeasons,
      suspensionCause,
    });

    if (replayed.suspensionSeasonsRemaining === 0) {
      suspensionCause = null;
    }
  }

  if (stableStringify(replayed) !== stableStringify(career)) {
    throw new RangeError(
      "Career cannot be reproduced for ledger creation",
    );
  }

  return Object.freeze(entries);
}

function addSeasonEntries(input: {
  readonly add: (draft: CareerLedgerEntryDraft) => void;
  readonly after: ClassicCareerState;
  readonly before: ClassicCareerState;
  readonly choiceLogIndex: number;
  readonly decisionId: string;
  readonly newSeasons: ClassicCareerState["seasons"];
  readonly suspensionCause: SuspensionCause | null;
}): void {
  let previousRole =
    input.before.seasons.at(-1)?.role ?? null;
  let previousMarketValue = input.before.marketValue;

  for (
    let index = 0;
    index < input.newSeasons.length;
    index += 1
  ) {
    const season = input.newSeasons[index]!;
    const base = {
      age: season.age,
      choiceLogIndex: input.choiceLogIndex,
      decisionId: input.decisionId,
      seasonId: season.id,
      seasonIndex: season.index,
    };

    input.add({
      ...base,
      changed: previousRole !== season.role,
      previousRole,
      role: season.role,
      type: "role",
    });
    previousRole = season.role;

    if (season.marketValue !== previousMarketValue) {
      input.add({
        ...base,
        marketValueAfter: season.marketValue,
        marketValueBefore: previousMarketValue,
        marketValueDelta:
          season.marketValue - previousMarketValue,
        phase: "season_start",
        type: "value",
      });
    }
    previousMarketValue = season.marketValue;

    if (season.suspended) {
      const source = input.suspensionCause ?? {
        choiceLogIndex: input.choiceLogIndex,
        decisionId: input.decisionId,
      };
      input.add({
        ...base,
        sourceChoiceLogIndex: source.choiceLogIndex,
        sourceDecisionId: source.decisionId,
        type: "suspension",
      });
    }

    for (const trophy of season.trophies) {
      input.add({
        ...base,
        trophy,
        type: "trophy",
      });
    }

    for (const award of season.awards) {
      input.add({
        ...base,
        award,
        type: "award",
      });
    }

    const nextSeason = input.newSeasons[index + 1];
    const overallAfter =
      nextSeason?.overall ?? input.after.overall;
    const overallDelta = overallAfter - season.overall;

    if (overallDelta !== 0) {
      input.add({
        ...base,
        overallAfter,
        overallBefore: season.overall,
        overallDelta,
        source:
          nextSeason === undefined
            ? "annual_development_and_event_recovery"
            : "annual_development",
        type: "growth",
      });
    }
  }

  const lastSeason = input.newSeasons.at(-1);

  if (
    lastSeason !== undefined &&
    input.after.marketValue !== previousMarketValue
  ) {
    input.add({
      age: input.after.playerAge,
      choiceLogIndex: input.choiceLogIndex,
      decisionId: input.decisionId,
      marketValueAfter: input.after.marketValue,
      marketValueBefore: previousMarketValue,
      marketValueDelta:
        input.after.marketValue - previousMarketValue,
      phase: "season_end",
      seasonId: lastSeason.id,
      seasonIndex: lastSeason.index,
      type: "value",
    });
  }
}

function createLedgerEntryId(
  index: number,
  draft: CareerLedgerEntryDraft,
): string {
  const hash = deterministicHash(draft).slice(-12);

  return `ledger-${String(index).padStart(4, "0")}-${hash}`;
}
