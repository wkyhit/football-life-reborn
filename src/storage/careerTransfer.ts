import {
  replayClassicCareer,
  type ClassicCareerState,
} from "../domain/classicEngine";
import { CLASSIC_CONTENT_VERSION } from "../domain/catalog/classicCatalog";
import {
  createDecisionCheckpoints,
  type DecisionCheckpoint,
} from "../domain/checkpoint";
import {
  deterministicHash,
  fnv1a64,
  stableStringify,
} from "../domain/deterministicHash";
import {
  createCareerLedger,
  type CareerLedgerEntry,
} from "../domain/ledger";
import {
  createCareerEconomyProjection,
  type CareerEconomyProjection,
} from "../domain/economy/careerEconomyProjection";
import { ECONOMY_POLICY_VERSION } from "../domain/economy/economyPolicy";
import type {
  ArchiveRepository,
  ArchiveStorageLike,
  CareerArchiveEntry,
} from "./archiveRepository";

export const CAREER_TRANSFER_FORMAT =
  "football-life-reborn/career-archive" as const;
export const CAREER_TRANSFER_VERSION = 2 as const;
export const CAREER_TRANSFER_QUARANTINE_PREFIX =
  "football-life-reborn:career-transfer:quarantine:" as const;

export type CareerTransferArchive = {
  readonly career: ClassicCareerState;
  readonly checkpoints: readonly DecisionCheckpoint[];
  readonly createdAt: string;
  readonly displayName: string;
  readonly economy: CareerEconomyProjection;
  readonly economyPolicyVersion:
    typeof ECONOMY_POLICY_VERSION;
  readonly id: string;
  readonly ledger: readonly CareerLedgerEntry[];
  readonly updatedAt: string;
};

type CareerTransferArchiveV1 = Omit<
  CareerTransferArchive,
  "economy" | "economyPolicyVersion"
>;

type CareerTransferArchiveV2Encoded = Omit<
  CareerTransferArchive,
  "economyPolicyVersion"
> & {
  readonly economyPolicyVersion: string;
};

type CareerTransferUnsignedV2 = {
  readonly archive: CareerTransferArchive;
  readonly format: typeof CAREER_TRANSFER_FORMAT;
  readonly formatVersion: typeof CAREER_TRANSFER_VERSION;
};

type CareerTransferDocumentV2 =
  CareerTransferUnsignedV2 & {
    readonly checksum: string;
  };

export type CareerTransferParseResult =
  | {
      readonly archive: CareerTransferArchive;
      readonly sourceFormatVersion: 1 | 2;
      readonly status: "ready";
    }
  | {
      readonly reason:
        | "checksum_mismatch"
        | "format_marker"
        | "invalid_json"
        | "invalid_schema"
        | "replay_mismatch";
      readonly status: "invalid";
    }
  | {
      readonly formatVersion: unknown;
      readonly reason: "format_version";
      readonly status: "unsupported";
    }
  | {
      readonly contentVersion: unknown;
      readonly reason: "content_version";
      readonly status: "unsupported";
    }
  | {
      readonly economyPolicyVersion: unknown;
      readonly reason: "economy_policy";
      readonly status: "unsupported";
    };

export type CareerTransferImportResult =
  | {
      readonly entry: CareerArchiveEntry;
      readonly status: "imported";
    }
  | {
      readonly quarantineKey: string | null;
      readonly reason:
        | "checksum_mismatch"
        | "format_marker"
        | "invalid_json"
        | "invalid_schema"
        | "replay_mismatch"
        | "repository_rejected";
      readonly status: "rejected";
    }
  | {
      readonly contentVersion?: unknown;
      readonly economyPolicyVersion?: unknown;
      readonly formatVersion?: unknown;
      readonly quarantineKey: string | null;
      readonly reason:
        | "content_version"
        | "economy_policy"
        | "format_version";
      readonly status: "unsupported";
    }
  | {
      readonly id: string;
      readonly quarantineKey: string | null;
      readonly reason: "duplicate_id";
      readonly status: "conflict";
    }
  | {
      readonly capacity: number;
      readonly quarantineKey: string | null;
      readonly status: "capacity";
    }
  | {
      readonly reason: string;
      readonly status: "unavailable";
    };

export function serializeCareerTransfer(input: {
  readonly career: ClassicCareerState;
  readonly entry: CareerArchiveEntry;
}): string {
  const unsigned: CareerTransferUnsignedV2 = {
    archive: {
      career: input.career,
      checkpoints: deriveTransferCheckpoints(input.career),
      createdAt: input.entry.createdAt,
      displayName: input.entry.displayName,
      economy: deriveTransferEconomy(input.career),
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      id: input.entry.id,
      ledger: deriveTransferLedger(input.career),
      updatedAt: input.entry.updatedAt,
    },
    format: CAREER_TRANSFER_FORMAT,
    formatVersion: CAREER_TRANSFER_VERSION,
  };
  const document: CareerTransferDocumentV2 = {
    ...unsigned,
    checksum: checksum(unsigned),
  };

  return JSON.stringify(document);
}

export function parseCareerTransfer(
  raw: string,
): CareerTransferParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: "invalid_json", status: "invalid" };
  }

  if (!isRecord(parsed)) {
    return { reason: "invalid_schema", status: "invalid" };
  }

  if (parsed.format !== CAREER_TRANSFER_FORMAT) {
    return { reason: "format_marker", status: "invalid" };
  }

  if (
    parsed.formatVersion !== 1 &&
    parsed.formatVersion !== CAREER_TRANSFER_VERSION
  ) {
    return {
      formatVersion: parsed.formatVersion,
      reason: "format_version",
      status: "unsupported",
    };
  }

  if (
    !hasExactKeys(parsed, [
      "archive",
      "checksum",
      "format",
      "formatVersion",
    ]) ||
    typeof parsed.checksum !== "string"
  ) {
    return { reason: "invalid_schema", status: "invalid" };
  }

  let archive:
    | CareerTransferArchiveV2Encoded
    | CareerTransferArchiveV1;

  if (parsed.formatVersion === 1) {
    if (!isTransferArchiveV1(parsed.archive)) {
      return { reason: "invalid_schema", status: "invalid" };
    }
    archive = parsed.archive;
  } else {
    if (!isTransferArchiveV2(parsed.archive)) {
      return { reason: "invalid_schema", status: "invalid" };
    }
    archive = parsed.archive;
  }

  const unsigned = {
    archive,
    format: CAREER_TRANSFER_FORMAT,
    formatVersion: parsed.formatVersion,
  };

  if (parsed.checksum !== checksum(unsigned)) {
    return {
      reason: "checksum_mismatch",
      status: "invalid",
    };
  }

  if (
    "economyPolicyVersion" in archive &&
    archive.economyPolicyVersion !== ECONOMY_POLICY_VERSION
  ) {
    return {
      economyPolicyVersion:
        archive.economyPolicyVersion,
      reason: "economy_policy",
      status: "unsupported",
    };
  }

  if (
    archive.career.contentVersion !==
    CLASSIC_CONTENT_VERSION
  ) {
    return {
      contentVersion:
        archive.career.contentVersion,
      reason: "content_version",
      status: "unsupported",
    };
  }

  let replayed: ClassicCareerState;

  try {
    replayed = replayClassicCareer({
      choices: archive.career.choiceLog,
      contentVersion:
        archive.career.contentVersion,
      identity: archive.career.identity,
      mode: archive.career.mode,
      seed: archive.career.seed,
    });
  } catch {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  if (
    stableStringify(replayed) !==
    stableStringify(archive.career)
  ) {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  let checkpoints: readonly DecisionCheckpoint[];

  try {
    checkpoints = createDecisionCheckpoints(replayed);
  } catch {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  if (
    stableStringify(checkpoints) !==
    stableStringify(archive.checkpoints)
  ) {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  let ledger: readonly CareerLedgerEntry[];

  try {
    ledger = createCareerLedger(replayed);
  } catch {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  if (
    stableStringify(ledger) !==
    stableStringify(archive.ledger)
  ) {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  let economy: CareerEconomyProjection;

  try {
    economy = createCareerEconomyProjection(replayed);
  } catch {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  if (
    parsed.formatVersion === 2 &&
    stableStringify(economy) !==
    stableStringify((archive as CareerTransferArchive).economy)
  ) {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  return {
    archive: {
      ...archive,
      checkpoints,
      economy,
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      ledger,
    },
    sourceFormatVersion: parsed.formatVersion,
    status: "ready",
  };
}

export function importCareerTransfer(
  raw: string,
  repository: ArchiveRepository,
  storage: ArchiveStorageLike,
): CareerTransferImportResult {
  const parsed = parseCareerTransfer(raw);

  if (parsed.status === "invalid") {
    return {
      quarantineKey: quarantine(storage, raw),
      reason: parsed.reason,
      status: "rejected",
    };
  }

  if (parsed.status === "unsupported") {
    const quarantineKey = quarantine(storage, raw);

    switch (parsed.reason) {
      case "format_version":
        return {
          formatVersion: parsed.formatVersion,
          quarantineKey,
          reason: parsed.reason,
          status: "unsupported",
        };
      case "content_version":
        return {
          contentVersion: parsed.contentVersion,
          quarantineKey,
          reason: parsed.reason,
          status: "unsupported",
        };
      case "economy_policy":
        return {
          economyPolicyVersion:
            parsed.economyPolicyVersion,
          quarantineKey,
          reason: parsed.reason,
          status: "unsupported",
        };
    }
  }

  const { archive } = parsed;
  const created = repository.create({
    career: archive.career,
    createdAt: archive.createdAt,
    displayName: archive.displayName,
    id: archive.id,
    updatedAt: archive.updatedAt,
  });

  if (created.ok) {
    return { entry: created.entry, status: "imported" };
  }

  if (created.reason === "duplicate_id") {
    return {
      id: archive.id,
      quarantineKey: quarantine(storage, raw),
      reason: "duplicate_id",
      status: "conflict",
    };
  }

  if (created.reason === "capacity") {
    return {
      capacity: created.capacity,
      quarantineKey: quarantine(storage, raw),
      status: "capacity",
    };
  }

  if (
    created.reason === "unavailable" ||
    created.reason === "corrupt_index"
  ) {
    return {
      reason: created.detail,
      status: "unavailable",
    };
  }

  return {
    quarantineKey: quarantine(storage, raw),
    reason: "repository_rejected",
    status: "rejected",
  };
}

function isTransferArchiveV2(
  value: unknown,
): value is CareerTransferArchiveV2Encoded {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "career",
      "checkpoints",
      "createdAt",
      "displayName",
      "economy",
      "economyPolicyVersion",
      "id",
      "ledger",
      "updatedAt",
    ]) ||
    !isRecord(value.career) ||
    !Array.isArray(value.checkpoints) ||
    typeof value.createdAt !== "string" ||
    typeof value.displayName !== "string" ||
    !isRecord(value.economy) ||
    typeof value.economyPolicyVersion !== "string" ||
    value.economyPolicyVersion.length < 1 ||
    value.economyPolicyVersion.length > 120 ||
    typeof value.id !== "string" ||
    !Array.isArray(value.ledger) ||
    typeof value.updatedAt !== "string" ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.createdAt > value.updatedAt ||
    value.displayName.trim() !== value.displayName ||
    value.displayName.length < 1 ||
    value.displayName.length > 80 ||
    !isArchiveId(value.id)
  ) {
    return false;
  }

  const career = value.career;

  return (
    typeof career.contentVersion === "string" &&
    Array.isArray(career.choiceLog) &&
    isRecord(career.identity) &&
    typeof career.mode === "string" &&
    typeof career.seed === "string"
  );
}

function isTransferArchiveV1(
  value: unknown,
): value is CareerTransferArchiveV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "career",
      "checkpoints",
      "createdAt",
      "displayName",
      "id",
      "ledger",
      "updatedAt",
    ]) ||
    !isRecord(value.career) ||
    !Array.isArray(value.checkpoints) ||
    typeof value.createdAt !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.id !== "string" ||
    !Array.isArray(value.ledger) ||
    typeof value.updatedAt !== "string" ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.createdAt > value.updatedAt ||
    value.displayName.trim() !== value.displayName ||
    value.displayName.length < 1 ||
    value.displayName.length > 80 ||
    !isArchiveId(value.id)
  ) {
    return false;
  }

  const career = value.career;

  return (
    typeof career.contentVersion === "string" &&
    Array.isArray(career.choiceLog) &&
    isRecord(career.identity) &&
    typeof career.mode === "string" &&
    typeof career.seed === "string"
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();

  return (
    actual.length === sortedExpected.length &&
    actual.every(
      (key, index) => key === sortedExpected[index],
    )
  );
}

function checksum(value: unknown): string {
  return deterministicHash(value);
}

function deriveTransferCheckpoints(
  career: ClassicCareerState,
): readonly DecisionCheckpoint[] {
  try {
    return createDecisionCheckpoints(career);
  } catch {
    return [];
  }
}

function deriveTransferLedger(
  career: ClassicCareerState,
): readonly CareerLedgerEntry[] {
  try {
    return createCareerLedger(career);
  } catch {
    return [];
  }
}

function deriveTransferEconomy(
  career: ClassicCareerState,
): CareerEconomyProjection {
  try {
    return createCareerEconomyProjection(career);
  } catch {
    try {
      const replayed = replayClassicCareer({
        choices: career.choiceLog,
        contentVersion: CLASSIC_CONTENT_VERSION,
        identity: career.identity,
        mode: career.mode,
        seed: career.seed,
      });

      return createCareerEconomyProjection(replayed);
    } catch {
      return Object.freeze({
        currentContract: null,
        economyPolicyVersion: ECONOMY_POLICY_VERSION,
        ledger: Object.freeze([]),
        optionQuotes: Object.freeze([]),
        seasonSalaries: Object.freeze([]),
        totalIncome: 0,
      });
    }
  }
}

function quarantine(
  storage: ArchiveStorageLike,
  raw: string,
): string | null {
  const baseKey = `${CAREER_TRANSFER_QUARANTINE_PREFIX}${fnv1a64(raw)}`;

  try {
    for (let index = 0; index < 100; index += 1) {
      const key =
        index === 0 ? baseKey : `${baseKey}-${index}`;
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

function isIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);

  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString() === value
  );
}

function isArchiveId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
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
