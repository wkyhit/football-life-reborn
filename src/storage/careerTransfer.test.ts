import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
  type ClassicCareerState,
} from "../domain/classicEngine";
import { createDecisionCheckpoints } from "../domain/checkpoint";
import { deterministicHash } from "../domain/deterministicHash";
import {
  ARCHIVE_INDEX_STORAGE_KEY,
  archivePayloadStorageKey,
  createArchiveRepository,
  type ArchiveRepository,
  type ArchiveStorageLike,
  type CareerArchiveEntry,
} from "./archiveRepository";
import {
  CAREER_TRANSFER_FORMAT,
  CAREER_TRANSFER_QUARANTINE_PREFIX,
  CAREER_TRANSFER_VERSION,
  importCareerTransfer,
  parseCareerTransfer,
  serializeCareerTransfer,
} from "./careerTransfer";

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

describe("career transfer", () => {
  it("round-trips a versioned checksummed archive into a fresh repository", () => {
    const source = createArchivedCareer();
    const raw = serializeCareerTransfer({
      career: source.career,
      entry: source.entry,
    });
    const document = JSON.parse(raw);

    expect(document).toMatchObject({
      archive: {
        checkpoints: createDecisionCheckpoints(
          source.career,
        ),
      },
      checksum: expect.stringMatching(/^fnv1a64:[0-9a-f]{16}$/),
      format: CAREER_TRANSFER_FORMAT,
      formatVersion: CAREER_TRANSFER_VERSION,
    });

    const parsed = parseCareerTransfer(raw);
    expect(parsed.status).toBe("ready");

    if (parsed.status !== "ready") {
      throw new Error("Expected a valid transfer");
    }

    expect(parsed.archive).toMatchObject({
      createdAt: source.entry.createdAt,
      displayName: source.entry.displayName,
      id: source.entry.id,
      updatedAt: source.entry.updatedAt,
    });
    expect(JSON.stringify(parsed.archive.career)).toBe(
      JSON.stringify(source.career),
    );
    expect(parsed.archive.checkpoints).toEqual(
      createDecisionCheckpoints(source.career),
    );

    const targetStorage = new MemoryStorage();
    const targetRepository = createArchiveRepository(
      targetStorage,
      {
        createId: () => "must-not-replace-transfer-id",
        now: () => "must-not-replace-transfer-time",
      },
    );
    expect(
      importCareerTransfer(
        raw,
        targetRepository,
        targetStorage,
      ),
    ).toMatchObject({
      entry: {
        createdAt: source.entry.createdAt,
        displayName: source.entry.displayName,
        id: source.entry.id,
        updatedAt: source.entry.updatedAt,
      },
      status: "imported",
    });

    const loaded = targetRepository.load(source.entry.id);
    expect(loaded.status).toBe("ready");

    if (loaded.status !== "ready") {
      throw new Error("Expected imported archive");
    }

    expect(JSON.stringify(loaded.career)).toBe(
      JSON.stringify(source.career),
    );
    expect(loaded.checkpoints).toEqual(
      createDecisionCheckpoints(source.career),
    );
  });

  it("rejects a checksum mismatch and preserves the exact raw input in quarantine", () => {
    const source = createArchivedCareer();
    const validRaw = serializeCareerTransfer({
      career: source.career,
      entry: source.entry,
    });
    const document = JSON.parse(validRaw);
    document.archive.displayName = "被篡改";
    const tamperedRaw = JSON.stringify(document);

    expect(parseCareerTransfer(tamperedRaw)).toMatchObject({
      reason: "checksum_mismatch",
      status: "invalid",
    });

    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage);
    const imported = importCareerTransfer(
      tamperedRaw,
      repository,
      storage,
    );
    expect(imported).toMatchObject({
      reason: "checksum_mismatch",
      status: "rejected",
    });

    if (imported.status !== "rejected") {
      throw new Error("Expected rejected transfer");
    }

    expect(imported.quarantineKey).toMatch(
      new RegExp(`^${CAREER_TRANSFER_QUARANTINE_PREFIX}`),
    );
    expect(storage.getItem(imported.quarantineKey!)).toBe(
      tamperedRaw,
    );
    expect(repository.list()).toMatchObject({
      entries: [],
      ok: true,
    });
  });

  it("classifies corrupt JSON and unsupported format versions before storage import", () => {
    const corruptRaw = '{"format":';

    expect(parseCareerTransfer(corruptRaw)).toEqual({
      reason: "invalid_json",
      status: "invalid",
    });

    const source = createArchivedCareer();
    const document = JSON.parse(
      serializeCareerTransfer({
        career: source.career,
        entry: source.entry,
      }),
    );
    document.formatVersion = CAREER_TRANSFER_VERSION + 1;
    const unsupportedRaw = JSON.stringify(document);
    expect(parseCareerTransfer(unsupportedRaw)).toEqual({
      formatVersion: CAREER_TRANSFER_VERSION + 1,
      reason: "format_version",
      status: "unsupported",
    });

    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage);
    const imported = importCareerTransfer(
      unsupportedRaw,
      repository,
      storage,
    );
    expect(imported).toMatchObject({
      formatVersion: CAREER_TRANSFER_VERSION + 1,
      reason: "format_version",
      status: "unsupported",
    });

    if (imported.status !== "unsupported") {
      throw new Error("Expected unsupported transfer");
    }

    expect(storage.getItem(imported.quarantineKey!)).toBe(
      unsupportedRaw,
    );
  });

  it("preserves a newer content version once under a stable quarantine key", () => {
    const source = createArchivedCareer();
    const futureCareer = {
      ...source.career,
      contentVersion: "future-classic-v2",
    } as unknown as ClassicCareerState;
    const raw = serializeCareerTransfer({
      career: futureCareer,
      entry: source.entry,
    });
    expect(parseCareerTransfer(raw)).toEqual({
      contentVersion: "future-classic-v2",
      reason: "content_version",
      status: "unsupported",
    });

    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage);
    const first = importCareerTransfer(
      raw,
      repository,
      storage,
    );
    const second = importCareerTransfer(
      raw,
      repository,
      storage,
    );
    expect(first).toMatchObject({
      reason: "content_version",
      status: "unsupported",
    });
    expect(second).toEqual(first);

    if (first.status !== "unsupported") {
      throw new Error("Expected unsupported content");
    }

    expect(storage.getItem(first.quarantineKey!)).toBe(raw);
    expect(
      [...storage.values.keys()].filter((key) =>
        key.startsWith(CAREER_TRANSFER_QUARANTINE_PREFIX),
      ),
    ).toHaveLength(1);
  });

  it("rejects a duplicate archive ID without replacing the existing payload", () => {
    const source = createArchivedCareer();
    const raw = serializeCareerTransfer({
      career: source.career,
      entry: source.entry,
    });
    const storage = new MemoryStorage();
    const repository = createArchiveRepository(storage);

    expect(
      importCareerTransfer(raw, repository, storage),
    ).toMatchObject({ status: "imported" });
    const indexBefore = storage.getItem(
      ARCHIVE_INDEX_STORAGE_KEY,
    );
    const payloadKey = archivePayloadStorageKey(source.entry.id);
    const payloadBefore = storage.getItem(payloadKey);

    const duplicate = importCareerTransfer(
      raw,
      repository,
      storage,
    );
    expect(duplicate).toMatchObject({
      id: source.entry.id,
      reason: "duplicate_id",
      status: "conflict",
    });

    if (duplicate.status !== "conflict") {
      throw new Error("Expected duplicate conflict");
    }

    expect(storage.getItem(duplicate.quarantineKey!)).toBe(raw);
    expect(storage.getItem(ARCHIVE_INDEX_STORAGE_KEY)).toBe(
      indexBefore,
    );
    expect(storage.getItem(payloadKey)).toBe(payloadBefore);
  });

  it("detects a replay mismatch even when a forged document has a valid checksum", () => {
    const source = createArchivedCareer();
    const forgedCareer = {
      ...source.career,
      overall: source.career.overall + 1,
    };
    const forgedRaw = serializeCareerTransfer({
      career: forgedCareer,
      entry: source.entry,
    });

    expect(parseCareerTransfer(forgedRaw)).toMatchObject({
      reason: "replay_mismatch",
      status: "invalid",
    });

    const checkpointDocument = JSON.parse(
      serializeCareerTransfer({
        career: source.career,
        entry: source.entry,
      }),
    );
    checkpointDocument.archive.checkpoints[0].stateHash =
      "fnv1a64:0000000000000000";
    checkpointDocument.checksum = deterministicHash({
      archive: checkpointDocument.archive,
      format: checkpointDocument.format,
      formatVersion: checkpointDocument.formatVersion,
    });

    expect(
      parseCareerTransfer(JSON.stringify(checkpointDocument)),
    ).toMatchObject({
      reason: "replay_mismatch",
      status: "invalid",
    });
  });

  it("does not mutate storage while purely parsing invalid input", () => {
    const storage = new MemoryStorage();
    storage.setItem("sentinel", "unchanged");
    const before = [...storage.values.entries()];

    expect(parseCareerTransfer("not json")).toMatchObject({
      status: "invalid",
    });
    expect([...storage.values.entries()]).toEqual(before);
  });
});

function createArchivedCareer(): {
  readonly career: ClassicCareerState;
  readonly entry: CareerArchiveEntry;
  readonly repository: ArchiveRepository;
  readonly storage: MemoryStorage;
} {
  const storage = new MemoryStorage();
  const repository = createArchiveRepository(storage, {
    createId: () => "career-transfer",
    now: () => "2026-07-30T16:00:00.000Z",
  });
  const career = chooseFirstOption(
    startClassicCareer({
      identity: {
        lastName: "林一鸣",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "phase-5:transfer",
    }),
  );
  const created = repository.create({
    career,
    displayName: "可携带生涯",
  });

  if (!created.ok) {
    throw new Error("Expected source archive");
  }

  return {
    career,
    entry: created.entry,
    repository,
    storage,
  };
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
