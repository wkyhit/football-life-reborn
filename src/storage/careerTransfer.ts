import {
  replayClassicCareer,
  type ClassicCareerState,
} from "../domain/classicEngine";
import { CLASSIC_CONTENT_VERSION } from "../domain/catalog/classicCatalog";
import type {
  ArchiveRepository,
  ArchiveStorageLike,
  CareerArchiveEntry,
} from "./archiveRepository";

export const CAREER_TRANSFER_FORMAT =
  "football-life-reborn/career-archive" as const;
export const CAREER_TRANSFER_VERSION = 1 as const;
export const CAREER_TRANSFER_QUARANTINE_PREFIX =
  "football-life-reborn:career-transfer:quarantine:" as const;

export type CareerTransferArchive = {
  readonly career: ClassicCareerState;
  readonly createdAt: string;
  readonly displayName: string;
  readonly id: string;
  readonly updatedAt: string;
};

type CareerTransferUnsignedV1 = {
  readonly archive: CareerTransferArchive;
  readonly format: typeof CAREER_TRANSFER_FORMAT;
  readonly formatVersion: typeof CAREER_TRANSFER_VERSION;
};

type CareerTransferDocumentV1 =
  CareerTransferUnsignedV1 & {
    readonly checksum: string;
  };

export type CareerTransferParseResult =
  | {
      readonly archive: CareerTransferArchive;
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
      readonly formatVersion?: unknown;
      readonly quarantineKey: string | null;
      readonly reason:
        | "content_version"
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
  const unsigned: CareerTransferUnsignedV1 = {
    archive: {
      career: input.career,
      createdAt: input.entry.createdAt,
      displayName: input.entry.displayName,
      id: input.entry.id,
      updatedAt: input.entry.updatedAt,
    },
    format: CAREER_TRANSFER_FORMAT,
    formatVersion: CAREER_TRANSFER_VERSION,
  };
  const document: CareerTransferDocumentV1 = {
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

  if (parsed.formatVersion !== CAREER_TRANSFER_VERSION) {
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
    typeof parsed.checksum !== "string" ||
    !isTransferArchive(parsed.archive)
  ) {
    return { reason: "invalid_schema", status: "invalid" };
  }

  const unsigned: CareerTransferUnsignedV1 = {
    archive: parsed.archive,
    format: CAREER_TRANSFER_FORMAT,
    formatVersion: CAREER_TRANSFER_VERSION,
  };

  if (parsed.checksum !== checksum(unsigned)) {
    return {
      reason: "checksum_mismatch",
      status: "invalid",
    };
  }

  if (
    parsed.archive.career.contentVersion !==
    CLASSIC_CONTENT_VERSION
  ) {
    return {
      contentVersion:
        parsed.archive.career.contentVersion,
      reason: "content_version",
      status: "unsupported",
    };
  }

  let replayed: ClassicCareerState;

  try {
    replayed = replayClassicCareer({
      choices: parsed.archive.career.choiceLog,
      contentVersion:
        parsed.archive.career.contentVersion,
      identity: parsed.archive.career.identity,
      mode: parsed.archive.career.mode,
      seed: parsed.archive.career.seed,
    });
  } catch {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  if (
    stableStringify(replayed) !==
    stableStringify(parsed.archive.career)
  ) {
    return { reason: "replay_mismatch", status: "invalid" };
  }

  return {
    archive: parsed.archive,
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

    return parsed.reason === "format_version"
      ? {
          formatVersion: parsed.formatVersion,
          quarantineKey,
          reason: parsed.reason,
          status: "unsupported",
        }
      : {
          contentVersion: parsed.contentVersion,
          quarantineKey,
          reason: parsed.reason,
          status: "unsupported",
        };
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

function isTransferArchive(
  value: unknown,
): value is CareerTransferArchive {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "career",
      "createdAt",
      "displayName",
      "id",
      "updatedAt",
    ]) ||
    !isRecord(value.career) ||
    typeof value.createdAt !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.id !== "string" ||
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
  return `fnv1a64:${fnv1a64(stableStringify(value))}`;
}

function fnv1a64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let hash = 0xcbf29ce484222325n;

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(
      64,
      hash * 0x100000001b3n,
    );
  }

  return hash.toString(16).padStart(16, "0");
}

function stableStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableStringify(item))
      .join(",")}]`;
  }

  if (isRecord(value)) {
    const fields = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(value[key])}`,
      );

    return `{${fields.join(",")}}`;
  }

  throw new TypeError(
    `Cannot checksum value of type ${typeof value}`,
  );
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
