import { describe, expect, it } from "vitest";

import {
  replayClassicCareer,
  type ClassicCareerState,
} from "../../domain/classicEngine";
import {
  deterministicHash,
  stableStringify,
} from "../../domain/deterministicHash";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";
import { ECONOMY_POLICY_VERSION } from "../../domain/economy/economyPolicy";
import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import {
  REPLAY_MAX_URL_LENGTH,
  createReplayUrl,
  type ReplayPayload,
} from "./codec";
import {
  createReplayPayload,
  replayChallengePayload,
} from "./replay";

const GOLDEN_FIXTURES = [
  CLASSIC_GOLDEN_FIXTURES[0]!,
  CLASSIC_GOLDEN_FIXTURES.find(
    (fixture) =>
      fixture.category === "matrix" &&
      fixture.roleGroup === "goalkeeper" &&
      fixture.mode === "express",
  )!,
  CLASSIC_GOLDEN_FIXTURES.find(
    (fixture) =>
      fixture.category === "special" &&
      fixture.specialPath === "suspension-redemption",
  )!,
] as const;

describe("challenge replay", () => {
  it.each(GOLDEN_FIXTURES)(
    "reconstructs golden fixture $id through public reducer actions",
    (fixture) => {
      const original = replayFixture(fixture);
      const payload = createReplayPayload({
        career: original,
        challengeId:
          "daily-v1-2026-07-30-one_club",
      });
      const replayed = replayChallengePayload(payload);

      expect(replayed.status).toBe("ready");

      if (replayed.status !== "ready") {
        throw new Error("Expected ready challenge replay");
      }

      expect(replayed.career).not.toBe(original);
      expect(stableStringify(replayed.career)).toBe(
        stableStringify(original),
      );
      expect(replayed.career.choiceLog).toEqual(
        fixture.choices,
      );
      expect(replayed.stateHash).toBe(
        deterministicHash(original),
      );
      expect(replayed.economy).toEqual(
        createCareerEconomyProjection(original),
      );
      expect(replayed.economyPolicyVersion).toBe(
        ECONOMY_POLICY_VERSION,
      );
      expect("career" in payload).toBe(false);
      expect("state" in payload).toBe(false);
    },
  );

  it("detects a tampered compact choice before applying it", () => {
    const original = replayFixture(GOLDEN_FIXTURES[0]);
    const payload = createReplayPayload({
      career: original,
      challengeId:
        "daily-v1-2026-07-30-asian_glory",
    });
    const tampered: ReplayPayload = {
      ...payload,
      choiceLog: [
        {
          ...payload.choiceLog[0]!,
          optionId: "join:not-an-academy-offer",
        },
        ...payload.choiceLog.slice(1),
      ],
    };

    expect(replayChallengePayload(tampered)).toMatchObject({
      choiceIndex: 0,
      decisionId: "decision-0-16-academy_offer",
      optionId: "join:not-an-academy-offer",
      reason: "choice_not_available",
      status: "invalid",
    });
  });

  it("detects a valid path paired with a mismatched final state hash", () => {
    const original = replayFixture(GOLDEN_FIXTURES[1]);
    const payload = createReplayPayload({
      career: original,
      challengeId:
        "daily-v1-2026-07-30-goalkeeper_legend",
    });

    expect(
      replayChallengePayload({
        ...payload,
        stateHash: "fnv1a64:0000000000000000",
      }),
    ).toEqual({
      actualStateHash: deterministicHash(original),
      expectedStateHash: "fnv1a64:0000000000000000",
      reason: "state_hash",
      status: "invalid",
    });
  });

  it("preserves forced outcomes and keeps the longest approved fixture URL within budget", () => {
    const fixture = GOLDEN_FIXTURES[2];
    const original = replayFixture(fixture);
    const payload = createReplayPayload({
      career: original,
      challengeId:
        "daily-v1-2026-07-30-asian_glory",
    });
    const result = replayChallengePayload(payload);
    const url = createReplayUrl(
      "https://football-life-reborn.vercel.app/?ui=enhanced",
      payload,
    );

    expect(
      payload.choiceLog.filter(
        (choice) => choice.forcedOutcome !== undefined,
      ).length,
    ).toBeGreaterThan(0);
    expect(result.status).toBe("ready");
    expect(url.length).toBeLessThanOrEqual(
      REPLAY_MAX_URL_LENGTH,
    );
  });

  it("returns an explicit setup failure instead of hydrating invalid identity data", () => {
    const original = replayFixture(GOLDEN_FIXTURES[0]);
    const payload = createReplayPayload({
      career: original,
      challengeId:
        "daily-v1-2026-07-30-one_club",
    });

    expect(
      replayChallengePayload({
        ...payload,
        identity: {
          ...payload.identity,
          nationalityFifaCode: "ZZZ",
        },
      }),
    ).toMatchObject({
      reason: "invalid_setup",
      status: "invalid",
    });
  });

  it("rejects an incompatible economy policy before replaying the football path", () => {
    const original = replayFixture(GOLDEN_FIXTURES[0]);
    const payload = createReplayPayload({
      career: original,
      challengeId:
        "daily-v1-2026-07-30-one_club",
    });

    expect(
      replayChallengePayload({
        ...payload,
        economyPolicyVersion:
          "future-economy-policy",
      } as unknown as ReplayPayload),
    ).toEqual({
      actualEconomyPolicyVersion:
        "future-economy-policy",
      expectedEconomyPolicyVersion:
        ECONOMY_POLICY_VERSION,
      reason: "economy_policy",
      status: "invalid",
    });
  });
});

function replayFixture(
  fixture: (typeof GOLDEN_FIXTURES)[number],
): ClassicCareerState {
  return replayClassicCareer({
    choices: fixture.choices,
    contentVersion: fixture.contentVersion,
    identity: fixture.identity,
    mode: fixture.mode,
    seed: fixture.seed,
  });
}
