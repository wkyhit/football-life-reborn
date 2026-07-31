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
  createCareerEconomyProjection,
  type CareerEconomyProjection,
} from "../domain/economy/careerEconomyProjection";
import { ECONOMY_POLICY_VERSION } from "../domain/economy/economyPolicy";
import {
  createCareerLedger,
  type CareerLedgerEntry,
} from "../domain/ledger";
import type { PacingMode } from "../domain/pacing";
import type {
  CareerTotals,
  RetirementReason,
} from "../domain/summary";

export const ARCHIVE_SCHEMA_VERSION = 2 as const;
export const ARCHIVE_CAPACITY = 20 as const;
export const ARCHIVE_INDEX_STORAGE_KEY =
  "football-life-reborn:archive:index:v2" as const;
export const ARCHIVE_PAYLOAD_STORAGE_PREFIX =
  "football-life-reborn:archive:career:v2:" as const;
export const LEGACY_ARCHIVE_INDEX_STORAGE_KEY =
  "football-life-reborn:archive:index:v1" as const;
export const LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX =
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
  readonly economyPolicyVersion:
    typeof ECONOMY_POLICY_VERSION;
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
  readonly totalIncome: number;
  readonly updatedAt: string;
};

type ArchiveIndexEnvelopeV2 = {
  readonly entries: readonly CareerArchiveEntry[];
  readonly schemaVersion: typeof ARCHIVE_SCHEMA_VERSION;
};

type LegacyCareerArchiveEntry = Omit<
  CareerArchiveEntry,
  "economyPolicyVersion" | "totalIncome"
>;

type ArchivePayloadEnvelopeV2 = {
  readonly career: ClassicCareerState;
  readonly checkpoints: readonly DecisionCheckpoint[];
  readonly economy: CareerEconomyProjection;
  readonly economyPolicyVersion:
    typeof ECONOMY_POLICY_VERSION;
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
      readonly economy: CareerEconomyProjection;
      readonly economyPolicyVersion:
        typeof ECONOMY_POLICY_VERSION;
      readonly entry: CareerArchiveEntry;
      readonly ledger: readonly CareerLedgerEntry[];
      readonly sourceSchemaVersion: 1 | 2;
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

type LegacyArchiveIndexCache = {
  entries: readonly CareerArchiveEntry[] | null;
  raw: string | null;
};

export function archivePayloadStorageKey(
  id: string,
): string {
  return `${ARCHIVE_PAYLOAD_STORAGE_PREFIX}${id}`;
}

export function legacyArchivePayloadStorageKey(
  id: string,
): string {
  return `${LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX}${id}`;
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
  const legacyIndexCache: LegacyArchiveIndexCache = {
    entries: null,
    raw: null,
  };
  let nextUndoToken = 1;
  const readRepositoryIndex = () =>
    readIndex(storage, legacyIndexCache);

  const list = (): ArchiveListResult => {
    const index = readRepositoryIndex();

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
      const index = readRepositoryIndex();

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
      const index = readRepositoryIndex();

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
      let undoPayloadRaw: string;

      try {
        payloadRaw = storage.getItem(payloadKey);

        if (payloadRaw === null) {
          payloadRaw = storage.getItem(
            legacyArchivePayloadStorageKey(id),
          );
        }

        if (payloadRaw === null) {
          return unavailable(
            new Error(`Archive payload is missing: ${id}`),
          );
        }

        undoPayloadRaw =
          normalizeDeletedArchivePayload(id, payloadRaw);
      } catch (error) {
        return unavailable(error);
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
      deletedArchives.set(undoToken, {
        entry,
        payloadRaw: undoPayloadRaw,
      });

      return { entry, ok: true, undoToken };
    },

    list,

    load(id) {
      const index = readRepositoryIndex();

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

        if (raw === null) {
          raw = storage.getItem(
            legacyArchivePayloadStorageKey(id),
          );
        }
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
        (parsed.schemaVersion !== 1 &&
          parsed.schemaVersion !== ARCHIVE_SCHEMA_VERSION) ||
        parsed.id !== id ||
        !isRecord(parsed.career) ||
        !Array.isArray(parsed.checkpoints) ||
        !Array.isArray(parsed.ledger)
      ) {
        return {
          detail: `Archive payload does not match a supported schema: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      if (
        parsed.schemaVersion === 2 &&
        (!isRecord(parsed.economy) ||
          parsed.economyPolicyVersion !==
            ECONOMY_POLICY_VERSION)
      ) {
        return {
          detail: `Archive payload does not match schema version 2: ${id}`,
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

      let economy: CareerEconomyProjection;

      try {
        economy = createCareerEconomyProjection(career);
      } catch {
        return {
          detail: `Archive career cannot produce an economy projection: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      if (
        parsed.schemaVersion === 2 &&
        stableStringify(economy) !==
        stableStringify(parsed.economy)
      ) {
        return {
          detail: `Archive economy does not match career: ${id}`,
          raw,
          status: "corrupt",
        };
      }

      return {
        career,
        checkpoints,
        economy,
        economyPolicyVersion: ECONOMY_POLICY_VERSION,
        entry,
        ledger,
        sourceSchemaVersion: parsed.schemaVersion,
        status: "ready",
      };
    },

    rename(id, nextDisplayName) {
      const index = readRepositoryIndex();

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

      const index = readRepositoryIndex();

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
      const index = readRepositoryIndex();

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
  const economy = createCareerEconomyProjection(career);

  return {
    contentVersion: career.contentVersion,
    createdAt: input.createdAt,
    displayName: input.displayName,
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
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
    totalIncome: economy.totalIncome,
    updatedAt: input.updatedAt,
  };
}

function readIndex(
  storage: ArchiveStorageLike,
  legacyCache: LegacyArchiveIndexCache,
): IndexReadResult {
  let raw: string | null;

  try {
    raw = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);

    if (raw === null) {
      raw = storage.getItem(
        LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
      );
    }
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

  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
    return {
      detail: "Archive index does not match a supported schema",
      ok: false,
      reason: "corrupt_index",
    };
  }

  let entries: CareerArchiveEntry[];

  if (parsed.schemaVersion === ARCHIVE_SCHEMA_VERSION) {
    legacyCache.entries = null;
    legacyCache.raw = null;

    if (!parsed.entries.every(isArchiveEntry)) {
      return {
        detail: "Archive index does not match schema version 2",
        ok: false,
        reason: "corrupt_index",
      };
    }
    entries = parsed.entries as CareerArchiveEntry[];
  } else if (parsed.schemaVersion === 1) {
    if (!parsed.entries.every(isLegacyArchiveEntry)) {
      return {
        detail: "Archive index does not match schema version 1",
        ok: false,
        reason: "corrupt_index",
      };
    }

    if (
      legacyCache.raw === raw &&
      legacyCache.entries !== null
    ) {
      entries = [...legacyCache.entries];
    } else {
      // Retained v1 payloads are immutable rollback inputs. Cache their
      // derived list metadata until the exact v1 index bytes change.
      entries = [];

      for (const legacyEntry of parsed.entries) {
        const economy = readLegacyArchiveEconomy(
          storage,
          legacyEntry.id,
        );

        if (!economy.ok) {
          return economy;
        }

        entries.push({
          ...(legacyEntry as LegacyCareerArchiveEntry),
          economyPolicyVersion: ECONOMY_POLICY_VERSION,
          totalIncome: economy.economy.totalIncome,
        });
      }

      legacyCache.entries = entries;
      legacyCache.raw = raw;
    }
  } else {
    return {
      detail: `Archive index has unsupported schema version: ${String(parsed.schemaVersion)}`,
      ok: false,
      reason: "corrupt_index",
    };
  }

  if (
    new Set(
      entries.map((entry: CareerArchiveEntry) => entry.id),
    ).size !== entries.length
  ) {
    return {
      detail: "Archive index contains duplicate IDs",
      ok: false,
      reason: "corrupt_index",
    };
  }

  return {
    entries,
    ok: true,
  };
}

function readLegacyArchiveEconomy(
  storage: ArchiveStorageLike,
  id: string,
):
  | {
      readonly economy: CareerEconomyProjection;
      readonly ok: true;
    }
  | ArchiveUnavailable
  | ArchiveCorruptIndex {
  let raw: string | null;

  try {
    raw = storage.getItem(
      legacyArchivePayloadStorageKey(id),
    );
  } catch (error) {
    return unavailable(error);
  }

  if (raw === null) {
    return {
      detail: `Legacy archive payload is missing: ${id}`,
      ok: false,
      reason: "corrupt_index",
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 1 ||
      parsed.id !== id ||
      !isRecord(parsed.career)
    ) {
      throw new Error("payload does not match schema version 1");
    }

    return {
      economy: createCareerEconomyProjection(
        parsed.career as unknown as ClassicCareerState,
      ),
      ok: true,
    };
  } catch (error) {
    return {
      detail: `Legacy archive economy backfill failed for ${id}: ${readableError(error)}`,
      ok: false,
      reason: "corrupt_index",
    };
  }
}

function serializeIndex(
  entries: readonly CareerArchiveEntry[],
): string {
  const envelope: ArchiveIndexEnvelopeV2 = {
    entries,
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
  };

  return JSON.stringify(envelope);
}

function serializePayload(
  id: string,
  career: ClassicCareerState,
): string {
  const envelope: ArchivePayloadEnvelopeV2 = {
    career,
    checkpoints: createDecisionCheckpoints(career),
    economy: createCareerEconomyProjection(career),
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    id,
    ledger: createCareerLedger(career),
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
  };

  return JSON.stringify(envelope);
}

function normalizeDeletedArchivePayload(
  id: string,
  raw: string,
): string {
  const parsed = JSON.parse(raw) as unknown;

  if (
    isRecord(parsed) &&
    parsed.schemaVersion === 1 &&
    parsed.id === id &&
    isRecord(parsed.career)
  ) {
    return serializePayload(
      id,
      parsed.career as unknown as ClassicCareerState,
    );
  }

  return raw;
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
    value.economyPolicyVersion === ECONOMY_POLICY_VERSION &&
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
    typeof value.totalIncome === "number" &&
    Number.isSafeInteger(value.totalIncome) &&
    value.totalIncome >= 0 &&
    typeof value.updatedAt === "string"
  );
}

function isLegacyArchiveEntry(
  value: unknown,
): value is LegacyCareerArchiveEntry {
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
