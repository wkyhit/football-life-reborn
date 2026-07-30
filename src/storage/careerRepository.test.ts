import { describe, expect, it } from "vitest";

import {
  careerReducer,
  createInitialCareerState,
} from "../domain/careerReducer";
import type { CareerState } from "../domain/model";
import {
  ACTIVE_CAREER_STORAGE_KEY,
  CAREER_SCHEMA_VERSION,
  createCareerRepository,
  type StorageLike,
} from "./careerRepository";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function reachFirstDecision(seed: string): CareerState {
  let state = createInitialCareerState(seed);
  state = careerReducer(state, { type: "begin_setup" });
  state = careerReducer(state, {
    nationality: "CHN",
    type: "select_nationality",
  });
  state = careerReducer(state, { type: "continue_setup" });
  state = careerReducer(state, {
    foot: "left",
    name: "林一鸣",
    number: "9",
    type: "update_identity",
  });
  state = careerReducer(state, { type: "continue_setup" });
  state = careerReducer(state, {
    position: "ST",
    type: "select_position",
  });
  return careerReducer(state, { type: "start_career" });
}

describe("career repository", () => {
  it("round-trips the exact active state in a versioned envelope", () => {
    const storage = new MemoryStorage();
    const repository = createCareerRepository(storage);
    const state = reachFirstDecision("phase-1:storage");

    expect(repository.save(state)).toEqual({ ok: true });

    const raw = storage.getItem(ACTIVE_CAREER_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({
      choiceLog: state.choiceLog,
      contentVersion: state.contentVersion,
      rngState: state.rngState,
      schemaVersion: CAREER_SCHEMA_VERSION,
      seed: state.seed,
    });

    const loaded = repository.load();
    expect(loaded.status).toBe("ready");

    if (loaded.status !== "ready") {
      throw new Error("Expected a ready career");
    }

    expect(JSON.stringify(loaded.state)).toBe(JSON.stringify(state));
  });

  it("preserves and quarantines corrupt JSON without deleting the active key", () => {
    const storage = new MemoryStorage();
    const repository = createCareerRepository(storage);
    const raw = '{"schemaVersion":1,"state":';
    storage.setItem(ACTIVE_CAREER_STORAGE_KEY, raw);

    const loaded = repository.load();
    expect(loaded).toMatchObject({
      raw,
      status: "corrupt",
    });

    if (loaded.status !== "corrupt") {
      throw new Error("Expected corrupt recovery state");
    }

    expect(storage.getItem(ACTIVE_CAREER_STORAGE_KEY)).toBe(raw);
    expect(loaded.quarantineKey).not.toBeNull();
    expect(storage.getItem(loaded.quarantineKey!)).toBe(raw);
  });

  it("preserves and quarantines an unsupported schema version", () => {
    const storage = new MemoryStorage();
    const repository = createCareerRepository(storage);
    const raw = JSON.stringify({
      schemaVersion: CAREER_SCHEMA_VERSION + 1,
      state: {},
    });
    storage.setItem(ACTIVE_CAREER_STORAGE_KEY, raw);

    const loaded = repository.load();
    expect(loaded).toMatchObject({
      raw,
      schemaVersion: CAREER_SCHEMA_VERSION + 1,
      status: "unsupported",
    });

    if (loaded.status !== "unsupported") {
      throw new Error("Expected unsupported recovery state");
    }

    expect(storage.getItem(ACTIVE_CAREER_STORAGE_KEY)).toBe(raw);
    expect(loaded.quarantineKey).not.toBeNull();
    expect(storage.getItem(loaded.quarantineKey!)).toBe(raw);
  });
});
