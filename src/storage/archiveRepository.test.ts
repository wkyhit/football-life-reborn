import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  playClassicCareer,
  startClassicCareer,
  type ClassicCareerState,
} from "../domain/classicEngine";
import { createDecisionCheckpoints } from "../domain/checkpoint";
import { createCareerEconomyProjection } from "../domain/economy/careerEconomyProjection";
import { ECONOMY_POLICY_VERSION } from "../domain/economy/economyPolicy";
import { createCareerLedger } from "../domain/ledger";
import {
  ARCHIVE_CAPACITY,
  ARCHIVE_INDEX_STORAGE_KEY,
  ARCHIVE_SCHEMA_VERSION,
  LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
  archivePayloadStorageKey,
  createArchiveRepository,
  legacyArchivePayloadStorageKey,
  type ArchiveStorageLike,
} from "./archiveRepository";

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
  failNextRemoveFor: string | null = null;
  failNextSetFor: string | null = null;

  override removeItem(key: string): void {
    if (this.failNextRemoveFor === key) {
      this.failNextRemoveFor = null;
      throw new Error(`remove failed: ${key}`);
    }

    super.removeItem(key);
  }

  override setItem(key: string, value: string): void {
    if (this.failNextSetFor === key) {
      this.failNextSetFor = null;
      throw new Error(`set failed: ${key}`);
    }

    super.setItem(key, value);
  }
}

const IDENTITY = {
  lastName: "林一鸣",
  nationalityFifaCode: "CHN",
  position: "ST",
  preferredNumber: 9,
} as const;

describe("archive repository", () => {
  it("creates, loads, updates, and renames an archive while keeping index metadata separate", () => {
    const storage = new MemoryStorage();
    const timestamps = [
      "2026-07-30T10:00:00.000Z",
      "2026-07-30T10:01:00.000Z",
      "2026-07-30T10:02:00.000Z",
    ];
    const repository = createArchiveRepository(storage, {
      createId: () => "career-a",
      now: () => timestamps.shift()!,
    });
    const initial = createCareer("phase-5:archive-a");

    const created = repository.create({
      career: initial,
      displayName: "第一人生",
    });

    expect(created).toMatchObject({
      entry: {
        createdAt: "2026-07-30T10:00:00.000Z",
        displayName: "第一人生",
        id: "career-a",
        identity: IDENTITY,
        progress: {
          age: 16,
          choiceCount: 0,
          currentClubId: null,
          marketValue: 100_000,
          overall: 50,
          seasonCount: 0,
        },
        status: "in_progress",
        summaryPreview: null,
        updatedAt: "2026-07-30T10:00:00.000Z",
      },
      ok: true,
    });

    const indexRaw = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
    const payloadKey = archivePayloadStorageKey("career-a");
    const payloadBeforeRename = storage.getItem(payloadKey);

    expect(indexRaw).not.toBeNull();
    expect(ARCHIVE_SCHEMA_VERSION).toBe(2);
    expect(ARCHIVE_INDEX_STORAGE_KEY).toBe(
      "football-life-reborn:archive:index:v2",
    );
    expect(JSON.parse(indexRaw!)).toMatchObject({
      entries: [
        {
          economyPolicyVersion: ECONOMY_POLICY_VERSION,
          totalIncome: 0,
        },
      ],
      schemaVersion: 2,
    });
    expect(indexRaw).not.toContain('"choiceLog"');
    expect(indexRaw).not.toContain('"seasons"');
    expect(payloadBeforeRename).not.toBeNull();
    expect(payloadBeforeRename).toContain('"choiceLog"');
    expect(payloadBeforeRename).toContain('"checkpoints"');
    expect(payloadBeforeRename).toContain('"economy"');
    expect(payloadBeforeRename).toContain(
      `"economyPolicyVersion":"${ECONOMY_POLICY_VERSION}"`,
    );
    expect(payloadBeforeRename).toContain('"ledger"');
    expect(payloadBeforeRename).toContain('"seasons"');

    expect(repository.rename("career-a", "冠军之路")).toMatchObject({
      entry: {
        displayName: "冠军之路",
        updatedAt: "2026-07-30T10:01:00.000Z",
      },
      ok: true,
    });
    expect(storage.getItem(payloadKey)).toBe(payloadBeforeRename);

    const progressed = chooseFirstOption(initial);
    expect(repository.update("career-a", progressed)).toMatchObject({
      entry: {
        displayName: "冠军之路",
        progress: {
          choiceCount: 1,
          seasonCount: 2,
        },
        updatedAt: "2026-07-30T10:02:00.000Z",
      },
      ok: true,
    });

    const loaded = repository.load("career-a");
    expect(loaded.status).toBe("ready");

    if (loaded.status !== "ready") {
      throw new Error("Expected archived career to load");
    }

    expect(JSON.stringify(loaded.career)).toBe(
      JSON.stringify(progressed),
    );
    expect(loaded.checkpoints).toEqual(
      createDecisionCheckpoints(progressed),
    );
    expect(loaded.ledger).toEqual(
      createCareerLedger(progressed),
    );
    expect(loaded.economy).toEqual(
      createCareerEconomyProjection(progressed),
    );
    expect(repository.list()).toMatchObject({
      entries: [
        {
          displayName: "冠军之路",
          id: "career-a",
        },
      ],
      ok: true,
    });
  });

  it("derives a compact retirement preview and deterministic list order", () => {
    const storage = new MemoryStorage();
    const ids = ["career-b", "career-a"];
    const repository = createArchiveRepository(storage, {
      createId: () => ids.shift()!,
      now: () => "2026-07-30T11:00:00.000Z",
    });
    const retired = playClassicCareer({
      identity: IDENTITY,
      mode: "normal",
      seed: "phase-5:retired",
    });

    expect(
      repository.create({
        career: retired,
        displayName: "退役档案",
      }),
    ).toMatchObject({
      entry: {
        status: "retired",
        summaryPreview: {
          awardCount: retired.summary!.awards.length,
          ending: retired.summary!.ending,
          maxMarketValue: retired.summary!.maxMarketValue,
          maxOverall: retired.summary!.maxOverall,
          totals: retired.summary!.totals,
          trophyCount: retired.summary!.totals.trophies,
        },
      },
      ok: true,
    });
    expect(
      repository.create({
        career: createCareer("phase-5:archive-second"),
        displayName: "仍在继续",
      }),
    ).toMatchObject({ ok: true });

    const listed = repository.list();
    expect(listed).toMatchObject({ ok: true });

    if (!listed.ok) {
      throw new Error("Expected archive list");
    }

    expect(listed.entries.map((entry) => entry.id)).toEqual([
      "career-a",
      "career-b",
    ]);
  });

  it("backfills a v1 archive index and payload without rewriting the legacy keys", () => {
    const storage = new MemoryStorage();
    const career = chooseFirstOption(
      createCareer("economy-archive-v1"),
    );
    const legacyEntry = {
      contentVersion: career.contentVersion,
      createdAt: "2026-07-30T10:00:00.000Z",
      displayName: "旧版生涯",
      id: "legacy-economy",
      identity: career.identity,
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
      status: "in_progress",
      summaryPreview: null,
      updatedAt: "2026-07-30T10:00:00.000Z",
    };
    const legacyIndexRaw = JSON.stringify({
      entries: [legacyEntry],
      schemaVersion: 1,
    });
    const legacyPayloadRaw = JSON.stringify({
      career,
      checkpoints: createDecisionCheckpoints(career),
      id: legacyEntry.id,
      ledger: createCareerLedger(career),
      schemaVersion: 1,
    });
    storage.setItem(
      LEGACY_ARCHIVE_INDEX_STORAGE_KEY,
      legacyIndexRaw,
    );
    storage.setItem(
      legacyArchivePayloadStorageKey(legacyEntry.id),
      legacyPayloadRaw,
    );

    const repository = createArchiveRepository(storage);
    expect(repository.list()).toMatchObject({
      entries: [
        {
          economyPolicyVersion: ECONOMY_POLICY_VERSION,
          id: legacyEntry.id,
          totalIncome:
            createCareerEconomyProjection(career).totalIncome,
        },
      ],
      ok: true,
    });
    expect(repository.load(legacyEntry.id)).toMatchObject({
      economy: createCareerEconomyProjection(career),
      sourceSchemaVersion: 1,
      status: "ready",
    });
    expect(
      storage.getItem(LEGACY_ARCHIVE_INDEX_STORAGE_KEY),
    ).toBe(legacyIndexRaw);
    expect(
      storage.getItem(
        legacyArchivePayloadStorageKey(legacyEntry.id),
      ),
    ).toBe(legacyPayloadRaw);
    expect(
      storage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
    ).toBeNull();
    expect(
      storage.getItem(
        archivePayloadStorageKey(legacyEntry.id),
      ),
    ).toBeNull();

    const deleted = repository.delete(legacyEntry.id);
    expect(deleted).toMatchObject({
      entry: { id: legacyEntry.id },
      ok: true,
    });
    if (!deleted.ok) {
      throw new Error("Expected legacy archive deletion");
    }
    expect(repository.list()).toMatchObject({
      entries: [],
      ok: true,
    });
    expect(
      storage.getItem(LEGACY_ARCHIVE_INDEX_STORAGE_KEY),
    ).toBe(legacyIndexRaw);
    expect(
      storage.getItem(
        legacyArchivePayloadStorageKey(legacyEntry.id),
      ),
    ).toBe(legacyPayloadRaw);

    expect(
      repository.undoDelete(deleted.undoToken),
    ).toMatchObject({
      entry: { id: legacyEntry.id },
      ok: true,
    });
    expect(
      JSON.parse(
        storage.getItem(
          archivePayloadStorageKey(legacyEntry.id),
        )!,
      ),
    ).toMatchObject({
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      schemaVersion: 2,
    });
    expect(repository.load(legacyEntry.id)).toMatchObject({
      sourceSchemaVersion: 2,
      status: "ready",
    });
  });

  it("refuses a twenty-first career without silently evicting any archive", () => {
    const storage = new MemoryStorage();
    let nextId = 0;
    const repository = createArchiveRepository(storage, {
      createId: () => `career-${String(nextId++).padStart(2, "0")}`,
      now: () => "2026-07-30T12:00:00.000Z",
    });

    for (let index = 0; index < ARCHIVE_CAPACITY; index += 1) {
      expect(
        repository.create({
          career: createCareer(`phase-5:capacity-${index}`),
          displayName: `生涯 ${index + 1}`,
        }),
      ).toMatchObject({ ok: true });
    }

    const indexBefore = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
    const firstPayloadBefore = storage.getItem(
      archivePayloadStorageKey("career-00"),
    );

    expect(
      repository.create({
        career: createCareer("phase-5:capacity-overflow"),
        displayName: "不应写入",
      }),
    ).toEqual({
      capacity: ARCHIVE_CAPACITY,
      ok: false,
      reason: "capacity",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(
      storage.getItem(archivePayloadStorageKey("career-00")),
    ).toBe(firstPayloadBefore);
    expect(
      storage.getItem(archivePayloadStorageKey("career-20")),
    ).toBeNull();

    const listed = repository.list();
    expect(listed).toMatchObject({ ok: true });

    if (!listed.ok) {
      throw new Error("Expected archive list");
    }

    expect(listed.entries).toHaveLength(ARCHIVE_CAPACITY);
  });

  it("deletes only by explicit ID and can restore exact bytes once in the same session", () => {
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-undo",
      now: () => "2026-07-30T13:00:00.000Z",
    });
    expect(
      repository.create({
        career: createCareer("phase-5:undo"),
        displayName: "可撤销",
      }),
    ).toMatchObject({ ok: true });
    const indexBefore = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
    const payloadKey = archivePayloadStorageKey("career-undo");
    const payloadBefore = storage.getItem(payloadKey);

    const deleted = repository.delete("career-undo");
    expect(deleted).toMatchObject({
      entry: { id: "career-undo" },
      ok: true,
    });

    if (!deleted.ok) {
      throw new Error("Expected archive deletion");
    }

    expect(storage.getItem(payloadKey)).toBeNull();
    expect(repository.list()).toMatchObject({
      entries: [],
      ok: true,
    });
    expect(repository.undoDelete(deleted.undoToken)).toMatchObject({
      entry: { id: "career-undo" },
      ok: true,
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(storage.getItem(payloadKey)).toBe(payloadBefore);
    expect(repository.undoDelete(deleted.undoToken)).toEqual({
      ok: false,
      reason: "undo_not_found",
    });
  });

  it("reports duplicate IDs and missing mutations without changing stored careers", () => {
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-same",
      now: () => "2026-07-30T14:00:00.000Z",
    });
    expect(
      repository.create({
        career: createCareer("phase-5:duplicate-first"),
        displayName: "原档",
      }),
    ).toMatchObject({ ok: true });
    const indexBefore = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
    const payloadBefore = storage.getItem(
      archivePayloadStorageKey("career-same"),
    );

    expect(
      repository.create({
        career: createCareer("phase-5:duplicate-second"),
        displayName: "重复档",
      }),
    ).toEqual({
      id: "career-same",
      ok: false,
      reason: "duplicate_id",
    });
    expect(repository.rename("missing", "不存在")).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      repository.update(
        "missing",
        createCareer("phase-5:update-missing"),
      ),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(repository.delete("missing")).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(
      storage.getItem(archivePayloadStorageKey("career-same")),
    ).toBe(payloadBefore);
  });

  it("rolls payloads and index metadata back when a storage write is interrupted", () => {
    const storage = new FailingStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-atomic",
      now: () => "2026-07-30T15:00:00.000Z",
    });
    const payloadKey = archivePayloadStorageKey("career-atomic");
    storage.failNextSetFor = ARCHIVE_INDEX_STORAGE_KEY;

    expect(
      repository.create({
        career: createCareer("phase-5:create-interrupted"),
        displayName: "未完成写入",
      }),
    ).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(payloadKey)).toBeNull();

    expect(
      repository.create({
        career: createCareer("phase-5:atomic"),
        displayName: "原档",
      }),
    ).toMatchObject({ ok: true });
    const indexBefore = storage.getItem(ARCHIVE_INDEX_STORAGE_KEY);
    const payloadBefore = storage.getItem(payloadKey);
    storage.failNextSetFor = ARCHIVE_INDEX_STORAGE_KEY;

    expect(
      repository.update(
        "career-atomic",
        chooseFirstOption(createCareer("phase-5:atomic")),
      ),
    ).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(storage.getItem(payloadKey)).toBe(payloadBefore);

    storage.failNextRemoveFor = payloadKey;
    expect(repository.delete("career-atomic")).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(storage.getItem(payloadKey)).toBe(payloadBefore);
  });

  it("reports a corrupt index without overwriting it or creating payloads", () => {
    const storage = new MemoryStorage();
    const corruptIndex = JSON.stringify({
      entries: [{}],
      schemaVersion: 1,
    });
    storage.setItem(ARCHIVE_INDEX_STORAGE_KEY, corruptIndex);
    const repository = createArchiveRepository(storage, {
      createId: () => "career-after-corruption",
    });

    expect(repository.list()).toMatchObject({
      ok: false,
      reason: "corrupt_index",
    });
    expect(
      repository.create({
        career: createCareer("phase-5:corrupt-index"),
        displayName: "不应覆盖",
      }),
    ).toMatchObject({
      ok: false,
      reason: "corrupt_index",
    });
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      corruptIndex,
    );
    expect(
      storage.getItem(
        archivePayloadStorageKey(
          "career-after-corruption",
        ),
      ),
    ).toBeNull();
  });

  it("rejects a payload whose persisted checkpoints no longer match its career", () => {
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-tampered-checkpoint",
      now: () => "2026-07-30T16:00:00.000Z",
    });
    const career = chooseFirstOption(
      createCareer("phase-5:tampered-checkpoint"),
    );

    expect(
      repository.create({
        career,
        displayName: "校验点被篡改",
      }),
    ).toMatchObject({ ok: true });

    const payloadKey = archivePayloadStorageKey(
      "career-tampered-checkpoint",
    );
    const payload = JSON.parse(storage.getItem(payloadKey)!);
    payload.checkpoints[0].stateHash =
      "fnv1a64:0000000000000000";
    const tamperedRaw = JSON.stringify(payload);
    storage.setItem(payloadKey, tamperedRaw);

    expect(
      repository.load("career-tampered-checkpoint"),
    ).toEqual({
      detail:
        "Archive checkpoints do not match career: career-tampered-checkpoint",
      raw: tamperedRaw,
      status: "corrupt",
    });
  });

  it("rejects a payload whose persisted causal ledger no longer matches replay", () => {
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-tampered-ledger",
      now: () => "2026-07-30T16:30:00.000Z",
    });
    const career = chooseFirstOption(
      createCareer("phase-5:tampered-ledger"),
    );

    expect(
      repository.create({
        career,
        displayName: "账本被篡改",
      }),
    ).toMatchObject({ ok: true });

    const payloadKey = archivePayloadStorageKey(
      "career-tampered-ledger",
    );
    const payload = JSON.parse(storage.getItem(payloadKey)!);
    payload.ledger[0].age += 1;
    const tamperedRaw = JSON.stringify(payload);
    storage.setItem(payloadKey, tamperedRaw);

    expect(repository.load("career-tampered-ledger")).toEqual({
      detail:
        "Archive ledger does not match career: career-tampered-ledger",
      raw: tamperedRaw,
      status: "corrupt",
    });
  });

  it("rejects a v2 payload whose persisted economy projection or policy version drifts", () => {
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage, {
      createId: () => "career-tampered-economy",
      now: () => "2026-07-30T16:40:00.000Z",
    });
    const career = chooseFirstOption(
      createCareer("economy:tampered-archive"),
    );

    expect(
      repository.create({
        career,
        displayName: "经济投影被篡改",
      }),
    ).toMatchObject({ ok: true });

    const payloadKey = archivePayloadStorageKey(
      "career-tampered-economy",
    );
    const originalRaw = storage.getItem(payloadKey)!;
    const economy = JSON.parse(originalRaw);
    economy.economy.totalIncome += 10_000;
    const tamperedEconomyRaw = JSON.stringify(economy);
    storage.setItem(payloadKey, tamperedEconomyRaw);

    expect(
      repository.load("career-tampered-economy"),
    ).toEqual({
      detail:
        "Archive economy does not match career: career-tampered-economy",
      raw: tamperedEconomyRaw,
      status: "corrupt",
    });

    const policy = JSON.parse(originalRaw);
    policy.economyPolicyVersion =
      "future-economy-policy";
    const tamperedPolicyRaw = JSON.stringify(policy);
    storage.setItem(payloadKey, tamperedPolicyRaw);

    expect(
      repository.load("career-tampered-economy"),
    ).toEqual({
      detail:
        "Archive payload does not match schema version 2: career-tampered-economy",
      raw: tamperedPolicyRaw,
      status: "corrupt",
    });
  });
});

function createCareer(seed: string): ClassicCareerState {
  return startClassicCareer({
    identity: IDENTITY,
    mode: "normal",
    seed,
  });
}

function chooseFirstOption(
  career: ClassicCareerState,
): ClassicCareerState {
  const decision = career.currentDecision;

  if (decision === null) {
    throw new Error("Expected a career decision");
  }

  return applyClassicChoice(career, {
    decisionId: decision.id,
    decisionType: decision.type,
    optionId: decision.options[0]!.id,
  });
}
