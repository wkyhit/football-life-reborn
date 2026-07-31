import { describe, expect, it } from "vitest";

import {
  createNewCareerSeed,
  resolveSeedIntent,
  seedFromSearch,
  urlWithSeed,
} from "./seed";

describe("career Seed intent", () => {
  it("distinguishes an unrelated explicit URL Seed from a recoverable career", () => {
    expect(
      resolveSeedIntent(
        "?ui=enhanced&seed=%20url-life%20",
        "saved-life",
      ),
    ).toEqual({
      kind: "choose",
      newCareerSeed: "url-life",
      resumableSeed: "saved-life",
      source: "url",
    });
  });

  it("resumes without an explicit Seed and also recognizes the same URL Seed", () => {
    expect(
      resolveSeedIntent("?ui=enhanced", "saved-life"),
    ).toEqual({
      kind: "resume",
      newCareerSeed: "phase-1-default",
      resumableSeed: "saved-life",
      source: "saved",
    });
    expect(
      resolveSeedIntent(
        "?ui=enhanced&seed=saved-life",
        "saved-life",
      ),
    ).toEqual({
      kind: "resume",
      newCareerSeed: "saved-life",
      resumableSeed: "saved-life",
      source: "url",
    });
  });

  it("starts a URL or default Seed when no career can be resumed", () => {
    expect(resolveSeedIntent("?seed=url-life", null)).toEqual({
      kind: "new",
      newCareerSeed: "url-life",
      resumableSeed: null,
      source: "url",
    });
    expect(resolveSeedIntent("", null)).toEqual({
      kind: "new",
      newCareerSeed: "phase-1-default",
      resumableSeed: null,
      source: "default",
    });
    expect(seedFromSearch(`?seed=${"x".repeat(160)}`)).toHaveLength(
      128,
    );
  });

  it("creates a deterministic, bounded, distinct new-life Seed from injected entropy", () => {
    const entropy = () => ` ${"a".repeat(180)} `;
    const first = createNewCareerSeed("saved-life", entropy);
    const second = createNewCareerSeed("saved-life", entropy);

    expect(first).toBe(second);
    expect(first).toMatch(/^career:/);
    expect(first).toHaveLength(128);
    expect(first).not.toBe("saved-life");
    expect(
      createNewCareerSeed("career:fixed-id", () => "fixed-id"),
    ).toBe("career:fixed-id:next");
  });

  it("persists the chosen Seed while retaining other URL state", () => {
    const updated = new URL(
      urlWithSeed(
        "https://example.test/play?ui=enhanced&seed=old#record",
        "new life",
      ),
    );

    expect(updated.pathname).toBe("/play");
    expect(updated.searchParams.get("ui")).toBe("enhanced");
    expect(updated.searchParams.get("seed")).toBe("new life");
    expect(updated.hash).toBe("#record");
  });
});
