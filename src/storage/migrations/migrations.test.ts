import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  replayClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
} from "../../domain/classicEngine";
import {
  createCareerBranch,
  createDecisionCheckpoints,
} from "../../domain/checkpoint";
import { stableStringify } from "../../domain/deterministicHash";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";
import { createCareerLedger } from "../../domain/ledger";
import {
  ARCHIVE_INDEX_STORAGE_KEY,
  LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
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
import {
  ARCHIVE_MIGRATION_RECEIPT_KEY,
  ARCHIVE_MIGRATION_STAGE_KEY,
  ECONOMY_MIGRATION_BACKUP_KEY,
  ECONOMY_MIGRATION_RECEIPT_KEY,
  migrateEconomyStorageV1ToV2,
  migrateClassicSessionToArchive,
  type ArchiveMigrationStep,
} from "./migrations";

class MemoryStorage implements ArchiveStorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FailingStorage extends MemoryStorage {
  failNextSetFor: string | null = null;

  override setItem(key: string, value: string): void {
    if (this.failNextSetFor === key) {
      this.failNextSetFor = null;
      throw new Error(`quota exceeded: ${key}`);
    }

    super.setItem(key, value);
  }
}

describe("archive migrations", () => {
  it.each([
    "before_copy",
    "after_copy",
    "after_index_swap",
  ] as const)(
    "recovers idempotently after interruption at %s",
    (interruption) => {
      const storage = new MemoryStorage();
      const legacyCareer = saveLegacyCareer(storage);
      const legacyRaw = storage.getItem(
        ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      );
      const before = snapshot(storage);
      const interruptOnce = createInterruptOnce(interruption);

      expect(() =>
        migrateClassicSessionToArchive(storage, {
          now: () => "2026-07-30T17:00:00.000Z",
          onStep: interruptOnce,
        }),
      ).toThrow(`interrupt:${interruption}`);
      expect(
        storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
      ).toBe(legacyRaw);

      if (interruption === "before_copy") {
        expect(snapshot(storage)).toEqual(before);
      } else {
        const stageRaw = storage.getItem(
          ARCHIVE_MIGRATION_STAGE_KEY,
        );
        expect(stageRaw).not.toBeNull();
        expect(stageRaw).toContain(JSON.stringify(legacyRaw));
      }

      if (interruption === "after_index_swap") {
        expect(
          storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
        ).not.toBeNull();
        expect(
          storage.getItem(ARCHIVE_MIGRATION_RECEIPT_KEY),
        ).toBeNull();
      } else {
        expect(
          storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
        ).toBeNull();
      }

      const recovered = migrateClassicSessionToArchive(
        storage,
        {
          now: () =>
            interruption === "before_copy"
              ? "2026-07-30T17:01:00.000Z"
              : "must-not-replace-staged-time",
        },
      );
      expect(recovered).toMatchObject({
        archiveId: expect.stringMatching(/^legacy-[0-9a-f]{8}$/),
        status:
          interruption === "after_index_swap"
            ? "already_migrated"
            : "migrated",
      });

      if (
        recovered.status !== "migrated" &&
        recovered.status !== "already_migrated"
      ) {
        throw new Error("Expected recovered migration");
      }

      const repository = createArchiveRepository(storage);
      const loaded = repository.load(recovered.archiveId);
      expect(loaded.status).toBe("ready");

      if (loaded.status !== "ready") {
        throw new Error("Expected migrated archive");
      }

      expect(JSON.stringify(loaded.career)).toBe(
        JSON.stringify(legacyCareer),
      );
      expect(
        storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
      ).toBe(legacyRaw);
      expect(
        storage.getItem(ARCHIVE_MIGRATION_RECEIPT_KEY),
      ).not.toBeNull();
    },
  );

  it("is byte-for-byte stable when every migration is run twice", () => {
    const storage = new MemoryStorage();
    saveLegacyCareer(storage);

    expect(
      migrateClassicSessionToArchive(storage, {
        now: () => "2026-07-30T18:00:00.000Z",
      }),
    ).toMatchObject({ status: "migrated" });
    const afterFirst = snapshot(storage);
    expect(
      migrateClassicSessionToArchive(storage, {
        now: () => "must-not-be-used",
      }),
    ).toMatchObject({ status: "already_migrated" });
    expect(snapshot(storage)).toEqual(afterFirst);
  });

  it("keeps invalid legacy bytes copied and recoverable without creating an archive", () => {
    const storage = new MemoryStorage();
    const invalidRaw = '{"schemaVersion":1,"choiceLog":';
    storage.setItem(
      ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      invalidRaw,
    );

    expect(
      migrateClassicSessionToArchive(storage, {
        now: () => "2026-07-30T19:00:00.000Z",
      }),
    ).toMatchObject({
      reason: expect.stringContaining("not valid JSON"),
      status: "invalid_source",
    });
    expect(
      storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
    ).toBe(invalidRaw);
    expect(
      storage.getItem(ARCHIVE_MIGRATION_STAGE_KEY),
    ).toContain(JSON.stringify(invalidRaw));
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBeNull();
    expect(
      storage.getItem(ARCHIVE_MIGRATION_RECEIPT_KEY),
    ).toBeNull();
  });

  it("returns empty without writing when no legacy session exists", () => {
    const storage = new MemoryStorage();

    expect(
      migrateClassicSessionToArchive(storage),
    ).toEqual({ status: "empty" });
    expect(storage.values.size).toBe(0);
  });

  it("resumes a pre-v2 staged archive migration whose source key is the legacy active-session key", () => {
    const storage = new MemoryStorage();
    const fixture = seedEconomyV1(storage);
    storage.removeItem(LEGACY_ARCHIVE_INDEX_STORAGE_KEY);
    storage.removeItem(
      legacyArchivePayloadStorageKey("legacy-branch"),
    );
    const sourceHash = hashLegacyRaw(fixture.activeRaw);
    storage.setItem(
      ARCHIVE_MIGRATION_STAGE_KEY,
      JSON.stringify({
        archiveId: `legacy-${sourceHash}`,
        createdAt: "2026-07-30T19:30:00.000Z",
        schemaVersion: 1,
        sourceHash,
        sourceKey:
          LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
        sourceRaw: fixture.activeRaw,
      }),
    );

    expect(
      migrateClassicSessionToArchive(storage),
    ).toMatchObject({
      archiveId: `legacy-${sourceHash}`,
      status: "migrated",
    });
    expect(
      createArchiveRepository(storage).load(
        `legacy-${sourceHash}`,
      ),
    ).toMatchObject({
      sourceSchemaVersion: 3,
      status: "ready",
    });
    expect(
      storage.getItem(
        LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      ),
    ).toBe(fixture.activeRaw);
  });
});

describe("economy storage v1 to v2 migration", () => {
  it("backs up and migrates a v1 active session plus a branched archive without deleting legacy keys", () => {
    const storage = new MemoryStorage();
    const fixture = seedEconomyV1(storage);
    const legacyBefore = snapshotLegacyEconomy(storage);

    const result = migrateEconomyStorageV1ToV2(storage, {
      now: () => "2026-07-31T06:00:00.000Z",
    });

    expect(result).toMatchObject({
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      report: {
        activeSession: "migrated",
        migratedArchiveIds: ["legacy-branch"],
        retainedLegacyKeys: expect.arrayContaining([
          LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
          LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
          legacyArchivePayloadStorageKey(
            "legacy-branch",
          ),
        ]),
      },
      status: "migrated",
    });
    expect(snapshotLegacyEconomy(storage)).toEqual(
      legacyBefore,
    );

    const backupRaw = storage.getItem(
      ECONOMY_MIGRATION_BACKUP_KEY,
    );
    expect(backupRaw).not.toBeNull();
    expect(backupRaw).toContain(
      JSON.stringify(fixture.activeRaw),
    );
    expect(backupRaw).toContain(
      JSON.stringify(fixture.archivePayloadRaw),
    );
    expect(
      storage.getItem(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).not.toBeNull();

    expect(
      JSON.parse(
        storage.getItem(
          ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
        )!,
      ),
    ).toMatchObject({
      economyPolicyVersion:
        "2026-07-31-economy-v1",
      schemaVersion: 3,
    });
    const active =
      createClassicSessionRepository(storage).load();
    expect(active).toMatchObject({
      sourceSchemaVersion: 3,
      status: "ready",
    });
    if (active.status !== "ready") {
      throw new Error("Expected migrated active session");
    }
    expect(stableStringify(active.state)).toBe(
      stableStringify(fixture.activeCareer),
    );

    const archive =
      createArchiveRepository(storage).load(
        "legacy-branch",
      );
    expect(archive).toMatchObject({
      economy:
        createCareerEconomyProjection(
          fixture.branchCareer,
        ),
      sourceSchemaVersion: 3,
      status: "ready",
    });
    if (archive.status !== "ready") {
      throw new Error("Expected migrated branch archive");
    }
    expect(stableStringify(archive.career)).toBe(
      stableStringify(fixture.branchCareer),
    );
  });

  it("is byte-for-byte idempotent after the migration receipt is written", () => {
    const storage = new MemoryStorage();
    seedEconomyV1(storage);

    expect(
      migrateEconomyStorageV1ToV2(storage, {
        now: () => "2026-07-31T06:10:00.000Z",
      }),
    ).toMatchObject({ status: "migrated" });
    const afterFirst = snapshot(storage);

    expect(
      migrateEconomyStorageV1ToV2(storage, {
        now: () => "must-not-be-used",
      }),
    ).toMatchObject({
      status: "already_migrated",
    });
    expect(snapshot(storage)).toEqual(afterFirst);
  });

  it.each([
    {
      corrupt: (storage: MemoryStorage) => {
        storage.setItem(
          LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
          JSON.stringify({
            contentVersion: "2026-07-30-classic-v1",
            identity: {
              lastName: "缺字段",
              nationalityFifaCode: "CHN",
              position: "ST",
              preferredNumber: 9,
            },
            mode: "normal",
            schemaVersion: 1,
            seed: "economy-migration:missing",
          }),
        );
      },
      sourceKey:
        LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      title: "missing active-session fields",
    },
    {
      corrupt: (storage: MemoryStorage) => {
        seedEconomyV1(storage);
        storage.setItem(
          legacyArchivePayloadStorageKey(
            "legacy-branch",
          ),
          '{"schemaVersion":1,"career":',
        );
      },
      sourceKey: legacyArchivePayloadStorageKey(
        "legacy-branch",
      ),
      title: "a damaged archive payload",
    },
  ])("backs up $title and refuses partial v2 data", ({
    corrupt,
    sourceKey,
  }) => {
    const storage = new MemoryStorage();
    corrupt(storage);
    const corruptRaw = storage.getItem(sourceKey);

    expect(
      migrateEconomyStorageV1ToV2(storage, {
        now: () => "2026-07-31T06:20:00.000Z",
      }),
    ).toMatchObject({
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      sourceKey,
      status: "invalid_source",
    });
    expect(
      storage.getItem(ECONOMY_MIGRATION_BACKUP_KEY),
    ).toContain(JSON.stringify(corruptRaw));
    expect(
      storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).toBeNull();
  });

  it("rolls every v2 write back after quota failure while keeping the backup and legacy bytes", () => {
    const storage = new FailingStorage();
    seedEconomyV1(storage);
    const legacyBefore = snapshotLegacyEconomy(storage);
    storage.failNextSetFor = archivePayloadStorageKey(
      "legacy-branch",
    );

    expect(
      migrateEconomyStorageV1ToV2(storage, {
        now: () => "2026-07-31T06:30:00.000Z",
      }),
    ).toMatchObject({
      backupKey: ECONOMY_MIGRATION_BACKUP_KEY,
      phase: "write",
      rolledBack: true,
      status: "unavailable",
    });
    expect(snapshotLegacyEconomy(storage)).toEqual(
      legacyBefore,
    );
    expect(
      storage.getItem(ECONOMY_MIGRATION_BACKUP_KEY),
    ).not.toBeNull();
    expect(
      storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(
        archivePayloadStorageKey("legacy-branch"),
      ),
    ).toBeNull();
    expect(
      storage.getItem(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).toBeNull();
  });

  it("rolls v2 data back when the completion receipt cannot be written", () => {
    const storage = new FailingStorage();
    seedEconomyV1(storage);
    storage.failNextSetFor =
      ECONOMY_MIGRATION_RECEIPT_KEY;

    expect(
      migrateEconomyStorageV1ToV2(storage, {
        now: () => "2026-07-31T06:40:00.000Z",
      }),
    ).toMatchObject({
      phase: "receipt",
      rolledBack: true,
      status: "unavailable",
    });
    expect(
      storage.getItem(ECONOMY_MIGRATION_BACKUP_KEY),
    ).not.toBeNull();
    expect(
      storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(
        archivePayloadStorageKey("legacy-branch"),
      ),
    ).toBeNull();
    expect(
      storage.getItem(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).toBeNull();
  });
});

function saveLegacyCareer(
  storage: MemoryStorage,
): ClassicCareerState {
  const initial = startClassicCareer({
    identity: {
      lastName: "林一鸣",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed: "phase-5:migration",
  });
  const decision = initial.currentDecision;

  if (decision === null) {
    throw new Error("Expected a career decision");
  }

  const career = applyClassicChoice(initial, {
    decisionId: decision.id,
    decisionType: decision.type,
    optionId: decision.options[0]!.id,
  });
  expect(
    createClassicSessionRepository(storage).save(career),
  ).toEqual({ ok: true });

  return career;
}

function seedEconomyV1(storage: MemoryStorage): {
  readonly activeCareer: ClassicCareerState;
  readonly activeRaw: string;
  readonly archivePayloadRaw: string;
  readonly branchCareer: ClassicCareerState;
} {
  const parent = advanceCareer(
    startClassicCareer({
      identity: {
        lastName: "迁移",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "economy-migration:branch",
    }),
    2,
  );
  const checkpoint = createDecisionCheckpoints(parent)[0]!;
  const preDecision = replayClassicCareer({
    choices: [],
    contentVersion: parent.contentVersion,
    identity: parent.identity,
    mode: parent.mode,
    seed: parent.seed,
  });
  const original =
    parent.choiceLog[checkpoint.choiceLogLength]!;
  const alternative =
    preDecision.currentDecision!.options.find(
      (option) => option.id !== original.optionId,
    );

  if (alternative === undefined) {
    throw new Error("Expected a branch alternative");
  }

  const choice: ClassicChoiceLogEntry = {
    decisionId: checkpoint.decisionId,
    decisionType: checkpoint.decisionType,
    optionId: alternative.id,
  };
  const branchCareer = createCareerBranch({
    branchId: "legacy-branch",
    checkpoint,
    choice,
    parent,
    parentCareerId: "legacy-parent",
  }).career;
  const activeCareer = parent;
  const activeRaw = JSON.stringify({
    choiceLog: activeCareer.choiceLog,
    contentVersion: activeCareer.contentVersion,
    identity: activeCareer.identity,
    mode: activeCareer.mode,
    schemaVersion: 1,
    seed: activeCareer.seed,
  });
  const archiveEntry = {
    contentVersion: branchCareer.contentVersion,
    createdAt: "2026-07-30T10:00:00.000Z",
    displayName: "旧版分支",
    id: "legacy-branch",
    identity: branchCareer.identity,
    mode: branchCareer.mode,
    progress: {
      age: branchCareer.playerAge,
      choiceCount: branchCareer.choiceLog.length,
      currentClubId: branchCareer.currentClubId,
      marketValue: branchCareer.marketValue,
      overall: branchCareer.overall,
      seasonCount: branchCareer.seasons.length,
    },
    seed: branchCareer.seed,
    status: "in_progress",
    summaryPreview: null,
    updatedAt: "2026-07-30T10:00:00.000Z",
  };
  const archivePayloadRaw = JSON.stringify({
    career: branchCareer,
    checkpoints:
      createDecisionCheckpoints(branchCareer),
    id: archiveEntry.id,
    ledger: createCareerLedger(branchCareer),
    schemaVersion: 1,
  });

  storage.setItem(
    LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
    activeRaw,
  );
  storage.setItem(
    LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
    JSON.stringify({
      entries: [archiveEntry],
      schemaVersion: 1,
    }),
  );
  storage.setItem(
    legacyArchivePayloadStorageKey(
      archiveEntry.id,
    ),
    archivePayloadRaw,
  );

  return {
    activeCareer,
    activeRaw,
    archivePayloadRaw,
    branchCareer,
  };
}

function advanceCareer(
  initial: ClassicCareerState,
  steps: number,
): ClassicCareerState {
  let career = initial;

  for (let index = 0; index < steps; index += 1) {
    const decision = career.currentDecision;

    if (decision === null) {
      throw new Error("Expected a career decision");
    }

    career = applyClassicChoice(career, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
  }

  return career;
}

function createInterruptOnce(
  target: ArchiveMigrationStep,
): (step: ArchiveMigrationStep) => void {
  let interrupted = false;

  return (step) => {
    if (!interrupted && step === target) {
      interrupted = true;
      throw new Error(`interrupt:${target}`);
    }
  };
}

function snapshot(
  storage: MemoryStorage,
): readonly (readonly [string, string])[] {
  return [...storage.values.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function snapshotLegacyEconomy(
  storage: MemoryStorage,
): readonly (readonly [string, string])[] {
  return snapshot(storage).filter(([key]) =>
    key === LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY ||
    key === LEGACY_ARCHIVE_INDEX_STORAGE_KEY ||
    key.startsWith(
      "football-life-reborn:archive:career:v1:",
    ),
  );
}

function hashLegacyRaw(raw: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
