import { describe, expect, it } from "vitest";

import {
  replayClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
} from "../../src/domain/classicEngine";
import { createCareerEconomyProjection } from "../../src/domain/economy/careerEconomyProjection";
import {
  ARCHIVE_CAPACITY,
  ARCHIVE_INDEX_STORAGE_KEY,
  LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
  archivePayloadStorageKey,
  createArchiveRepository,
  legacyArchivePayloadStorageKey,
  type ArchiveStorageLike,
} from "../../src/storage/archiveRepository";
import {
  ECONOMY_MIGRATION_BACKUP_KEY,
  ECONOMY_MIGRATION_RECEIPT_KEY,
  migrateEconomyStorageV1ToV2,
} from "../../src/storage/migrations/migrations";
import { CLASSIC_GOLDEN_FIXTURES } from "../golden/fixtures";

const LONG_CAREER_REPETITIONS = 25;
const LONG_CAREER_PROJECTION_BUDGET_MS = 1_500;
const LEGACY_MIGRATION_READ_BUDGET = 120;
const LEGACY_MIGRATION_WRITE_BUDGET = 45;

class CountingStorage implements ArchiveStorageLike {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly removes: string[] = [];
  readonly writes: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.removes.push(key);
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }

  resetOperations(): void {
    this.reads.length = 0;
    this.removes.length = 0;
    this.writes.length = 0;
  }
}

describe("Issue #18 economy release performance budgets", () => {
  it("projects every long-mode golden career repeatedly within the release budget", () => {
    const longCareers = CLASSIC_GOLDEN_FIXTURES.filter(
      (fixture) => fixture.mode === "long",
    ).map(replayFixture);

    expect(longCareers).toHaveLength(14);
    for (const career of longCareers) {
      createCareerEconomyProjection(career);
    }

    const startedAt = performance.now();

    for (
      let repetition = 0;
      repetition < LONG_CAREER_REPETITIONS;
      repetition += 1
    ) {
      for (const career of longCareers) {
        createCareerEconomyProjection(career);
      }
    }

    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThanOrEqual(
      LONG_CAREER_PROJECTION_BUDGET_MS,
    );
  });

  it("migrates a full legacy archive within bounded storage I/O", () => {
    const storage = createLegacyArchiveAtCapacity();
    storage.resetOperations();

    const result = migrateEconomyStorageV1ToV2(storage, {
      now: () => "2026-07-31T08:00:00.000Z",
    });

    expect(result).toMatchObject({
      report: {
        migratedArchiveIds: expect.arrayContaining(
          Array.from(
            { length: ARCHIVE_CAPACITY },
            (_, index) => archiveId(index),
          ),
        ),
      },
      status: "migrated",
    });
    expect(storage.reads.length).toBeLessThanOrEqual(
      LEGACY_MIGRATION_READ_BUDGET,
    );
    expect(storage.writes.length).toBeLessThanOrEqual(
      LEGACY_MIGRATION_WRITE_BUDGET,
    );
    expect(storage.removes).toHaveLength(0);
    expect(
      storage.values.has(ECONOMY_MIGRATION_BACKUP_KEY),
    ).toBe(true);
    expect(
      storage.values.has(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).toBe(true);

    storage.resetOperations();
    expect(createArchiveRepository(storage).list()).toMatchObject({
      ok: true,
    });
    expect(storage.reads).toEqual([
      ARCHIVE_INDEX_STORAGE_KEY,
    ]);
    expect(storage.writes).toHaveLength(0);
  });

  it("does not replay every legacy payload again on repeated archive lists", () => {
    const storage = createLegacyArchiveAtCapacity();
    const repository = createArchiveRepository(storage);
    storage.resetOperations();

    expect(repository.list()).toMatchObject({ ok: true });
    expect(storage.reads).toHaveLength(
      ARCHIVE_CAPACITY + 2,
    );
    expect(
      storage.reads.filter((key) =>
        key.startsWith(
          "football-life-reborn:archive:career:v1:",
        ),
      ),
    ).toHaveLength(ARCHIVE_CAPACITY);

    storage.resetOperations();
    expect(repository.list()).toMatchObject({ ok: true });
    expect(storage.reads).toEqual([
      ARCHIVE_INDEX_STORAGE_KEY,
      LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
    ]);
    expect(storage.writes).toHaveLength(0);

    const legacyIndex = JSON.parse(
      storage.values.get(LEGACY_ARCHIVE_INDEX_STORAGE_KEY)!,
    ) as { entries: unknown[]; schemaVersion: 1 };
    storage.values.set(
      LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
      JSON.stringify({
        ...legacyIndex,
        entries: [...legacyIndex.entries].reverse(),
      }),
    );
    storage.resetOperations();

    expect(repository.list()).toMatchObject({ ok: true });
    expect(storage.reads).toHaveLength(
      ARCHIVE_CAPACITY + 2,
    );
  });
});

function replayFixture(
  fixture: (typeof CLASSIC_GOLDEN_FIXTURES)[number],
): ClassicCareerState {
  return replayClassicCareer({
    choices: fixture.choices,
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });
}

function createLegacyArchiveAtCapacity(): CountingStorage {
  const currentStorage = new CountingStorage();
  const repository = createArchiveRepository(currentStorage, {
    now: () => "2026-07-31T07:00:00.000Z",
  });
  const career = startClassicCareer({
    identity: {
      lastName: "性能",
      nationalityFifaCode: "CHN",
      position: "GK",
      preferredNumber: 1,
    },
    mode: "long",
    seed: "issue-18:performance-budget",
  });

  for (let index = 0; index < ARCHIVE_CAPACITY; index += 1) {
    expect(
      repository.create({
        career,
        displayName: `旧存档 ${index + 1}`,
        id: archiveId(index),
      }),
    ).toMatchObject({ ok: true });
  }

  const currentIndex = JSON.parse(
    currentStorage.values.get(ARCHIVE_INDEX_STORAGE_KEY)!,
  ) as {
    entries: Record<string, unknown>[];
  };
  const legacyStorage = new CountingStorage();
  const legacyEntries = currentIndex.entries.map((entry) => {
    const {
      economyPolicyVersion: _economyPolicyVersion,
      totalIncome: _totalIncome,
      ...legacyEntry
    } = entry;

    return legacyEntry;
  });

  legacyStorage.values.set(
    LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
    JSON.stringify({
      entries: legacyEntries,
      schemaVersion: 1,
    }),
  );

  for (let index = 0; index < ARCHIVE_CAPACITY; index += 1) {
    const id = archiveId(index);
    const currentPayload = JSON.parse(
      currentStorage.values.get(
        archivePayloadStorageKey(id),
      )!,
    ) as Record<string, unknown>;
    const {
      economy: _economy,
      economyPolicyVersion: _economyPolicyVersion,
      ...legacyPayload
    } = currentPayload;

    legacyStorage.values.set(
      legacyArchivePayloadStorageKey(id),
      JSON.stringify({
        ...legacyPayload,
        schemaVersion: 1,
      }),
    );
  }

  return legacyStorage;
}

function archiveId(index: number): string {
  return `legacy-performance-${String(index).padStart(2, "0")}`;
}
