import { describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../domain/classicEngine";
import { ECONOMY_POLICY_VERSION } from "../domain/economy/economyPolicy";
import {
  LEGACY_CAREER_PRESENTATION_PROFILE,
  createCareerPresentationProfile,
} from "../presentation/profile";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  CLASSIC_SESSION_V2_BACKUP_STORAGE_KEY,
  CLASSIC_SESSION_SCHEMA_VERSION,
  LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
} from "./classicSessionRepository";
import type { StorageLike } from "./careerRepository";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FailingStorage extends MemoryStorage {
  failNextSetFor: string | null = null;

  override setItem(key: string, value: string): void {
    if (key === this.failNextSetFor) {
      this.failNextSetFor = null;
      throw new Error(`set failed: ${key}`);
    }

    super.setItem(key, value);
  }
}

describe("classic session repository", () => {
  it("restores by replaying deterministic inputs instead of storing engine state", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-3:classic-session",
    });
    const decision = initial.currentDecision;

    if (decision === null) {
      throw new Error("Expected an academy decision");
    }

    const committed = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const storage = new MemoryStorage();
    const repository = createClassicSessionRepository(storage);

    const profile = createCareerPresentationProfile("left");
    expect(repository.save(committed, profile)).toEqual({ ok: true });

    const raw = storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(CLASSIC_SESSION_SCHEMA_VERSION).toBe(3);
    expect(ACTIVE_CLASSIC_SESSION_STORAGE_KEY).toBe(
      "football-life-reborn:classic-session:v2",
    );
    expect(JSON.parse(raw!)).toMatchObject({
      choiceLog: committed.choiceLog,
      contentVersion: committed.contentVersion,
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      identity: committed.identity,
      mode: committed.mode,
      profile,
      schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
      seed: committed.seed,
    });
    expect(raw).not.toContain('"state"');
    expect(raw).not.toContain('"rngState"');
    expect(raw).not.toContain('"seasons"');

    const restored = repository.load();
    expect(restored.status).toBe("ready");

    if (restored.status !== "ready") {
      throw new Error("Expected a replayed Classic session");
    }

    expect(JSON.stringify(restored.state)).toBe(
      JSON.stringify(committed),
    );
    expect(restored).toMatchObject({
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      profile,
      sourceSchemaVersion: 3,
    });
  });

  it("backfills a v1 envelope through economy-v1 without rewriting or deleting the legacy key", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "周",
        nationalityFifaCode: "CHN",
        position: "GK",
        preferredNumber: 1,
      },
      mode: "long",
      seed: "economy-session-v1",
    });
    const legacyRaw = JSON.stringify({
      choiceLog: initial.choiceLog,
      contentVersion: initial.contentVersion,
      identity: initial.identity,
      mode: initial.mode,
      schemaVersion: 1,
      seed: initial.seed,
    });
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      legacyRaw,
    );

    const loaded =
      createClassicSessionRepository(storage).load();

    expect(loaded).toMatchObject({
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      profile: LEGACY_CAREER_PRESENTATION_PROFILE,
      sourceSchemaVersion: 1,
      state: initial,
      status: "ready",
    });
    expect(
      storage.getItem(
        LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      ),
    ).toBe(legacyRaw);
    expect(
      storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY),
    ).toBeNull();
  });

  it("reads v2 without a preferred foot and preserves its exact bytes before the first v3 write", () => {
    const career = startClassicCareer({
      identity: {
        lastName: "旧版",
        nationalityFifaCode: "CHN",
        position: "CM",
        preferredNumber: 8,
      },
      mode: "normal",
      seed: "profile-session-v2",
    });
    const v2Raw = JSON.stringify({
      choiceLog: career.choiceLog,
      contentVersion: career.contentVersion,
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      identity: career.identity,
      mode: career.mode,
      schemaVersion: 2,
      seed: career.seed,
    });
    const storage = new MemoryStorage();
    storage.setItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY, v2Raw);
    const repository = createClassicSessionRepository(storage);

    expect(repository.load()).toMatchObject({
      profile: LEGACY_CAREER_PRESENTATION_PROFILE,
      sourceSchemaVersion: 2,
      status: "ready",
    });

    expect(
      repository.save(
        career,
        createCareerPresentationProfile("right"),
      ),
    ).toEqual({ ok: true });
    expect(
      storage.getItem(CLASSIC_SESSION_V2_BACKUP_STORAGE_KEY),
    ).toBe(v2Raw);
    expect(
      JSON.parse(storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY)!),
    ).toMatchObject({
      profile: { preferredFoot: "right" },
      schemaVersion: 3,
    });
  });

  it("does not overwrite v2 when its recoverable backup cannot be written", () => {
    const career = startClassicCareer({
      identity: {
        lastName: "回滚",
        nationalityFifaCode: "CHN",
        position: "CB",
        preferredNumber: 5,
      },
      mode: "express",
      seed: "profile-session-v2-backup-failure",
    });
    const v2Raw = JSON.stringify({
      choiceLog: career.choiceLog,
      contentVersion: career.contentVersion,
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      identity: career.identity,
      mode: career.mode,
      schemaVersion: 2,
      seed: career.seed,
    });
    const storage = new FailingStorage();
    storage.setItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY, v2Raw);
    storage.failNextSetFor = CLASSIC_SESSION_V2_BACKUP_STORAGE_KEY;

    expect(
      createClassicSessionRepository(storage).save(career, {
        preferredFoot: "left",
      }),
    ).toMatchObject({ ok: false });
    expect(storage.getItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY)).toBe(
      v2Raw,
    );
    expect(
      storage.getItem(CLASSIC_SESSION_V2_BACKUP_STORAGE_KEY),
    ).toBeNull();
  });

  it("quarantines a deterministic envelope that cannot be replayed", () => {
    const storage = new MemoryStorage();
    const repository = createClassicSessionRepository(storage);
    const raw = JSON.stringify({
      choiceLog: [
        {
          decisionId: "wrong-decision",
          decisionType: "academy_offer",
          optionId: "wrong-option",
        },
      ],
      contentVersion: "2026-07-30-classic-v1",
      economyPolicyVersion: ECONOMY_POLICY_VERSION,
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      schemaVersion: CLASSIC_SESSION_SCHEMA_VERSION,
      seed: "phase-3:invalid-replay",
    });
    storage.setItem(ACTIVE_CLASSIC_SESSION_STORAGE_KEY, raw);

    const loaded = repository.load();
    expect(loaded).toMatchObject({
      raw,
      status: "corrupt",
    });

    if (loaded.status !== "corrupt") {
      throw new Error("Expected corrupt replay recovery");
    }

    expect(loaded.quarantineKey).not.toBeNull();
    expect(storage.getItem(loaded.quarantineKey!)).toBe(raw);
  });
});
