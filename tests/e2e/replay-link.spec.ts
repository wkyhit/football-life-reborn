import { expect, test } from "@playwright/test";

import {
  playClassicCareer,
  type ClassicIdentity,
} from "../../src/domain/classicEngine";
import type { PacingMode } from "../../src/domain/pacing";
import {
  deriveDailyChallenge,
  type DailyChallengeFamily,
} from "../../src/features/challenges/daily";
import {
  REPLAY_MAX_URL_LENGTH,
  createReplayUrl,
} from "../../src/features/replay/codec";
import { createReplayPayload } from "../../src/features/replay/replay";

const REPLAYS = [
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

for (const fixture of REPLAYS) {
  test(`replays ${fixture.mode} ${fixture.family} with storage disabled`, async ({
    page,
  }) => {
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
    const replayUrl = createReplayUrl(
      "http://127.0.0.1:4173/",
      createReplayPayload({
        career,
        challengeId: challenge.id,
      }),
    );
    const requests: string[] = [];
    page.on("request", (request) =>
      requests.push(request.url()),
    );
    await page.addInitScript(() => {
      const unavailable = () => {
        throw new DOMException(
          "Storage is disabled",
          "SecurityError",
        );
      };
      Storage.prototype.getItem = unavailable;
      Storage.prototype.setItem = unavailable;
      Storage.prototype.removeItem = unavailable;
    });

    await page.goto(replayUrl);

    await expect(
      page.getByRole("heading", {
        name: fixture.identity.lastName,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("只读确定性回放"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", {
        name: /挑战进度$/,
      }),
    ).toHaveAttribute(
      "data-challenge-family",
      fixture.family,
    );
    await expect(
      page.getByLabel("挑战回放链接"),
    ).toHaveValue(replayUrl);
    expect(replayUrl.length).toBeLessThanOrEqual(
      REPLAY_MAX_URL_LENGTH,
    );
    expect(
      requests.every((request) => !request.includes("#r=")),
    ).toBe(true);
    expect(
      requests.filter((request) =>
        new URL(request).pathname.startsWith("/api/"),
      ),
    ).toEqual([]);
  });
}

test("shows recovery guidance for a corrupt replay Hash", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException(
        "Storage is disabled",
        "SecurityError",
      );
    };
  });
  await page.goto("/#r=invalid*");

  await expect(
    page.getByRole("heading", {
      name: "回放链接损坏",
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "请向分享者重新获取完整链接",
  );
});
