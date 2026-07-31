import type { ClassicCareerState } from "../../domain/classicEngine";
import { stableStringify } from "../../domain/deterministicHash";
import {
  ARCHIVE_CAPACITY,
  ARCHIVE_INDEX_STORAGE_KEY,
  ARCHIVE_PAYLOAD_STORAGE_PREFIX,
  LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
  LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX,
  archivePayloadStorageKey,
  createArchiveRepository,
  legacyArchivePayloadStorageKey,
  type ArchiveStorageLike,
} from "../archiveRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
} from "../classicSessionRepository";
import type { StorageLike } from "../careerRepository";

export const ECONOMY_MIGRATION_SCHEMA_VERSION = 1 as const;
export const ECONOMY_MIGRATION_BACKUP_KEY =
  "football-life-reborn:migration:economy-v1-to-v2:backup" as const;
export const ECONOMY_MIGRATION_RECEIPT_KEY =
  "football-life-reborn:migration:economy-v1-to-v2:receipt" as const;

type EconomyMigrationSource = {
  readonly key: string;
  readonly raw: string | null;
};

type EconomyMigrationBackupV1 = {
  readonly createdAt: string;
  readonly schemaVersion:
    typeof ECONOMY_MIGRATION_SCHEMA_VERSION;
  readonly sourceHash: string;
  readonly sources: readonly EconomyMigrationSource[];
};

export type EconomyMigrationReport = {
  readonly activeSession:
    | "absent"
    | "current_preserved"
    | "migrated";
  readonly migratedArchiveIds: readonly string[];
  readonly preservedArchiveIds: readonly string[];
  readonly retainedLegacyKeys: readonly string[];
  readonly sourceHash: string;
};

type EconomyMigrationReceiptV1 = {
  readonly backupKey: typeof ECONOMY_MIGRATION_BACKUP_KEY;
  readonly completedAt: string;
  readonly report: EconomyMigrationReport;
  readonly schemaVersion:
    typeof ECONOMY_MIGRATION_SCHEMA_VERSION;
};

type EconomyMigrationOptions = {
  readonly now?: () => string;
};

export type EconomyMigrationResult =
  | { readonly status: "empty" }
  | {
      readonly backupKey:
        typeof ECONOMY_MIGRATION_BACKUP_KEY;
      readonly report: EconomyMigrationReport;
      readonly status: "already_migrated" | "migrated";
    }
  | {
      readonly backupKey?:
        typeof ECONOMY_MIGRATION_BACKUP_KEY;
      readonly reason: string;
      readonly sourceKey: string;
      readonly status: "invalid_source" | "invalid_target";
    }
  | {
      readonly backupKey?:
        typeof ECONOMY_MIGRATION_BACKUP_KEY;
      readonly phase:
        | "backup"
        | "read"
        | "receipt"
        | "rollback"
        | "write";
      readonly reason: string;
      readonly rolledBack?: boolean;
      readonly status: "unavailable";
    };

type ValidatedEconomySources = {
  readonly activeCareer: ClassicCareerState | null;
  readonly archives: readonly {
    readonly career: ClassicCareerState;
    readonly createdAt: string;
    readonly displayName: string;
    readonly id: string;
    readonly updatedAt: string;
  }[];
  readonly hasArchiveIndex: boolean;
};

type TargetSnapshot = {
  readonly key: string;
  readonly raw: string | null;
};

export function migrateEconomyStorageV1ToV2(
  storage: ArchiveStorageLike,
  options: EconomyMigrationOptions = {},
): EconomyMigrationResult {
  const receipt = readEconomyMigrationReceipt(storage);

  if (receipt.status === "unavailable") {
    return {
      phase: "read",
      reason: receipt.reason,
      status: "unavailable",
    };
  }

  if (receipt.status === "invalid") {
    return {
      reason: receipt.reason,
      sourceKey: ECONOMY_MIGRATION_RECEIPT_KEY,
      status: "invalid_target",
    };
  }

  if (receipt.status === "ready") {
    return {
      backupKey: receipt.receipt.backupKey,
      report: receipt.receipt.report,
      status: "already_migrated",
    };
  }

  const liveSources = collectEconomyMigrationSources(storage);

  if (!liveSources.ok) {
    return {
      phase: "read",
      reason: liveSources.reason,
      status: "unavailable",
    };
  }

  if (liveSources.sources.length === 0) {
    return { status: "empty" };
  }

  const existingBackup = readEconomyMigrationBackup(storage);

  if (existingBackup.status === "unavailable") {
    return {
      phase: "read",
      reason: existingBackup.reason,
      status: "unavailable",
    };
  }

  if (existingBackup.status === "invalid") {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      reason: existingBackup.reason,
      sourceKey: ECONOMY_MIGRATION_BACKUP_KEY,
      status: "invalid_source",
    };
  }

  let backup: EconomyMigrationBackupV1;

  if (existingBackup.status === "ready") {
    if (
      stableStringify(existingBackup.backup.sources) !==
      stableStringify(liveSources.sources)
    ) {
      return {
        backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
        reason:
          "Legacy economy sources changed after the migration backup was created",
        sourceKey: ECONOMY_MIGRATION_BACKUP_KEY,
        status: "invalid_source",
      };
    }

    backup = existingBackup.backup;
  } else {
    const now =
      options.now ?? (() => new Date().toISOString());
    const createdAt = now();

    if (!isIsoTimestamp(createdAt)) {
      return {
        phase: "backup",
        reason: `Economy migration clock returned an invalid timestamp: ${createdAt}`,
        status: "unavailable",
      };
    }

    backup = {
      createdAt,
      schemaVersion: ECONOMY_MIGRATION_SCHEMA_VERSION,
      sourceHash: hashRaw(
        stableStringify(liveSources.sources),
      ),
      sources: liveSources.sources,
    };

    try {
      storage.setItem(
        ECONOMY_MIGRATION_BACKUP_KEY,
        JSON.stringify(backup),
      );
    } catch (error) {
      return {
        phase: "backup",
        reason: readableError(error),
        status: "unavailable",
      };
    }
  }

  const validated = validateEconomyMigrationSources(backup);

  if (!validated.ok) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      reason: validated.reason,
      sourceKey: validated.sourceKey,
      status: "invalid_source",
    };
  }

  const currentStorage = createCurrentEconomyStorage(
    storage,
  );
  const currentSession =
    createClassicSessionRepository(currentStorage);
  const currentSessionRaw = safeGet(
    storage,
    ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  );

  if (!currentSessionRaw.ok) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      phase: "read",
      reason: currentSessionRaw.reason,
      status: "unavailable",
    };
  }

  let activeSession:
    EconomyMigrationReport["activeSession"] = "absent";
  let shouldWriteActive = false;

  if (validated.value.activeCareer !== null) {
    if (currentSessionRaw.raw === null) {
      activeSession = "migrated";
      shouldWriteActive = true;
    } else {
      const loaded = currentSession.load();

      if (
        loaded.status !== "ready" ||
        loaded.sourceSchemaVersion !== 2
      ) {
        return {
          backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
          reason:
            loaded.status === "ready"
              ? "Current active session did not resolve as schema version 2"
              : "reason" in loaded
                ? loaded.reason
                : "Current active session is invalid",
          sourceKey: ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
          status: "invalid_target",
        };
      }

      activeSession = "current_preserved";
    }
  }

  const currentArchive =
    createArchiveRepository(currentStorage);
  const currentList = currentArchive.list();

  if (!currentList.ok) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      reason: currentList.detail,
      sourceKey: ARCHIVE_INDEX_STORAGE_KEY,
      status: "invalid_target",
    };
  }

  const currentIds = new Set(
    currentList.entries.map((entry) => entry.id),
  );
  const missingArchives: ValidatedEconomySources["archives"][number][] =
    [];
  const preservedArchiveIds: string[] = [];

  for (const archive of validated.value.archives) {
    if (!currentIds.has(archive.id)) {
      missingArchives.push(archive);
      continue;
    }

    const loaded = currentArchive.load(archive.id);

    if (
      loaded.status !== "ready" ||
      stableStringify(loaded.career) !==
        stableStringify(archive.career)
    ) {
      return {
        backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
        reason: `Current archive conflicts with legacy archive: ${archive.id}`,
        sourceKey: archivePayloadStorageKey(archive.id),
        status: "invalid_target",
      };
    }

    preservedArchiveIds.push(archive.id);
  }

  if (
    currentList.entries.length + missingArchives.length >
    ARCHIVE_CAPACITY
  ) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      reason: `Economy migration would exceed archive capacity ${ARCHIVE_CAPACITY}`,
      sourceKey: ARCHIVE_INDEX_STORAGE_KEY,
      status: "invalid_target",
    };
  }

  const currentArchiveIndexRaw = safeGet(
    storage,
    ARCHIVE_INDEX_STORAGE_KEY,
  );

  if (!currentArchiveIndexRaw.ok) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      phase: "read",
      reason: currentArchiveIndexRaw.reason,
      status: "unavailable",
    };
  }

  const initializeArchiveIndex =
    validated.value.hasArchiveIndex &&
    currentArchiveIndexRaw.raw === null;
  const targetKeys = new Set<string>([
    ECONOMY_MIGRATION_RECEIPT_KEY,
  ]);

  if (shouldWriteActive) {
    targetKeys.add(ACTIVE_CLASSIC_SESSION_STORAGE_KEY);
  }

  if (
    initializeArchiveIndex ||
    missingArchives.length > 0
  ) {
    targetKeys.add(ARCHIVE_INDEX_STORAGE_KEY);
  }

  for (const archive of missingArchives) {
    targetKeys.add(archivePayloadStorageKey(archive.id));
  }

  const snapshots = readTargetSnapshots(
    storage,
    [...targetKeys],
  );

  if (!snapshots.ok) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      phase: "read",
      reason: snapshots.reason,
      status: "unavailable",
    };
  }

  const report: EconomyMigrationReport = {
    activeSession,
    migratedArchiveIds: missingArchives.map(
      (archive) => archive.id,
    ),
    preservedArchiveIds,
    retainedLegacyKeys: backup.sources.flatMap(
      (source) =>
        source.raw === null ? [] : [source.key],
    ),
    sourceHash: backup.sourceHash,
  };

  try {
    if (
      shouldWriteActive &&
      validated.value.activeCareer !== null
    ) {
      const saved = currentSession.save(
        validated.value.activeCareer,
      );

      if (!saved.ok) {
        throw new Error(saved.reason);
      }
    }

    if (initializeArchiveIndex) {
      storage.setItem(
        ARCHIVE_INDEX_STORAGE_KEY,
        JSON.stringify({
          entries: [],
          schemaVersion: 2,
        }),
      );
    }

    for (const archive of missingArchives) {
      const created = currentArchive.create({
        career: archive.career,
        createdAt: archive.createdAt,
        displayName: archive.displayName,
        id: archive.id,
        updatedAt: archive.updatedAt,
      });

      if (!created.ok) {
        throw new Error(
          created.reason === "unavailable" ||
            created.reason === "corrupt_index"
            ? created.detail
            : `Archive migration rejected ${archive.id}: ${created.reason}`,
        );
      }
    }

    verifyEconomyMigrationWrites(
      currentSession,
      currentArchive,
      validated.value,
      shouldWriteActive,
      missingArchives,
    );
  } catch (error) {
    return migrationWriteFailure(
      storage,
      snapshots.snapshots,
      error,
      "write",
    );
  }

  const migrationReceipt: EconomyMigrationReceiptV1 = {
    backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
    completedAt: backup.createdAt,
    report,
    schemaVersion: ECONOMY_MIGRATION_SCHEMA_VERSION,
  };

  try {
    storage.setItem(
      ECONOMY_MIGRATION_RECEIPT_KEY,
      JSON.stringify(migrationReceipt),
    );
  } catch (error) {
    return migrationWriteFailure(
      storage,
      snapshots.snapshots,
      error,
      "receipt",
    );
  }

  return {
    backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
    report,
    status: "migrated",
  };
}

function collectEconomyMigrationSources(
  storage: ArchiveStorageLike,
):
  | {
      readonly ok: true;
      readonly sources: readonly EconomyMigrationSource[];
    }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const active = safeGet(
    storage,
    LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  );

  if (!active.ok) {
    return active;
  }

  const archiveIndex = safeGet(
    storage,
    LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
  );

  if (!archiveIndex.ok) {
    return archiveIndex;
  }

  const sources: EconomyMigrationSource[] = [];

  if (active.raw !== null) {
    sources.push({
      key: LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      raw: active.raw,
    });
  }

  if (archiveIndex.raw !== null) {
    sources.push({
      key: LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
      raw: archiveIndex.raw,
    });

    for (const id of extractLegacyArchiveIds(
      archiveIndex.raw,
    )) {
      const key = legacyArchivePayloadStorageKey(id);
      const payload = safeGet(storage, key);

      if (!payload.ok) {
        return payload;
      }

      sources.push({ key, raw: payload.raw });
    }
  }

  return {
    ok: true,
    sources: sources.sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
  };
}

function extractLegacyArchiveIds(
  raw: string,
): readonly string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.entries)
    ) {
      return [];
    }

    return [
      ...new Set(
        parsed.entries.flatMap((entry) =>
          isRecord(entry) &&
          typeof entry.id === "string" &&
          entry.id.length <= 80
            ? [entry.id]
            : [],
        ),
      ),
    ].sort();
  } catch {
    return [];
  }
}

function readEconomyMigrationBackup(
  storage: ArchiveStorageLike,
):
  | { readonly status: "empty" }
  | {
      readonly backup: EconomyMigrationBackupV1;
      readonly status: "ready";
    }
  | {
      readonly reason: string;
      readonly status: "invalid" | "unavailable";
    } {
  const result = safeGet(
    storage,
    ECONOMY_MIGRATION_BACKUP_KEY,
  );

  if (!result.ok) {
    return {
      reason: result.reason,
      status: "unavailable",
    };
  }

  if (result.raw === null) {
    return { status: "empty" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(result.raw);
  } catch {
    return {
      reason: "Economy migration backup is not valid JSON",
      status: "invalid",
    };
  }

  if (!isEconomyMigrationBackup(parsed)) {
    return {
      reason:
        "Economy migration backup does not match schema version 1",
      status: "invalid",
    };
  }

  if (
    hashRaw(stableStringify(parsed.sources)) !==
    parsed.sourceHash
  ) {
    return {
      reason:
        "Economy migration backup source hash does not match",
      status: "invalid",
    };
  }

  return { backup: parsed, status: "ready" };
}

function readEconomyMigrationReceipt(
  storage: ArchiveStorageLike,
):
  | { readonly status: "empty" }
  | {
      readonly receipt: EconomyMigrationReceiptV1;
      readonly status: "ready";
    }
  | {
      readonly reason: string;
      readonly status: "invalid" | "unavailable";
    } {
  const result = safeGet(
    storage,
    ECONOMY_MIGRATION_RECEIPT_KEY,
  );

  if (!result.ok) {
    return {
      reason: result.reason,
      status: "unavailable",
    };
  }

  if (result.raw === null) {
    return { status: "empty" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(result.raw);
  } catch {
    return {
      reason: "Economy migration receipt is not valid JSON",
      status: "invalid",
    };
  }

  return isEconomyMigrationReceipt(parsed)
    ? { receipt: parsed, status: "ready" }
    : {
        reason:
          "Economy migration receipt does not match schema version 1",
        status: "invalid",
      };
}

function validateEconomyMigrationSources(
  backup: EconomyMigrationBackupV1,
):
  | {
      readonly ok: true;
      readonly value: ValidatedEconomySources;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly sourceKey: string;
    } {
  const sourceMap = new Map(
    backup.sources.map((source) => [
      source.key,
      source.raw,
    ]),
  );
  const sourceStorage =
    createLegacyEconomyStorage(sourceMap);
  let activeCareer: ClassicCareerState | null = null;

  if (
    sourceMap.has(
      LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
    )
  ) {
    const active =
      createClassicSessionRepository(
        sourceStorage,
      ).load();

    if (
      active.status !== "ready" ||
      active.sourceSchemaVersion !== 1
    ) {
      return {
        ok: false,
        reason:
          active.status === "ready"
            ? "Legacy active session did not resolve as schema version 1"
            : "reason" in active
              ? active.reason
              : "Legacy active session is empty",
        sourceKey:
          LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      };
    }

    activeCareer = active.state;
  }

  const hasArchiveIndex = sourceMap.has(
    LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
  );
  const archives: ValidatedEconomySources["archives"][number][] =
    [];

  if (hasArchiveIndex) {
    const repository =
      createArchiveRepository(sourceStorage);
    const listed = repository.list();

    if (!listed.ok) {
      return {
        ok: false,
        reason: listed.detail,
        sourceKey: legacyArchiveFailureKey(
          backup.sources,
          listed.detail,
        ),
      };
    }

    for (const entry of listed.entries) {
      const loaded = repository.load(entry.id);

      if (
        loaded.status !== "ready" ||
        loaded.sourceSchemaVersion !== 1
      ) {
        return {
          ok: false,
          reason:
            loaded.status === "ready"
              ? `Legacy archive ${entry.id} did not resolve as schema version 1`
              : loaded.status === "unavailable"
                ? loaded.reason
                : loaded.status === "corrupt"
                  ? loaded.detail
                  : `Legacy archive is missing: ${entry.id}`,
          sourceKey: legacyArchivePayloadStorageKey(
            entry.id,
          ),
        };
      }

      archives.push({
        career: loaded.career,
        createdAt: entry.createdAt,
        displayName: entry.displayName,
        id: entry.id,
        updatedAt: entry.updatedAt,
      });
    }
  }

  return {
    ok: true,
    value: {
      activeCareer,
      archives,
      hasArchiveIndex,
    },
  };
}

function createLegacyEconomyStorage(
  sources: ReadonlyMap<string, string | null>,
): ArchiveStorageLike {
  return {
    getItem(key) {
      if (
        key === ACTIVE_CLASSIC_SESSION_STORAGE_KEY ||
        key === ARCHIVE_INDEX_STORAGE_KEY ||
        key.startsWith(ARCHIVE_PAYLOAD_STORAGE_PREFIX)
      ) {
        return null;
      }

      return sources.get(key) ?? null;
    },
    removeItem() {
      throw new Error(
        "Migration source validation is read-only",
      );
    },
    setItem() {
      throw new Error(
        "Migration source validation is read-only",
      );
    },
  };
}

function createCurrentEconomyStorage(
  storage: ArchiveStorageLike,
): ArchiveStorageLike {
  return {
    getItem(key) {
      if (
        key ===
          LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY ||
        key === LEGACY_ARCHIVE_INDEX_STORAGE_KEY ||
        key.startsWith(
          LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX,
        )
      ) {
        return null;
      }

      return storage.getItem(key);
    },
    removeItem(key) {
      storage.removeItem(key);
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
  };
}

function legacyArchiveFailureKey(
  sources: readonly EconomyMigrationSource[],
  detail: string,
): string {
  const payload = sources.find(
    (source) =>
      source.key.startsWith(
        LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX,
      ) &&
      detail.includes(
        source.key.slice(
          LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX.length,
        ),
      ),
  );

  return (
    payload?.key ?? LEGACY_ARCHIVE_INDEX_STORAGE_KEY
  );
}

function readTargetSnapshots(
  storage: ArchiveStorageLike,
  keys: readonly string[],
):
  | {
      readonly ok: true;
      readonly snapshots: readonly TargetSnapshot[];
    }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const snapshots: TargetSnapshot[] = [];

  for (const key of keys) {
    const value = safeGet(storage, key);

    if (!value.ok) {
      return value;
    }

    snapshots.push({ key, raw: value.raw });
  }

  return { ok: true, snapshots };
}

function verifyEconomyMigrationWrites(
  currentSession: ReturnType<
    typeof createClassicSessionRepository
  >,
  currentArchive: ReturnType<
    typeof createArchiveRepository
  >,
  sources: ValidatedEconomySources,
  verifyActive: boolean,
  migratedArchives: readonly ValidatedEconomySources["archives"][number][],
): void {
  if (verifyActive && sources.activeCareer !== null) {
    const active = currentSession.load();

    if (
      active.status !== "ready" ||
      active.sourceSchemaVersion !== 2 ||
      stableStringify(active.state) !==
        stableStringify(sources.activeCareer)
    ) {
      throw new Error(
        "Migrated active session failed v2 read-back",
      );
    }
  }

  for (const archive of migratedArchives) {
    const loaded = currentArchive.load(archive.id);

    if (
      loaded.status !== "ready" ||
      loaded.sourceSchemaVersion !== 2 ||
      stableStringify(loaded.career) !==
        stableStringify(archive.career)
    ) {
      throw new Error(
        `Migrated archive failed v2 read-back: ${archive.id}`,
      );
    }
  }
}

function migrationWriteFailure(
  storage: ArchiveStorageLike,
  snapshots: readonly TargetSnapshot[],
  error: unknown,
  phase: "receipt" | "write",
): Extract<
  EconomyMigrationResult,
  { readonly status: "unavailable" }
> {
  const rollbackErrors: string[] = [];

  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (snapshot.raw === null) {
        storage.removeItem(snapshot.key);
      } else {
        storage.setItem(snapshot.key, snapshot.raw);
      }
    } catch (rollbackError) {
      rollbackErrors.push(
        `${snapshot.key}: ${readableError(rollbackError)}`,
      );
    }
  }

  if (rollbackErrors.length > 0) {
    return {
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      phase: "rollback",
      reason: `${readableError(error)}; rollback failed: ${rollbackErrors.join("; ")}`,
      rolledBack: false,
      status: "unavailable",
    };
  }

  return {
    backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
    phase,
    reason: readableError(error),
    rolledBack: true,
    status: "unavailable",
  };
}

function safeGet(
  storage: ArchiveStorageLike,
  key: string,
):
  | {
      readonly ok: true;
      readonly raw: string | null;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  try {
    return { ok: true, raw: storage.getItem(key) };
  } catch (error) {
    return { ok: false, reason: readableError(error) };
  }
}

function isEconomyMigrationBackup(
  value: unknown,
): value is EconomyMigrationBackupV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !==
      ECONOMY_MIGRATION_SCHEMA_VERSION ||
    typeof value.createdAt !== "string" ||
    !isIsoTimestamp(value.createdAt) ||
    typeof value.sourceHash !== "string" ||
    !/^[0-9a-f]{8}$/.test(value.sourceHash) ||
    !Array.isArray(value.sources) ||
    !value.sources.every(isEconomyMigrationSource)
  ) {
    return false;
  }

  const keys = value.sources.map((source) => source.key);

  return (
    new Set(keys).size === keys.length &&
    keys.every(
      (key, index) =>
        index === 0 ||
        keys[index - 1]!.localeCompare(key) < 0,
    )
  );
}

function isEconomyMigrationSource(
  value: unknown,
): value is EconomyMigrationSource {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    (value.key ===
      LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY ||
      value.key === LEGACY_ARCHIVE_INDEX_STORAGE_KEY ||
      value.key.startsWith(
        LEGACY_ARCHIVE_PAYLOAD_STORAGE_PREFIX,
      )) &&
    (value.raw === null || typeof value.raw === "string")
  );
}

function isEconomyMigrationReceipt(
  value: unknown,
): value is EconomyMigrationReceiptV1 {
  return (
    isRecord(value) &&
    value.schemaVersion ===
      ECONOMY_MIGRATION_SCHEMA_VERSION &&
    value.backupKey === ECONOMY_MIGRATION_BACKUP_KEY &&
    typeof value.completedAt === "string" &&
    isIsoTimestamp(value.completedAt) &&
    isEconomyMigrationReport(value.report)
  );
}

function isEconomyMigrationReport(
  value: unknown,
): value is EconomyMigrationReport {
  return (
    isRecord(value) &&
    (value.activeSession === "absent" ||
      value.activeSession === "current_preserved" ||
      value.activeSession === "migrated") &&
    Array.isArray(value.migratedArchiveIds) &&
    value.migratedArchiveIds.every(
      (item) => typeof item === "string",
    ) &&
    Array.isArray(value.preservedArchiveIds) &&
    value.preservedArchiveIds.every(
      (item) => typeof item === "string",
    ) &&
    Array.isArray(value.retainedLegacyKeys) &&
    value.retainedLegacyKeys.every(
      (item) => typeof item === "string",
    ) &&
    typeof value.sourceHash === "string" &&
    /^[0-9a-f]{8}$/.test(value.sourceHash)
  );
}

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
    | typeof ACTIVE_CLASSIC_SESSION_STORAGE_KEY
    | typeof LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY;
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
    (value.sourceKey ===
      ACTIVE_CLASSIC_SESSION_STORAGE_KEY ||
      value.sourceKey ===
        LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY) &&
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
