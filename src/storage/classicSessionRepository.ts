import {
  replayClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
  type ClassicDecisionType,
  type ClassicIdentity,
} from "../domain/classicEngine";
import {
  CLASSIC_CATALOG,
  CLASSIC_CONTENT_VERSION,
} from "../domain/catalog/classicCatalog";
import { PACING_CONFIGS, type PacingMode } from "../domain/pacing";
import { POSITION_ROLE_GROUPS } from "../domain/role";
import type { StorageLike } from "./careerRepository";

export const CLASSIC_SESSION_SCHEMA_VERSION = 1 as const;
export const ACTIVE_CLASSIC_SESSION_STORAGE_KEY =
  "football-life-reborn:classic-session:v1" as const;
export const CLASSIC_SESSION_QUARANTINE_PREFIX =
  "football-life-reborn:classic-session:quarantine:" as const;

type ClassicSessionEnvelopeV1 = {
  readonly choiceLog: readonly ClassicChoiceLogEntry[];
  readonly contentVersion: typeof CLASSIC_CONTENT_VERSION;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly schemaVersion: typeof CLASSIC_SESSION_SCHEMA_VERSION;
  readonly seed: string;
};

export type ClassicSessionLoadResult =
  | { readonly status: "empty" }
  | {
      readonly state: ClassicCareerState;
      readonly status: "ready";
    }
  | {
      readonly quarantineKey: string | null;
      readonly raw: string;
      readonly reason: string;
      readonly status: "corrupt";
    }
  | {
      readonly quarantineKey: string | null;
      readonly raw: string;
      readonly reason: string;
      readonly schemaVersion: unknown;
      readonly status: "unsupported";
    }
  | { readonly reason: string; readonly status: "unavailable" };

export type ClassicSessionSaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export type ClassicSessionRepository = {
  readonly load: () => ClassicSessionLoadResult;
  readonly save: (
    state: ClassicCareerState,
  ) => ClassicSessionSaveResult;
};

const POSITION_SET = new Set<string>(
  Object.values(POSITION_ROLE_GROUPS).flat(),
);
const DECISION_TYPE_SET = new Set<ClassicDecisionType>([
  "academy_offer",
  "career_event",
  "contract_nonrenewal",
  "loan_offer",
  "no_offers_retirement",
  "post_loan_not_retained",
  "post_loan_retained",
  "transfer",
]);

export function createClassicSessionRepository(
  storage: StorageLike,
): ClassicSessionRepository {
  return {
    load() {
      let raw: string | null;

      try {
        raw = storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY);
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
          "Stored Classic session is not valid JSON",
        );
      }

      if (!isRecord(parsed)) {
        return recoverInvalid(
          storage,
          raw,
          "Stored Classic session must be an object",
        );
      }

      if (
        typeof parsed.schemaVersion !== "number" ||
        !Number.isInteger(parsed.schemaVersion)
      ) {
        return recoverInvalid(
          storage,
          raw,
          "Stored Classic session has no valid schema version",
        );
      }

      if (
        parsed.schemaVersion !== CLASSIC_SESSION_SCHEMA_VERSION
      ) {
        return unsupported(
          storage,
          raw,
          parsed.schemaVersion,
          `Unsupported Classic session schema: ${String(parsed.schemaVersion)}`,
        );
      }

      if (parsed.contentVersion !== CLASSIC_CONTENT_VERSION) {
        return unsupported(
          storage,
          raw,
          parsed.schemaVersion,
          `Unsupported Classic content version: ${String(parsed.contentVersion)}`,
        );
      }

      if (!isClassicSessionEnvelope(parsed)) {
        return recoverInvalid(
          storage,
          raw,
          "Stored Classic session does not match schema version 1",
        );
      }

      try {
        return {
          state: replayClassicCareer({
            choices: parsed.choiceLog,
            contentVersion: parsed.contentVersion,
            identity: parsed.identity,
            mode: parsed.mode,
            seed: parsed.seed,
          }),
          status: "ready",
        };
      } catch (error) {
        return recoverInvalid(
          storage,
          raw,
          `Stored Classic choices cannot be replayed: ${readableError(error)}`,
        );
      }
    },

    save(state) {
      const envelope: ClassicSessionEnvelopeV1 = {
        choiceLog: state.choiceLog,
        contentVersion: state.contentVersion,
        identity: state.identity,
        mode: state.mode,
        schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
        seed: state.seed,
      };

      try {
        storage.setItem(
          ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
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

function isClassicSessionEnvelope(
  value: Record<string, unknown>,
): value is ClassicSessionEnvelopeV1 {
  return (
    value.schemaVersion === CLASSIC_SESSION_SCHEMA_VERSION &&
    value.contentVersion === CLASSIC_CONTENT_VERSION &&
    typeof value.seed === "string" &&
    value.seed.length >= 1 &&
    value.seed.length <= 128 &&
    isPacingMode(value.mode) &&
    isClassicIdentity(value.identity) &&
    Array.isArray(value.choiceLog) &&
    value.choiceLog.every(isChoiceLogEntry)
  );
}

function isClassicIdentity(
  value: unknown,
): value is ClassicIdentity {
  return (
    isRecord(value) &&
    (value.firstName === undefined ||
      typeof value.firstName === "string") &&
    typeof value.lastName === "string" &&
    value.lastName.length >= 1 &&
    value.lastName.length <= 8 &&
    typeof value.nationalityFifaCode === "string" &&
    CLASSIC_CATALOG.countryByFifaCode.has(
      value.nationalityFifaCode,
    ) &&
    typeof value.position === "string" &&
    POSITION_SET.has(value.position) &&
    isIntegerBetween(value.preferredNumber, 1, 99)
  );
}

function isChoiceLogEntry(
  value: unknown,
): value is ClassicChoiceLogEntry {
  return (
    isRecord(value) &&
    typeof value.decisionId === "string" &&
    typeof value.decisionType === "string" &&
    DECISION_TYPE_SET.has(
      value.decisionType as ClassicDecisionType,
    ) &&
    typeof value.optionId === "string" &&
    (value.forcedOutcome === undefined ||
      value.forcedOutcome === "positive" ||
      value.forcedOutcome === "negative")
  );
}

function isPacingMode(value: unknown): value is PacingMode {
  return (
    typeof value === "string" &&
    Object.hasOwn(PACING_CONFIGS, value)
  );
}

function recoverInvalid(
  storage: StorageLike,
  raw: string,
  reason: string,
): Extract<ClassicSessionLoadResult, { status: "corrupt" }> {
  return {
    quarantineKey: quarantine(storage, raw),
    raw,
    reason,
    status: "corrupt",
  };
}

function unsupported(
  storage: StorageLike,
  raw: string,
  schemaVersion: unknown,
  reason: string,
): Extract<ClassicSessionLoadResult, { status: "unsupported" }> {
  return {
    quarantineKey: quarantine(storage, raw),
    raw,
    reason,
    schemaVersion,
    status: "unsupported",
  };
}

function quarantine(
  storage: StorageLike,
  raw: string,
): string | null {
  const baseKey = `${CLASSIC_SESSION_QUARANTINE_PREFIX}${hashRaw(raw)}`;

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
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
