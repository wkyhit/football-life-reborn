import { describe, expect, it } from "vitest";

import {
  playClassicCareer,
  type ClassicCareerState,
  type ClassicIdentity,
} from "../../domain/classicEngine";
import {
  fnv1a64,
  stableStringify,
} from "../../domain/deterministicHash";
import type { PacingMode } from "../../domain/pacing";
import {
  deriveDailyChallenge,
  type DailyChallengeFamily,
} from "../challenges/daily";
import {
  encodeReplayHash,
  type ReplayPayload,
} from "./codec";
import { createReplayPayload } from "./replay";
import { resolveReplayRoute } from "./route";

const FIXTURES = [
  {
    family: "one_club",
    identity: {
      lastName: "沉浸前锋",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "long",
  },
  {
    family: "asian_glory",
    identity: {
      lastName: "标准前锋",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 10,
    },
    mode: "normal",
  },
  {
    family: "goalkeeper_legend",
    identity: {
      lastName: "速通门将",
      nationalityFifaCode: "CHN",
      position: "GK",
      preferredNumber: 1,
    },
    mode: "express",
  },
] as const satisfies readonly {
  readonly family: DailyChallengeFamily;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
}[];

describe("replay hash route", () => {
  it.each(FIXTURES)(
    "reconstructs $mode $family in a storage-independent route",
    (fixture) => {
      const { career, challenge, hash } = replayFixture(fixture);
      const route = resolveReplayRoute(hash);

      expect(route.status).toBe("ready");

      if (route.status !== "ready") {
        throw new Error("Expected a ready replay route");
      }

      expect(route.challenge).toEqual(challenge);
      expect(stableStringify(route.career)).toBe(
        stableStringify(career),
      );
      expect(route.career).not.toBe(career);
      expect(Object.isFrozen(route)).toBe(true);
    },
  );

  it("leaves non-replay fragments to normal page navigation", () => {
    expect(resolveReplayRoute("")).toEqual({
      status: "absent",
    });
    expect(resolveReplayRoute("#main-content")).toEqual({
      status: "absent",
    });
  });

  it("separates corrupt, incompatible, and tampered replay errors", () => {
    const { career, challenge } = replayFixture(FIXTURES[0]);
    const payload = createReplayPayload({
      career,
      challengeId: challenge.id,
    });
    const incompatible: ReplayPayload = {
      ...payload,
      challengeId: deriveDailyChallenge({
        calendarDate: challenge.calendarDate,
        family: "asian_glory",
        version: challenge.version,
      }).id,
    };
    const tampered: ReplayPayload = {
      ...payload,
      stateHash: "fnv1a64:0000000000000000",
    };

    expect(resolveReplayRoute("#r=invalid*")).toMatchObject({
      kind: "corrupt",
      status: "error",
      title: "回放链接损坏",
    });
    expect(
      resolveReplayRoute(encodeReplayHash(incompatible)),
    ).toMatchObject({
      kind: "incompatible",
      status: "error",
      title: "挑战信息不匹配",
    });
    expect(
      resolveReplayRoute(encodeReplayHash(tampered)),
    ).toMatchObject({
      kind: "tampered",
      status: "error",
      title: "回放校验失败",
    });
  });

  it("distinguishes unsupported codec and content versions", () => {
    const { hash } = replayFixture(FIXTURES[1]);
    const document = JSON.parse(
      decodeBase64Url(hash.slice("#r=".length)),
    ) as Record<string, unknown>;
    const codecHash = `#r=${encodeBase64Url(
      JSON.stringify({ ...document, v: 2 }),
    )}`;
    const contentHash = `#r=${encodeBase64Url(
      JSON.stringify(
        withChecksum({
          ...document,
          c: "future-classic-content",
        }),
      ),
    )}`;

    expect(resolveReplayRoute(codecHash)).toMatchObject({
      kind: "unsupported",
      status: "error",
      title: "回放版本暂不支持",
    });
    expect(resolveReplayRoute(contentHash)).toMatchObject({
      kind: "unsupported",
      status: "error",
      title: "内容版本不兼容",
    });
  });
});

function replayFixture(
  fixture: (typeof FIXTURES)[number],
): {
  readonly career: ClassicCareerState;
  readonly challenge: ReturnType<
    typeof deriveDailyChallenge
  >;
  readonly hash: string;
} {
  const challenge = deriveDailyChallenge({
    calendarDate: "2026-07-30",
    family: fixture.family,
    version: 1,
  });
  const career = playClassicCareer({
    identity: fixture.identity,
    mode: fixture.mode,
    seed: challenge.seed,
  });
  const hash = encodeReplayHash(
    createReplayPayload({
      career,
      challengeId: challenge.id,
    }),
  );

  return { career, challenge, hash };
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
