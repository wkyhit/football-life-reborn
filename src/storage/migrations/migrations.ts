import type { ClassicCareerState } from "../../domain/classicEngine";
import {
  createArchiveRepository,
  type ArchiveStorageLike,
} from "../archiveRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
} from "../classicSessionRepository";
import type { StorageLike } from "../careerRepository";

export const ARCHIVE_MIGRATION_SCHEMA_VERSION = 1 as const;
export const ARCHIVE_MIGRATION_STAGE_KEY =
  "football-life-reborn:migration:classic-session-v1-to-archive-v1:stage" as const;
export const ARCHIVE_MIGRATION_RECEIPT_KEY =
  "football-life-reborn:migration:classic-session-v1-to-archive-v1:receipt" as const;

export type ArchiveMigrationStep =
  | "before_copy"
  | "after_copy"
  | "after_index_swap";

type ArchiveMigrationStageV1 = {
  readonly archiveId: string;
  readonly createdAt: string;
  readonly schemaVersion:
    typeof ARCHIVE_MIGRATION_SCHEMA_VERSION;
  readonly sourceHash: string;
  readonly sourceKey:
    typeof ACTIVE_CLASSIC_SESSION_STORAGE_KEY;
  readonly sourceRaw: string;
};

type ArchiveMigrationReceiptV1 = {
  readonly archiveId: string;
  readonly completedAt: string;
  readonly schemaVersion:
    typeof ARCHIVE_MIGRATION_SCHEMA_VERSION;
  readonly sourceHash: string;
};

type ArchiveMigrationOptions = {
  readonly now?: () => string;
  readonly onStep?: (step: ArchiveMigrationStep) => void;
};

export type ArchiveMigrationResult =
  | { readonly status: "empty" }
  | {
      readonly archiveId: string;
      readonly status: "migrated" | "already_migrated";
    }
  | {
      readonly archiveId: string;
      readonly capacity: number;
      readonly status: "capacity";
    }
  | {
      readonly reason: string;
      readonly status: "invalid_source" | "invalid_stage";
    }
  | {
      readonly reason: string;
      readonly status: "unavailable";
    };

export function migrateClassicSessionToArchive(
  storage: ArchiveStorageLike,
  options: ArchiveMigrationOptions = {},
): ArchiveMigrationResult {
  const now =
    options.now ?? (() => new Date().toISOString());
  const receipt = readReceipt(storage);

  if (receipt.status === "unavailable") {
    return receipt;
  }

  if (receipt.status === "invalid") {
    return {
      reason: receipt.reason,
      status: "invalid_stage",
    };
  }

  if (receipt.status === "ready") {
    return {
      archiveId: receipt.receipt.archiveId,
      status: "already_migrated",
    };
  }

  const staged = readStage(storage);

  if (staged.status === "unavailable") {
    return staged;
  }

  if (staged.status === "invalid") {
    return {
      reason: staged.reason,
      status: "invalid_stage",
    };
  }

  let stage: ArchiveMigrationStageV1;

  if (staged.status === "ready") {
    stage = staged.stage;
  } else {
    let sourceRaw: string | null;

    try {
      sourceRaw = storage.getItem(
        ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      );
    } catch (error) {
      return unavailable(error);
    }

    if (sourceRaw === null) {
      return { status: "empty" };
    }

    options.onStep?.("before_copy");
    const createdAt = now();

    if (!isIsoTimestamp(createdAt)) {
      return {
        reason: `Migration clock returned an invalid timestamp: ${createdAt}`,
        status: "invalid_stage",
      };
    }

    const sourceHash = hashRaw(sourceRaw);
    stage = {
      archiveId: `legacy-${sourceHash}`,
      createdAt,
      schemaVersion: ARCHIVE_MIGRATION_SCHEMA_VERSION,
      sourceHash,
      sourceKey: ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      sourceRaw,
    };

    try {
      storage.setItem(
        ARCHIVE_MIGRATION_STAGE_KEY,
        JSON.stringify(stage),
      );
    } catch (error) {
      return unavailable(error);
    }

    options.onStep?.("after_copy");
  }

  const loaded = loadStagedCareer(storage, stage);

  if (loaded.status !== "ready") {
    return {
      reason:
        loaded.status === "empty"
          ? "Staged Classic session is empty"
          : loaded.reason,
      status: "invalid_source",
    };
  }

  const career = loaded.state;
  const repository = createArchiveRepository(storage);
  const created = repository.create({
    career,
    createdAt: stage.createdAt,
    displayName: `${career.identity.lastName}的生涯`,
    id: stage.archiveId,
    updatedAt: stage.createdAt,
  });

  if (created.ok) {
    options.onStep?.("after_index_swap");
    const receiptResult = writeReceipt(storage, stage);

    return receiptResult.ok
      ? {
          archiveId: stage.archiveId,
          status: "migrated",
        }
      : receiptResult.result;
  }

  if (created.reason === "duplicate_id") {
    const existing = repository.load(stage.archiveId);

    if (
      existing.status !== "ready" ||
      !sameCareer(existing.career, career)
    ) {
      return {
        reason: `Archive ID conflict during migration: ${stage.archiveId}`,
        status: "invalid_stage",
      };
    }

    const receiptResult = writeReceipt(storage, stage);

    return receiptResult.ok
      ? {
          archiveId: stage.archiveId,
          status: "already_migrated",
        }
      : receiptResult.result;
  }

  if (created.reason === "capacity") {
    return {
      archiveId: stage.archiveId,
      capacity: created.capacity,
      status: "capacity",
    };
  }

  return created.reason === "unavailable" ||
    created.reason === "corrupt_index"
    ? {
        reason: created.detail,
        status: "unavailable",
      }
    : {
        reason: `Archive rejected migration: ${created.reason}`,
        status: "invalid_stage",
      };
}

function loadStagedCareer(
  storage: ArchiveStorageLike,
  stage: ArchiveMigrationStageV1,
) {
  const stagedStorage: StorageLike = {
    getItem(key) {
      return key === ACTIVE_CLASSIC_SESSION_STORAGE_KEY
        ? stage.sourceRaw
        : storage.getItem(key);
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
  };

  return createClassicSessionRepository(
    stagedStorage,
  ).load();
}

function readStage(
  storage: ArchiveStorageLike,
):
  | { readonly status: "empty" }
  | {
      readonly stage: ArchiveMigrationStageV1;
      readonly status: "ready";
    }
  | {
      readonly reason: string;
      readonly status: "invalid";
    }
  | {
      readonly reason: string;
      readonly status: "unavailable";
    } {
  let raw: string | null;

  try {
    raw = storage.getItem(ARCHIVE_MIGRATION_STAGE_KEY);
  } catch (error) {
    return unavailable(error);
  }

  if (raw === null) {
    return { status: "empty" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      reason: "Archive migration stage is not valid JSON",
      status: "invalid",
    };
  }

  if (!isMigrationStage(parsed)) {
    return {
      reason:
        "Archive migration stage does not match schema version 1",
      status: "invalid",
    };
  }

  if (hashRaw(parsed.sourceRaw) !== parsed.sourceHash) {
    return {
      reason: "Archive migration stage copy hash does not match",
      status: "invalid",
    };
  }

  return { stage: parsed, status: "ready" };
}

function readReceipt(
  storage: ArchiveStorageLike,
):
  | { readonly status: "empty" }
  | {
      readonly receipt: ArchiveMigrationReceiptV1;
      readonly status: "ready";
    }
  | {
      readonly reason: string;
      readonly status: "invalid";
    }
  | {
      readonly reason: string;
      readonly status: "unavailable";
    } {
  let raw: string | null;

  try {
    raw = storage.getItem(ARCHIVE_MIGRATION_RECEIPT_KEY);
  } catch (error) {
    return unavailable(error);
  }

  if (raw === null) {
    return { status: "empty" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      reason: "Archive migration receipt is not valid JSON",
      status: "invalid",
    };
  }

  return isMigrationReceipt(parsed)
    ? { receipt: parsed, status: "ready" }
    : {
        reason:
          "Archive migration receipt does not match schema version 1",
        status: "invalid",
      };
}

function writeReceipt(
  storage: ArchiveStorageLike,
  stage: ArchiveMigrationStageV1,
):
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly result: Extract<
        ArchiveMigrationResult,
        { readonly status: "unavailable" }
      >;
    } {
  const receipt: ArchiveMigrationReceiptV1 = {
    archiveId: stage.archiveId,
    completedAt: stage.createdAt,
    schemaVersion: ARCHIVE_MIGRATION_SCHEMA_VERSION,
    sourceHash: stage.sourceHash,
  };

  try {
    storage.setItem(
      ARCHIVE_MIGRATION_RECEIPT_KEY,
      JSON.stringify(receipt),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, result: unavailable(error) };
  }
}

function isMigrationStage(
  value: unknown,
): value is ArchiveMigrationStageV1 {
  return (
    isRecord(value) &&
    value.schemaVersion ===
      ARCHIVE_MIGRATION_SCHEMA_VERSION &&
    typeof value.archiveId === "string" &&
    /^legacy-[0-9a-f]{8}$/.test(value.archiveId) &&
    typeof value.createdAt === "string" &&
    isIsoTimestamp(value.createdAt) &&
    typeof value.sourceHash === "string" &&
    /^[0-9a-f]{8}$/.test(value.sourceHash) &&
    value.sourceKey ===
      ACTIVE_CLASSIC_SESSION_STORAGE_KEY &&
    typeof value.sourceRaw === "string"
  );
}

function isMigrationReceipt(
  value: unknown,
): value is ArchiveMigrationReceiptV1 {
  return (
    isRecord(value) &&
    value.schemaVersion ===
      ARCHIVE_MIGRATION_SCHEMA_VERSION &&
    typeof value.archiveId === "string" &&
    /^legacy-[0-9a-f]{8}$/.test(value.archiveId) &&
    typeof value.completedAt === "string" &&
    isIsoTimestamp(value.completedAt) &&
    typeof value.sourceHash === "string" &&
    /^[0-9a-f]{8}$/.test(value.sourceHash)
  );
}

function sameCareer(
  left: ClassicCareerState,
  right: ClassicCareerState,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hashRaw(raw: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);

  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString() === value
  );
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

function unavailable(error: unknown): {
  readonly reason: string;
  readonly status: "unavailable";
} {
  return {
    reason: readableError(error),
    status: "unavailable",
  };
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
