import { describe, expect, it } from "vitest";

import {
  playClassicCareer,
  type ClassicCareerState,
} from "../../domain/classicEngine";
import {
  deterministicHash,
  fnv1a64,
  stableStringify,
} from "../../domain/deterministicHash";
import { ECONOMY_POLICY_VERSION } from "../../domain/economy/economyPolicy";
import { deriveDailyChallenge } from "../challenges/daily";
import {
  REPLAY_CODEC_VERSION,
  REPLAY_MAX_URL_LENGTH,
  createReplayUrl,
  decodeReplayHash,
  encodeReplayHash,
  type ReplayPayload,
} from "./codec";

const DAILY = deriveDailyChallenge({
  calendarDate: "2026-07-30",
  family: "one_club",
  version: 1,
});

describe("replay hash codec", () => {
  it("round-trips a versioned compact payload in a URL hash", () => {
    const payload = createPayload(
      playClassicCareer({
        identity: {
          firstName: "一",
          lastName: "林",
          nationalityFifaCode: "CHN",
          position: "ST",
          preferredNumber: 9,
        },
        mode: "normal",
        seed: DAILY.seed,
      }),
    );
    const hash = encodeReplayHash(payload);

    expect(REPLAY_CODEC_VERSION).toBe(2);
    expect(payload.economyPolicyVersion).toBe(
      ECONOMY_POLICY_VERSION,
    );
    expect(hash).toMatch(/^#r=[A-Za-z0-9_-]+$/);
    expect(hash.slice("#r=".length)).not.toContain("=");
    expect(decodeReplayHash(hash)).toEqual({
      payload,
      sourceCodecVersion: 2,
      status: "ready",
    });

    const url = createReplayUrl(
      "https://football-life-reborn.vercel.app/?ui=enhanced#old",
      payload,
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.has("r")).toBe(false);
    expect(parsed.hash).toBe(hash);
  });

  it("backfills a v1 replay wire with economy-v1 while preserving the football hash", () => {
    const payload = createPayload(
      playClassicCareer({
        identity: {
          lastName: "旧",
          nationalityFifaCode: "CHN",
          position: "CM",
          preferredNumber: 8,
        },
        mode: "normal",
        seed: DAILY.seed,
      }),
    );
    const v2Hash = encodeReplayHash(payload);
    const document = JSON.parse(
      decodeBase64Url(v2Hash.slice("#r=".length)),
    ) as Record<string, unknown>;
    const { e: _economy, ...withoutEconomy } = document;
    const legacy = withChecksum({
      ...withoutEconomy,
      v: 1,
    });
    const legacyHash = `#r=${encodeBase64Url(
      JSON.stringify(legacy),
    )}`;

    expect(decodeReplayHash(legacyHash)).toEqual({
      payload,
      sourceCodecVersion: 1,
      status: "ready",
    });
  });

  it("rejects corrupt alphabet, truncation, and oversized hashes", () => {
    const hash = encodeReplayHash(
      createPayload(
        playClassicCareer({
          identity: {
            lastName: "陈",
            nationalityFifaCode: "CHN",
            position: "CM",
            preferredNumber: 8,
          },
          mode: "express",
          seed: DAILY.seed,
        }),
      ),
    );
    const encoded = hash.slice("#r=".length);
    const removeCount =
      (encoded.length - 1) % 4 || 4;
    const truncated = encoded.slice(0, -removeCount);

    expect(
      decodeReplayHash(`${hash.slice(0, -1)}*`),
    ).toEqual({
      reason: "alphabet",
      status: "invalid",
    });
    expect(decodeReplayHash(`#r=${truncated}`)).toEqual({
      reason: "truncated",
      status: "invalid",
    });
    expect(
      decodeReplayHash(
        `#r=${"A".repeat(REPLAY_MAX_URL_LENGTH + 1)}`,
      ),
    ).toEqual({
      reason: "oversized",
      status: "invalid",
    });
  });

  it("rejects duplicate fields and a checksum mutation", () => {
    const hash = encodeReplayHash(
      createPayload(
        playClassicCareer({
          identity: {
            lastName: "周",
            nationalityFifaCode: "CHN",
            position: "GK",
            preferredNumber: 1,
          },
          mode: "normal",
          seed: DAILY.seed,
        }),
      ),
    );
    const raw = decodeBase64Url(hash.slice("#r=".length));
    const duplicate = `{"v":${REPLAY_CODEC_VERSION},${raw.slice(1)}`;
    const mutated = JSON.parse(raw) as Record<string, unknown>;
    mutated.s = "tampered-seed";

    expect(
      decodeReplayHash(`#r=${encodeBase64Url(duplicate)}`),
    ).toEqual({
      reason: "duplicate_field",
      status: "invalid",
    });
    expect(
      decodeReplayHash(
        `#r=${encodeBase64Url(JSON.stringify(mutated))}`,
      ),
    ).toEqual({
      reason: "checksum",
      status: "invalid",
    });
  });

  it("reports unsupported codec and content versions without replaying", () => {
    const hash = encodeReplayHash(
      createPayload(
        playClassicCareer({
          identity: {
            lastName: "吴",
            nationalityFifaCode: "CHN",
            position: "CB",
            preferredNumber: 5,
          },
          mode: "normal",
          seed: DAILY.seed,
        }),
      ),
    );
    const document = JSON.parse(
      decodeBase64Url(hash.slice("#r=".length)),
    ) as Record<string, unknown>;
    const codecMismatch = withChecksum({
      ...document,
      v: REPLAY_CODEC_VERSION + 1,
    });
    const contentMismatch = withChecksum({
      ...document,
      c: "future-classic-content",
    });
    const economyMismatch = withChecksum({
      ...document,
      e: "future-economy-policy",
    });

    expect(
      decodeReplayHash(
        `#r=${encodeBase64Url(JSON.stringify(codecMismatch))}`,
      ),
    ).toEqual({
      codecVersion: REPLAY_CODEC_VERSION + 1,
      reason: "codec_version",
      status: "unsupported",
    });
    expect(
      decodeReplayHash(
        `#r=${encodeBase64Url(JSON.stringify(contentMismatch))}`,
      ),
    ).toEqual({
      contentVersion: "future-classic-content",
      reason: "content_version",
      status: "unsupported",
    });
    expect(
      decodeReplayHash(
        `#r=${encodeBase64Url(JSON.stringify(economyMismatch))}`,
      ),
    ).toEqual({
      economyPolicyVersion: "future-economy-policy",
      reason: "economy_policy",
      status: "unsupported",
    });
  });

  it("keeps a maximum-length real Classic career URL at or below 1,800 characters", () => {
    const completed = playClassicCareer({
      identity: {
        firstName: "十二字符",
        lastName: "最长名字",
        nationalityFifaCode: "CHN",
        position: "GK",
        preferredNumber: 99,
      },
      mode: "long",
      seed: deriveDailyChallenge({
        calendarDate: "2026-12-31",
        family: "goalkeeper_legend",
        version: 1,
      }).seed,
    });
    const url = createReplayUrl(
      "https://football-life-reborn.vercel.app/?ui=enhanced",
      createPayload(completed, {
        challengeId:
          "daily-v1-2026-12-31-goalkeeper_legend",
      }),
    );

    expect(completed.choiceLog.length).toBeGreaterThanOrEqual(
      20,
    );
    expect(url.length).toBeLessThanOrEqual(
      REPLAY_MAX_URL_LENGTH,
    );
  });
});

function createPayload(
  career: ClassicCareerState,
  overrides: Partial<ReplayPayload> = {},
): ReplayPayload {
  return {
    challengeId: DAILY.id,
    choiceLog: career.choiceLog.map(
      ({ forcedOutcome, optionId }) => ({
        ...(forcedOutcome === undefined
          ? {}
          : { forcedOutcome }),
        optionId,
      }),
    ),
    contentVersion: career.contentVersion,
    economyPolicyVersion: ECONOMY_POLICY_VERSION,
    identity: career.identity,
    mode: career.mode,
    seed: career.seed,
    stateHash: deterministicHash(career),
    ...overrides,
  };
}

function withChecksum(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const { x: _checksum, ...unsigned } = value;

  return {
    ...unsigned,
    x: fnv1a64(stableStringify(unsigned)),
  };
}

function decodeBase64Url(value: string): string {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (item) =>
    item.charCodeAt(0),
  );

  return new TextDecoder().decode(bytes);
}

function encodeBase64Url(value: string): string {
  const binary = Array.from(new TextEncoder().encode(value))
    .map((byte) => String.fromCharCode(byte))
    .join("");

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
