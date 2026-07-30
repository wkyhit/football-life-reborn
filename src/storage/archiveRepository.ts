import type {
  ClassicCareerState,
  ClassicIdentity,
} from "../domain/classicEngine";
import {
  createDecisionCheckpoints,
  type DecisionCheckpoint,
} from "../domain/checkpoint";
import { stableStringify } from "../domain/deterministicHash";
import {
  createCareerLedger,
  type CareerLedgerEntry,
} from "../domain/ledger";
import type { PacingMode } from "../domain/pacing";
import type {
  CareerTotals,
  RetirementReason,
} from "../domain/summary";

export const ARCHIVE_SCHEMA_VERSION = 1 as const;
export const ARCHIVE_CAPACITY = 20 as const;
export const ARCHIVE_INDEX_STORAGE_KEY =
  "football-life-reborn:archive:index:v1" as const;
export const ARCHIVE_PAYLOAD_STORAGE_PREFIX =
  "football-life-reborn:archive:career:v1:" as const;

export type ArchiveStorageLike = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>;

export type CareerArchiveStatus =
  | "in_progress"
  | "retired";

export type CareerArchiveEntry = {
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly displayName: string;
  readonly id: string;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly progress: {
    readonly age: number;
    readonly choiceCount: number;
    readonly currentClubId: string | null;
    readonly marketValue: number;
    readonly overall: number;
    readonly seasonCount: number;
  };
  readonly seed: string;
  readonly status: CareerArchiveStatus;
  readonly summaryPreview: {
    readonly awardCount: number;
    readonly ending: RetirementReason;
    readonly maxMarketValue: number;
    readonly maxOverall: number;
    readonly totals: CareerTotals;
    readonly trophyCount: number;
  } | null;
  readonly updatedAt: string;
};

type ArchiveIndexEnvelopeV1 = {
  readonly entries: readonly CareerArchiveEntry[];
  readonly schemaVersion: typeof ARCHIVE_SCHEMA_VERSION;
};

type ArchivePayloadEnvelopeV1 = {
  readonly career: ClassicCareerState;
  readonly checkpoints: readonly DecisionCheckpoint[];
  readonly id: string;
  readonly ledger: readonly CareerLedgerEntry[];
  readonly schemaVersion: typeof ARCHIVE_SCHEMA_VERSION;
};

type ArchiveUnavailable = {
  readonly detail: string;
  readonly ok: false;
  readonly reason: "unavailable";
};

type ArchiveCorruptIndex = {
  readonly detail: string;
  readonly ok: false;
  readonly reason: "corrupt_index";
};

type ArchiveMutationFailure =
  | ArchiveUnavailable
  | ArchiveCorruptIndex
  | {
      readonly id: string;
      readonly ok: false;
      readonly reason: "duplicate_id" | "invalid_id";
    }
  | {
      readonly ok: false;
      readonly reason:
        | "invalid_name"
        | "invalid_timestamp"
        | "not_found";
    };

export type ArchiveMutationResult =
  | {
      readonly entry: CareerArchiveEntry;
      readonly ok: true;
    }
  | ArchiveMutationFailure;

export type ArchiveCreateResult =
  | ArchiveMutationResult
  | {
      readonly capacity: typeof ARCHIVE_CAPACITY;
      readonly ok: false;
      readonly reason: "capacity";
    };

export type ArchiveListResult =
  | {
      readonly entries: readonly CareerArchiveEntry[];
      readonly ok: true;
    }
  | ArchiveUnavailable
  | ArchiveCorruptIndex;

export type ArchiveLoadResult =
  | {
      readonly career: ClassicCareerState;
      readonly checkpoints: readonly DecisionCheckpoint[];
      readonly entry: CareerArchiveEntry;
      readonly ledger: readonly CareerLedgerEntry[];
      readonly status: "ready";
    }
  | { readonly status: "missing" }
  | {
      readonly detail: string;
      readonly raw: string | null;
      readonly status: "corrupt";
    }
  | {
      readonly reason: string;
      readonly status: "unavailable";
    };

export type ArchiveDeleteResult =
  | {
      readonly entry: CareerArchiveEntry;
      readonly ok: true;
      readonly undoToken: string;
    }
  | ArchiveMutationFailure;

export type ArchiveUndoResult =
  | {
      readonly entry: CareerArchiveEntry;
      readonly ok: true;
    }
  | ArchiveUnavailable
  | ArchiveCorruptIndex
  | {
      readonly capacity: typeof ARCHIVE_CAPACITY;
      readonly ok: false;
      readonly reason: "capacity";
    }
  | {
      readonly ok: false;
      readonly reason: "id_conflict" | "undo_not_found";
    };

export type ArchiveRepository = {
  readonly create: (input: {
    readonly career: ClassicCareerState;
    readonly createdAt?: string;
    readonly displayName: string;
    readonly id?: string;
    readonly updatedAt?: string;
  }) => ArchiveCreateResult;
  readonly delete: (id: string) => ArchiveDeleteResult;
  readonly list: () => ArchiveListResult;
  readonly load: (id: string) => ArchiveLoadResult;
  readonly rename: (
    id: string,
    displayName: string,
  ) => ArchiveMutationResult;
  readonly undoDelete: (
    undoToken: string,
  ) => ArchiveUndoResult;
  readonly update: (
    id: string,
    career: ClassicCareerState,
  ) => ArchiveMutationResult;
};

type ArchiveRepositoryOptions = {
  readonly createId?: () => string;
  readonly now?: () => string;
};

type DeletedArchive = {
  readonly entry: CareerArchiveEntry;
  readonly payloadRaw: string;
};

type IndexReadResult =
  | {
      readonly entries: readonly CareerArchiveEntry[];
      readonly ok: true;
    }
  | Exclude<ArchiveListResult, { readonly ok: true }>;

export function archivePayloadStorageKey(
  id: string,
): string {
  return `${ARCHIVE_PAYLOAD_STORAGE_PREFIX}${id}`;
}

export function createArchiveRepository(
  storage: ArchiveStorageLike,
  options: ArchiveRepositoryOptions = {},
): ArchiveRepository {
  const createId =
    options.createId ?? (() => globalThis.crypto.randomUUID());
  const now =
    options.now ?? (() => new Date().toISOString());
  const deletedArchives = new Map<string, DeletedArchive>();
  let nextUndoToken = 1;

  const list = (): ArchiveListResult => {
    const index = readIndex(storage);

    if (!index.ok) {
      return index;
    }

    return {
      entries: sortEntries(index.entries),
      ok: true,
    };
  };

  return {
    create(input) {
      const index = readIndex(storage);

      if (!index.ok) {
        return index;
      }

      if (index.entries.length >= ARCHIVE_CAPACITY) {
        return {
          capacity: ARCHIVE_CAPACITY,
          ok: false,
          reason: "capacity",
        };
      }

      const id = input.id ?? createId();

      if (!isArchiveId(id)) {
        return { id, ok: false, reason: "invalid_id" };
      }

      if (index.entries.some((entry) => entry.id === id)) {
        return { id, ok: false, reason: "duplicate_id" };
      }

      const displayName = normalizeDisplayName(
        input.displayName,
      );

      if (displayName === null) {
        return { ok: false, reason: "invalid_name" };
      }

      const createdAt = input.createdAt ?? now();
      const updatedAt = input.updatedAt ?? createdAt;

      if (
        !isIsoTimestamp(createdAt) ||
        !isIsoTimestamp(updatedAt)
      ) {
        return { ok: false, reason: "invalid_timestamp" };
      }

      const entry = createEntry({
        career: input.career,
        createdAt,
        displayName,
        id,
        updatedAt,
      });
      const payloadRaw = serializePayload(id, input.career);
      const nextEntries = sortEntries([
        ...index.entries,
        entry,
      ]);
      const payloadKey = archivePayloadStorageKey(id);

      try {
        storage.setItem(payloadKey, payloadRaw);
        storage.setItem(
          ARCHIVE_INDEX_STORAGE_KEY,
          serializeIndex(nextEntries),
        );
      } catch (error) {
        try {
          storage.removeItem(payloadKey);
        } catch {
          // The original storage error remains the actionable result.
        }

        return unavailable(error);
      }

      return { entry, ok: true };
    },

    delete(id) {
      const index = readIndex(storage);

      if (!index.ok) {
        return index;
      }

      const entry = index.entries.find(
        (candidate) => candidate.id === id,
      );

      if (entry === undefined) {
        return { ok: false, reason: "not_found" };
      }

      const payloadKey = archivePayloadStorageKey(id);
      let payloadRaw: string | null;

      try {
        payloadRaw = storage.getItem(payloadKey);
      } catch (error) {
        return unavailable(error);
      }

      if (payloadRaw === null) {
        return unavailable(
          new Error(`Archive payload is missing: ${id}`),
        );
      }

      const nextEntries = index.entries.filter(
        (candidate) => candidate.id !== id,
      );

      try {
        storage.setItem(
          ARCHIVE_INDEX_STORAGE_KEY,
          serializeIndex(nextEntries),
        );
        storage.removeItem(payloadKey);
      } catch (error) {
        try {
          storage.setItem(
            ARCHIVE_INDEX_STORAGE_KEY,
            serializeIndex(index.entries),
          );
          storage.setItem(payloadKey, payloadRaw);
        } catch {
          // The original storage error remains the actionable result.
        }

        return unavailable(error);
      }

      const undoToken = `archive-undo-${nextUndoToken}`;
      nextUndoToken += 1;
      deletedArchives.set(undoToken, { entry, payloadRaw });

      return { entry, ok: true, undoToken };
    },

    list,

    load(id) {
      const index = readIndex(storage);

      if (!index.ok) {
        return index.reason === "unavailable"
          ? {
              reason: index.detail,
              status: "unavailable",
            }
          : {
              detail: index.detail,
              raw: null,
              status: "corrupt",
            };
      }

      const entry = index.entries.find(
        (candidate) => candidate.id === id,
      );

      if (entry === undefined) {
        return { status: "missing" };
      }

      let raw: string | null;

      try {
        raw = storage.getItem(archivePayloadStorageKey(id));
      } catch (error) {
        return {
          reason: readableError(error),
          status: "unavailable",
        };
      }

      if (raw === null) {
        return {
          detail: `Archive payload is missing: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch {
        return {
          detail: `Archive payload is not valid JSON: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      if (
        !isRecord(parsed) ||
        parsed.schemaVersion !== ARCHIVE_SCHEMA_VERSION ||
        parsed.id !== id ||
        !isRecord(parsed.career) ||
        !Array.isArray(parsed.checkpoints) ||
        !Array.isArray(parsed.ledger)
      ) {
        return {
          detail: `Archive payload does not match schema version 1: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      const career =
        parsed.career as unknown as ClassicCareerState;
      let checkpoints: readonly DecisionCheckpoint[];

      try {
        checkpoints = createDecisionCheckpoints(career);
      } catch {
        return {
          detail: `Archive career cannot be replayed: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      if (
        stableStringify(checkpoints) !==
        stableStringify(parsed.checkpoints)
      ) {
        return {
          detail: `Archive checkpoints do not match career: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      let ledger: readonly CareerLedgerEntry[];

      try {
        ledger = createCareerLedger(career);
      } catch {
        return {
          detail: `Archive career cannot produce a ledger: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      if (
        stableStringify(ledger) !==
        stableStringify(parsed.ledger)
      ) {
        return {
          detail: `Archive ledger does not match career: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      return {
        career,
        checkpoints,
        entry,
        ledger,
        status: "ready",
      };
    },

    rename(id, nextDisplayName) {
      const index = readIndex(storage);

      if (!index.ok) {
        return index;
      }

      const entry = index.entries.find(
        (candidate) => candidate.id === id,
      );

      if (entry === undefined) {
        return { ok: false, reason: "not_found" };
      }

      const displayName = normalizeDisplayName(
        nextDisplayName,
      );

      if (displayName === null) {
        return { ok: false, reason: "invalid_name" };
      }

      const updatedEntry: CareerArchiveEntry = {
        ...entry,
        displayName,
        updatedAt: now(),
      };
      const nextEntries = index.entries.map((candidate) =>
        candidate.id === id ? updatedEntry : candidate,
      );

      try {
        storage.setItem(
          ARCHIVE_INDEX_STORAGE_KEY,
          serializeIndex(sortEntries(nextEntries)),
        );
      } catch (error) {
        return unavailable(error);
      }

      return { entry: updatedEntry, ok: true };
    },

    undoDelete(undoToken) {
      const deleted = deletedArchives.get(undoToken);

      if (deleted === undefined) {
        return { ok: false, reason: "undo_not_found" };
      }

      const index = readIndex(storage);

      if (!index.ok) {
        return index;
      }

      if (index.entries.length >= ARCHIVE_CAPACITY) {
        return {
          capacity: ARCHIVE_CAPACITY,
          ok: false,
          reason: "capacity",
        };
      }

      if (
        index.entries.some(
          (entry) => entry.id === deleted.entry.id,
        )
      ) {
        return { ok: false, reason: "id_conflict" };
      }

      const payloadKey = archivePayloadStorageKey(
        deleted.entry.id,
      );
      const nextEntries = sortEntries([
        ...index.entries,
        deleted.entry,
      ]);

      try {
        storage.setItem(payloadKey, deleted.payloadRaw);
        storage.setItem(
          ARCHIVE_INDEX_STORAGE_KEY,
          serializeIndex(nextEntries),
        );
      } catch (error) {
        try {
          storage.removeItem(payloadKey);
        } catch {
          // The original storage error remains the actionable result.
        }

        return unavailable(error);
      }

      deletedArchives.delete(undoToken);
      return { entry: deleted.entry, ok: true };
    },

    update(id, career) {
      const index = readIndex(storage);

      if (!index.ok) {
        return index;
      }

      const currentEntry = index.entries.find(
        (candidate) => candidate.id === id,
      );

      if (currentEntry === undefined) {
        return { ok: false, reason: "not_found" };
      }

      const updatedEntry = createEntry({
        career,
        createdAt: currentEntry.createdAt,
        displayName: currentEntry.displayName,
        id,
        updatedAt: now(),
      });
      const nextEntries = sortEntries(
        index.entries.map((candidate) =>
          candidate.id === id ? updatedEntry : candidate,
        ),
      );
      const payloadKey = archivePayloadStorageKey(id);
      let previousPayload: string | null | undefined;

      try {
        previousPayload = storage.getItem(payloadKey);
        storage.setItem(payloadKey, serializePayload(id, career));
        storage.setItem(
          ARCHIVE_INDEX_STORAGE_KEY,
          serializeIndex(nextEntries),
        );
      } catch (error) {
        try {
          if (previousPayload === null) {
            storage.removeItem(payloadKey);
          } else if (previousPayload !== undefined) {
            storage.setItem(payloadKey, previousPayload);
          }
        } catch {
          // The original storage error remains the actionable result.
        }

        return unavailable(error);
      }

      return { entry: updatedEntry, ok: true };
    },
  };
}

function createEntry(input: {
  readonly career: ClassicCareerState;
  readonly createdAt: string;
  readonly displayName: string;
  readonly id: string;
  readonly updatedAt: string;
}): CareerArchiveEntry {
  const { career } = input;
  const summary = career.summary;

  return {
    contentVersion: career.contentVersion,
    createdAt: input.createdAt,
    displayName: input.displayName,
    id: input.id,
    identity: { ...career.identity },
    mode: career.mode,
    progress: {
      age: career.playerAge,
      choiceCount: career.choiceLog.length,
      currentClubId: career.currentClubId,
      marketValue: career.marketValue,
      overall: career.overall,
      seasonCount: career.seasons.length,
    },
    seed: career.seed,
    status:
      career.phase === "summary"
        ? "retired"
        : "in_progress",
    summaryPreview:
      summary === null
        ? null
        : {
            awardCount: summary.awards.length,
            ending: summary.ending,
            maxMarketValue: summary.maxMarketValue,
            maxOverall: summary.maxOverall,
            totals: { ...summary.totals },
            trophyCount: summary.totals.trophies,
          },
    updatedAt: input.updatedAt,
  };
}

function readIndex(
  storage: ArchiveStorageLike,
): IndexReadResult {
  let raw: string | null;

  try {
    raw = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
  } catch (error) {
    return unavailable(error);
  }

  if (raw === null) {
    return { entries: [], ok: true };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      detail: "Archive index is not valid JSON",
      ok: false,
      reason: "corrupt_index",
    };
  }

  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== ARCHIVE_SCHEMA_VERSION ||
    !Array.isArray(parsed.entries) ||
    !parsed.entries.every(isArchiveEntry)
  ) {
    return {
      detail: "Archive index does not match schema version 1",
      ok: false,
      reason: "corrupt_index",
    };
  }

  if (
    new Set(
      parsed.entries.map((entry: CareerArchiveEntry) => entry.id),
    ).size !== parsed.entries.length
  ) {
    return {
      detail: "Archive index contains duplicate IDs",
      ok: false,
      reason: "corrupt_index",
    };
  }

  return {
    entries: parsed.entries as CareerArchiveEntry[],
    ok: true,
  };
}

function serializeIndex(
  entries: readonly CareerArchiveEntry[],
): string {
  const envelope: ArchiveIndexEnvelopeV1 = {
    entries,
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
  };

  return JSON.stringify(envelope);
}

function serializePayload(
  id: string,
  career: ClassicCareerState,
): string {
  const envelope: ArchivePayloadEnvelopeV1 = {
    career,
    checkpoints: createDecisionCheckpoints(career),
    id,
    ledger: createCareerLedger(career),
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
  };

  return JSON.stringify(envelope);
}

function sortEntries(
  entries: readonly CareerArchiveEntry[],
): CareerArchiveEntry[] {
  return [...entries].sort((left, right) => {
    const timeOrder = right.updatedAt.localeCompare(
      left.updatedAt,
    );

    return timeOrder === 0
      ? left.id.localeCompare(right.id)
      : timeOrder;
  });
}

function normalizeDisplayName(value: string): string | null {
  const normalized = value.trim();

  return normalized.length >= 1 && normalized.length <= 80
    ? normalized
    : null;
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

function isArchiveEntry(
  value: unknown,
): value is CareerArchiveEntry {
  return (
    isRecord(value) &&
    typeof value.contentVersion === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.displayName === "string" &&
    typeof value.id === "string" &&
    isArchiveId(value.id) &&
    isRecord(value.identity) &&
    typeof value.mode === "string" &&
    isRecord(value.progress) &&
    typeof value.seed === "string" &&
    (value.status === "in_progress" ||
      value.status === "retired") &&
    (value.summaryPreview === null ||
      isRecord(value.summaryPreview)) &&
    typeof value.updatedAt === "string"
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

function unavailable(error: unknown): ArchiveUnavailable {
  return {
    detail: readableError(error),
    ok: false,
    reason: "unavailable",
  };
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
