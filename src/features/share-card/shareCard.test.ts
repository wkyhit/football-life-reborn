import { createCanvas } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import { playClassicCareer } from "../../domain/classicEngine";
import { createSummaryPresentation } from "../../ui/classic/summaryPresentation";
import {
  renderShareCardToCanvas,
  shareCardFilename,
  type ShareCardCanvas,
} from "./shareCard";
import { createShareCardStoryLines } from "./shareCardContract";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const QR_PAYLOAD = "https://football-life-reborn.test/";

describe("Classic share card", () => {
  it("renders a compact 1080 by 1720 PNG with a decodable site QR", () => {
    const view = createFixtureSummary();
    const canvas = createCanvas(1, 1);

    renderShareCardToCanvas(
      canvas as unknown as ShareCardCanvas,
      {
        displayName: "林一鸣",
        qrPayload: QR_PAYLOAD,
        view,
      },
    );

    const png = canvas.toBuffer("image/png");

    expect(Array.from(png.subarray(0, 8))).toEqual(PNG_SIGNATURE);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1720);
    expect(png.byteLength).toBeLessThan(1_500_000);

    const context = canvas.getContext("2d");
    expect(
      Array.from(context.getImageData(0, 0, 1, 1).data),
    ).toEqual([2, 4, 3, 255]);
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const decoded = jsQR(
      pixels.data,
      canvas.width,
      canvas.height,
      { inversionAttempts: "dontInvert" },
    );

    expect(decoded?.data).toBe(QR_PAYLOAD);

    const secondCanvas = createCanvas(1, 1);
    renderShareCardToCanvas(
      secondCanvas as unknown as ShareCardCanvas,
      {
        displayName: "林一鸣",
        qrPayload: QR_PAYLOAD,
        view,
      },
    );
    expect(secondCanvas.toBuffer("image/png").equals(png)).toBe(
      true,
    );
  });

  it("uses the editable display name in a stable download file name", () => {
    const view = createFixtureSummary();

    expect(shareCardFilename("  林一鸣  ", view)).toBe(
      "林一鸣-生涯战绩卡.png",
    );
    expect(shareCardFilename("   ", view)).toBe(
      `${view.identity.name}-生涯战绩卡.png`,
    );
  });

  it("uses the exact shared ending, percentile, narrative, and total income", () => {
    const view = createFixtureSummary();

    expect(createShareCardStoryLines(view)).toEqual({
      ending: view.story.ending.label,
      income: `总收入 ¥${view.story.totalIncome.toLocaleString("en-US")}`,
      narrative: view.story.chapters,
      percentile: `模拟生涯分位 P${view.story.simulatedPercentile.value}`,
    });
  });

  it("keeps a challenge replay in the QR and names the card for that challenge", () => {
    const view = createFixtureSummary();
    const canvas = createCanvas(1, 1);
    const replayUrl =
      "https://football-life-reborn.test/#r=challenge";
    const challenge = {
      calendarDate: "2026-07-30",
      status: "completed",
      title: "一人一城",
    } as const;

    renderShareCardToCanvas(
      canvas as unknown as ShareCardCanvas,
      {
        challenge,
        displayName: "林一鸣",
        qrPayload: replayUrl,
        view,
      },
    );

    const context = canvas.getContext("2d");
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const decoded = jsQR(
      pixels.data,
      canvas.width,
      canvas.height,
      { inversionAttempts: "dontInvert" },
    );

    expect(decoded?.data).toBe(replayUrl);
    expect(
      shareCardFilename("林一鸣", view, challenge),
    ).toBe("林一鸣-一人一城挑战卡.png");
  });
});

function createFixtureSummary() {
  return createSummaryPresentation(
    playClassicCareer({
      identity: {
        lastName: "林一鸣",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "phase-3:share-card",
    }),
  );
}
