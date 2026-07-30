import { getCslClub } from "../domain/catalog/csl";
import { CLASSIC_CATALOG } from "../domain/catalog/classicCatalog";
import {
  PHASE_1_CONTENT_VERSION,
  type CareerDecision,
  type CareerProgress,
  type CareerState,
  type ChoiceLogEntry,
  type PlayerProfile,
  type SeasonRecord,
} from "../domain/model";
import { POSITION_ROLE_GROUPS } from "../domain/role";

export const CAREER_SCHEMA_VERSION = 1 as const;
export const ACTIVE_CAREER_STORAGE_KEY =
  "football-life-reborn:career:v1" as const;
export const CAREER_QUARANTINE_PREFIX =
  "football-life-reborn:career:quarantine:" as const;
const CLASSIC_POSITIONS = new Set<string>(
  Object.values(POSITION_ROLE_GROUPS).flat(),
);

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type CareerLoadResult =
  | { status: "empty" }
  | { state: CareerState; status: "ready" }
  | {
      quarantineKey: string | null;
      raw: string;
      reason: string;
      status: "corrupt";
    }
  | {
      quarantineKey: string | null;
      raw: string;
      reason: string;
      schemaVersion: unknown;
      status: "unsupported";
    }
  | { reason: string; status: "unavailable" };

export type CareerSaveResult =
  | { ok: true }
  | { ok: false; reason: string };

export type CareerRepository = {
  load: () => CareerLoadResult;
  save: (state: CareerState) => CareerSaveResult;
};

type CareerEnvelopeV1 = {
  choiceLog: readonly ChoiceLogEntry[];
  contentVersion: typeof PHASE_1_CONTENT_VERSION;
  rngState: number;
  schemaVersion: typeof CAREER_SCHEMA_VERSION;
  seed: string;
  state: CareerState;
};

export function createCareerRepository(
  storage: StorageLike,
): CareerRepository {
  return {
    load() {
      let raw: string | null;

      try {
        raw = storage.getItem(ACTIVE_CAREER_STORAGE_KEY);
      } catch (error) {
        return {
          reason: readableError(error),
          status: "unavailable",
        };
      }

      if (raw === null) {
        return { status: "empty" };
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch {
        return recoverInvalid(
          storage,
          raw,
          "Stored career is not valid JSON",
        );
      }

      if (!isRecord(parsed)) {
        return recoverInvalid(
          storage,
          raw,
          "Stored career envelope must be an object",
        );
      }

      if (
        typeof parsed.schemaVersion !== "number" ||
        !Number.isInteger(parsed.schemaVersion)
      ) {
        return recoverInvalid(
          storage,
          raw,
          "Stored career has no valid schema version",
        );
      }

      if (parsed.schemaVersion !== CAREER_SCHEMA_VERSION) {
        return {
          quarantineKey: quarantine(storage, raw),
          raw,
          reason: `Unsupported career schema version: ${String(parsed.schemaVersion)}`,
          schemaVersion: parsed.schemaVersion,
          status: "unsupported",
        };
      }

      if (typeof parsed.contentVersion !== "string") {
        return recoverInvalid(
          storage,
          raw,
          "Stored career has no valid content version",
        );
      }

      if (parsed.contentVersion !== PHASE_1_CONTENT_VERSION) {
        return {
          quarantineKey: quarantine(storage, raw),
          raw,
          reason: `Unsupported content version: ${String(parsed.contentVersion)}`,
          schemaVersion: parsed.schemaVersion,
          status: "unsupported",
        };
      }

      if (!isCareerEnvelope(parsed)) {
        return recoverInvalid(
          storage,
          raw,
          "Stored career does not match the Phase 1 schema",
        );
      }

      return {
        state: parsed.state,
        status: "ready",
      };
    },

    save(state) {
      const envelope: CareerEnvelopeV1 = {
        choiceLog: state.choiceLog,
        contentVersion: state.contentVersion,
        rngState: state.rngState,
        schemaVersion: CAREER_SCHEMA_VERSION,
        seed: state.seed,
        state,
      };

      try {
        storage.setItem(
          ACTIVE_CAREER_STORAGE_KEY,
          JSON.stringify(envelope),
        );
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          reason: readableError(error),
        };
      }
    },
  };
}

function recoverInvalid(
  storage: StorageLike,
  raw: string,
  reason: string,
): Extract<CareerLoadResult, { status: "corrupt" }> {
  return {
    quarantineKey: quarantine(storage, raw),
    raw,
    reason,
    status: "corrupt",
  };
}

function quarantine(storage: StorageLike, raw: string): string | null {
  const baseKey = `${CAREER_QUARANTINE_PREFIX}${hashRaw(raw)}`;

  try {
    for (let index = 0; index < 100; index += 1) {
      const key = index === 0 ? baseKey : `${baseKey}-${index}`;
      const existing = storage.getItem(key);

      if (existing === raw) {
        return key;
      }

      if (existing === null) {
        storage.setItem(key, raw);
        return key;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isCareerEnvelope(value: Record<string, unknown>): value is CareerEnvelopeV1 {
  if (
    value.schemaVersion !== CAREER_SCHEMA_VERSION ||
    value.contentVersion !== PHASE_1_CONTENT_VERSION ||
    typeof value.seed !== "string" ||
    !isUint32(value.rngState) ||
    !Array.isArray(value.choiceLog) ||
    !value.choiceLog.every(isChoiceLogEntry) ||
    !isCareerState(value.state)
  ) {
    return false;
  }

  return (
    value.seed === value.state.seed &&
    value.rngState === value.state.rngState &&
    value.contentVersion === value.state.contentVersion &&
    JSON.stringify(value.choiceLog) ===
      JSON.stringify(value.state.choiceLog)
  );
}

function isCareerState(value: unknown): value is CareerState {
  if (!isRecord(value)) {
    return false;
  }

  const phases = new Set([
    "landing",
    "nationality",
    "identity",
    "position",
    "decision",
    "period_result",
    "retired",
  ]);

  if (
    value.contentVersion !== PHASE_1_CONTENT_VERSION ||
    value.mode !== "standard" ||
    typeof value.seed !== "string" ||
    value.seed.length === 0 ||
    value.seed.length > 128 ||
    !isUint32(value.rngState) ||
    typeof value.phase !== "string" ||
    !phases.has(value.phase) ||
    !isPlayerProfile(value.player) ||
    !isCareerProgress(value.career) ||
    !Array.isArray(value.choiceLog) ||
    !value.choiceLog.every(isChoiceLogEntry) ||
    !(
      value.lastChoice === null ||
      isChoiceLogEntry(value.lastChoice)
    ) ||
    !(value.activeDecision === null || isDecision(value.activeDecision))
  ) {
    return false;
  }

  const lastLoggedChoice = value.choiceLog.at(-1) ?? null;

  if (
    JSON.stringify(value.lastChoice) !==
    JSON.stringify(lastLoggedChoice)
  ) {
    return false;
  }

  if (value.phase === "decision") {
    return (
      value.activeDecision !== null &&
      value.activeDecision.age === value.career.age
    );
  }

  return value.activeDecision === null;
}

function isPlayerProfile(value: unknown): value is PlayerProfile {
  return (
    isRecord(value) &&
    (value.foot === "left" || value.foot === "right") &&
    typeof value.name === "string" &&
    value.name.length <= 8 &&
    typeof value.number === "string" &&
    isIntegerBetween(Number(value.number), 1, 99) &&
    (value.nationality === null ||
      (typeof value.nationality === "string" &&
        CLASSIC_CATALOG.countryByFifaCode.has(value.nationality))) &&
    (value.position === null ||
      (typeof value.position === "string" &&
        CLASSIC_POSITIONS.has(value.position)))
  );
}

function isCareerProgress(value: unknown): value is CareerProgress {
  if (
    !isRecord(value) ||
    !isIntegerBetween(value.ability, 40, 99) ||
    !isIntegerBetween(value.age, 16, 120) ||
    !isClubIdOrNull(value.clubId) ||
    !isClubIdOrNull(value.parentClubId) ||
    !(
      value.retirementReason === null ||
      typeof value.retirementReason === "string"
    ) ||
    !isRole(value.role) ||
    !Array.isArray(value.seasons) ||
    !value.seasons.every(isSeasonRecord) ||
    !isTotals(value.totals) ||
    !Array.isArray(value.trophies) ||
    !value.trophies.every((trophy) => typeof trophy === "string") ||
    !isNonNegativeNumber(value.valueEuro)
  ) {
    return false;
  }

  const seasons = value.seasons as SeasonRecord[];
  const latestSeason = seasons.at(-1);
  const totals = value.totals as {
    appearances: number;
    assists: number;
    goals: number;
  };
  const calculatedTotals = {
    appearances: sumSeasons(seasons, "appearances"),
    assists: sumSeasons(seasons, "assists"),
    goals: sumSeasons(seasons, "goals"),
  };
  const calculatedTrophies = seasons.flatMap((season) => season.trophies);

  return (
    value.age === 16 + seasons.length &&
    totals.appearances === calculatedTotals.appearances &&
    totals.assists === calculatedTotals.assists &&
    totals.goals === calculatedTotals.goals &&
    JSON.stringify(value.trophies) ===
      JSON.stringify(calculatedTrophies) &&
    (latestSeason === undefined
      ? value.ability === 50 && value.valueEuro === 100_000
      : value.ability === latestSeason.abilityAfter &&
        value.valueEuro === latestSeason.valueEuroAfter)
  );
}

function isDecision(value: unknown): value is CareerDecision {
  return (
    isRecord(value) &&
    isIntegerBetween(value.age, 16, 120) &&
    typeof value.description === "string" &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isEventType(value.type) &&
    Array.isArray(value.options) &&
    value.options.length > 0 &&
    value.options.every(
      (option) =>
        isRecord(option) &&
        typeof option.id === "string" &&
        typeof option.label === "string",
    )
  );
}

function isChoiceLogEntry(value: unknown): value is ChoiceLogEntry {
  return (
    isRecord(value) &&
    isIntegerBetween(value.age, 16, 120) &&
    typeof value.decisionId === "string" &&
    typeof value.optionId === "string" &&
    isEventType(value.eventType)
  );
}

function isSeasonRecord(value: unknown): value is SeasonRecord {
  return (
    isRecord(value) &&
    isIntegerBetween(value.abilityAfter, 40, 99) &&
    isIntegerBetween(value.abilityBefore, 40, 99) &&
    isIntegerBetween(value.age, 16, 120) &&
    isNonNegativeInteger(value.appearances) &&
    isNonNegativeInteger(value.assists) &&
    typeof value.clubId === "string" &&
    getCslClub(value.clubId) !== undefined &&
    isNonNegativeInteger(value.goals) &&
    isRole(value.role) &&
    Array.isArray(value.trophies) &&
    value.trophies.every((trophy) => typeof trophy === "string") &&
    isNonNegativeNumber(value.valueEuroAfter) &&
    isNonNegativeNumber(value.valueEuroBefore)
  );
}

function isTotals(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.appearances) &&
    isNonNegativeInteger(value.assists) &&
    isNonNegativeInteger(value.goals)
  );
}

function isRole(value: unknown): boolean {
  return (
    value === "free_agent" ||
    value === "reserve" ||
    value === "rotation" ||
    value === "starter" ||
    value === "star"
  );
}

function isEventType(value: unknown): boolean {
  return (
    value === "academy_offer" ||
    value === "transfer" ||
    value === "loan_offer" ||
    value === "post_loan_retained" ||
    value === "post_loan_not_retained" ||
    value === "training_extra" ||
    value === "season_load" ||
    value === "no_offers_retirement"
  );
}

function isClubIdOrNull(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "string" && getCslClub(value) !== undefined)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUint32(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 0 &&
    value <= 0xffff_ffff
  );
}

function isIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function sumSeasons(
  seasons: readonly SeasonRecord[],
  key: "appearances" | "assists" | "goals",
): number {
  return seasons.reduce((total, season) => total + season[key], 0);
}

function hashRaw(raw: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
