import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
  type ClassicCareerState,
} from "../../domain/classicEngine";
import {
  ARCHIVE_INDEX_STORAGE_KEY,
  createArchiveRepository,
  type ArchiveStorageLike,
} from "../archiveRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
} from "../classicSessionRepository";
import {
  ARCHIVE_MIGRATION_RECEIPT_KEY,
  ARCHIVE_MIGRATION_STAGE_KEY,
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
