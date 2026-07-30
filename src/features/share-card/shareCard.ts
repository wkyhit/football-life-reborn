import * as QRCode from "qrcode";

import type { BadgeTier } from "../../domain/summary";
import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";
import {
  shareCardFilename,
  type ShareCardInput,
} from "./shareCardContract";

export { shareCardFilename };
export type { ShareCardInput };

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1720;

type ShareCardContext = {
  fillStyle: string;
  font: string;
  imageSmoothingEnabled: boolean;
  lineWidth: number;
  strokeStyle: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  beginPath(): void;
  closePath(): void;
  fill(): void;
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
  fillText(
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ): void;
  lineTo(x: number, y: number): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(
    cpx: number,
    cpy: number,
    x: number,
    y: number,
  ): void;
  stroke(): void;
};

export type ShareCardCanvas = {
  height: number;
  width: number;
  getContext(type: "2d"): ShareCardContext | null;
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
const BADGE_LABEL: Readonly<Record<BadgeTier, string>> = {
  bronze: "无名之辈",
  cyan: "顶级球星",
  elite: "时代巨星",
  gold: "一方名将",
  silver: "站稳脚跟",
  special: "足球之神",
};
const BADGE_COLOR: Readonly<Record<BadgeTier, string>> = {
  bronze: "#b45309",
  cyan: "#06b6d4",
  elite: "#a855f7",
  gold: "#f59e0b",
  silver: "#a1a1aa",
  special: "#f43f5e",
};

export function renderShareCardToCanvas(
  canvas: ShareCardCanvas,
  input: ShareCardInput,
): void {
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Canvas2D is unavailable");
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = "#020403";
  context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  fillRoundedRect(
    context,
    44,
    42,
    SHARE_CARD_WIDTH - 88,
    SHARE_CARD_HEIGHT - 84,
    34,
    "#07110f",
  );
  strokeRoundedRect(
    context,
    44,
    42,
    SHARE_CARD_WIDTH - 88,
    SHARE_CARD_HEIGHT - 84,
    34,
    "#244038",
    2,
  );

  drawHeader(context, input);
  drawClubs(context, input.view);
  drawMetrics(context, input.view);
  drawAchievement(context, input.view);
  drawFooter(context, input);
}

export async function createShareCardBlob(
  input: ShareCardInput,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderShareCardToCanvas(
    canvas as unknown as ShareCardCanvas,
    input,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("The browser could not encode the share card"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function drawHeader(
  context: ShareCardContext,
  input: ShareCardInput,
): void {
  const { view } = input;
  const accent = BADGE_COLOR[view.badge];

  fillRoundedRect(context, 88, 96, 190, 190, 34, accent);
  drawText(context, "巅峰", 183, 132, {
    align: "center",
    color: "#fff7ed",
    size: 22,
    weight: 800,
  });
  drawText(context, String(view.maxOverall), 183, 232, {
    align: "center",
    color: "#ffffff",
    size: 82,
    weight: 900,
  });

  drawText(
    context,
    input.displayName.trim() || view.identity.name,
    314,
    156,
    {
      color: "#ffffff",
      maxWidth: 430,
      size: 54,
      weight: 900,
    },
  );
  drawText(
    context,
    `${view.seasonCount} 个赛季 · ${view.identity.position}`,
    314,
    208,
    {
      color: "#a1a1aa",
      maxWidth: 430,
      size: 25,
      weight: 600,
    },
  );
  fillRoundedRect(context, 314, 232, 100, 38, 10, "#f4f4f5");
  drawText(context, view.identity.country, 364, 258, {
    align: "center",
    color: "#18181b",
    size: 20,
    weight: 800,
  });
  fillRoundedRect(context, 426, 232, 118, 38, 10, "#064e3b");
  drawText(
    context,
    `#${view.identity.number} ${view.identity.position}`,
    485,
    258,
    {
      align: "center",
      color: "#6ee7b7",
      size: 19,
      weight: 800,
    },
  );

  drawText(context, "巅峰身价", 948, 134, {
    align: "right",
    color: "#a1a1aa",
    size: 21,
    weight: 700,
  });
  drawText(
    context,
    formatMarketValue(view.maxMarketValue),
    948,
    186,
    {
      align: "right",
      color: "#fde047",
      maxWidth: 250,
      size: 42,
      weight: 900,
    },
  );
}

function drawClubs(
  context: ShareCardContext,
  view: SummaryPresentation,
): void {
  drawText(context, "效 力 过", SHARE_CARD_WIDTH / 2, 358, {
    align: "center",
    color: "#a1a1aa",
    size: 21,
    weight: 700,
  });

  const clubs = view.clubs.slice(0, 5);
  const columnWidth = 176;
  const startX =
    SHARE_CARD_WIDTH / 2 -
    (columnWidth * Math.max(clubs.length - 1, 0)) / 2;

  clubs.forEach(({ club, trophyCount }, index) => {
    const center = startX + index * columnWidth;
    fillRoundedRect(
      context,
      center - 45,
      398,
      90,
      90,
      24,
      club.color,
    );
    drawText(context, club.abbreviation, center, 454, {
      align: "center",
      color: "#ffffff",
      maxWidth: 70,
      size: 24,
      weight: 900,
    });
    drawText(context, club.shortName, center, 530, {
      align: "center",
      color: "#f4f4f5",
      maxWidth: 150,
      size: 23,
      weight: 800,
    });
    drawText(
      context,
      `${trophyCount} 个赛季荣誉`,
      center,
      564,
      {
        align: "center",
        color: "#71717a",
        maxWidth: 150,
        size: 18,
        weight: 600,
      },
    );
  });
}

function drawMetrics(
  context: ShareCardContext,
  view: SummaryPresentation,
): void {
  fillRoundedRect(context, 88, 622, 904, 184, 24, "#15161a");

  view.metrics.forEach((metric, index) => {
    const center = 88 + (904 / 3) * (index + 0.5);

    if (index > 0) {
      context.fillStyle = "#27272a";
      context.fillRect(
        88 + (904 / 3) * index,
        654,
        2,
        120,
      );
    }

    drawText(context, metric.label, center, 680, {
      align: "center",
      color: "#a1a1aa",
      size: 22,
      weight: 700,
    });
    drawText(context, String(metric.value), center, 758, {
      align: "center",
      color: "#ffffff",
      size: 54,
      weight: 900,
    });
  });
}

function drawAchievement(
  context: ShareCardContext,
  view: SummaryPresentation,
): void {
  const title = view.titles[0];
  const label = title?.label ?? BADGE_LABEL[view.badge];
  const description =
    title?.description ?? "一步一步走完属于自己的职业生涯";
  const accent = BADGE_COLOR[view.badge];

  fillRoundedRect(context, 88, 850, 904, 258, 28, "#211b08");
  strokeRoundedRect(
    context,
    88,
    850,
    904,
    258,
    28,
    "#7c5f12",
    2,
  );
  drawText(
    context,
    title === undefined ? "生涯结局" : "特殊称号",
    SHARE_CARD_WIDTH / 2,
    910,
    {
      align: "center",
      color: "#facc15",
      size: 21,
      weight: 800,
    },
  );
  drawText(context, label, SHARE_CARD_WIDTH / 2, 982, {
    align: "center",
    color: "#facc15",
    maxWidth: 700,
    size: 52,
    weight: 900,
  });
  drawText(
    context,
    description,
    SHARE_CARD_WIDTH / 2,
    1034,
    {
      align: "center",
      color: accent,
      maxWidth: 760,
      size: 23,
      weight: 800,
    },
  );

  const honors = view.honors
    .slice(0, 4)
    .map((honor) =>
      honor.count > 1
        ? `${honor.label} ×${honor.count}`
        : honor.label,
    )
    .join(" · ");
  drawText(
    context,
    honors || "这段生涯没有奖杯，但每一步都算数",
    SHARE_CARD_WIDTH / 2,
    1080,
    {
      align: "center",
      color: "#fde68a",
      maxWidth: 790,
      size: 20,
      weight: 700,
    },
  );
}

function drawFooter(
  context: ShareCardContext,
  input: ShareCardInput,
): void {
  context.fillStyle = "#1f2937";
  context.fillRect(88, 1180, 904, 2);

  drawText(context, "走一遍你自己的球员生涯", 88, 1270, {
    color: "#f4f4f5",
    size: 29,
    weight: 900,
  });
  drawText(context, "足球生涯模拟器", 88, 1320, {
    color: "#a1a1aa",
    size: 22,
    weight: 600,
  });
  drawText(context, readableHost(input.qrPayload), 88, 1370, {
    color: "#34d399",
    maxWidth: 520,
    size: 23,
    weight: 800,
  });
  drawText(context, `生涯编号 ${input.view.seed}`, 88, 1448, {
    color: "#52525b",
    maxWidth: 600,
    size: 18,
    weight: 600,
  });

  drawQr(context, input.qrPayload, 710, 1260, 250);
}

function drawQr(
  context: ShareCardContext,
  payload: string,
  x: number,
  y: number,
  size: number,
): void {
  const code = QRCode.create(payload, {
    errorCorrectionLevel: "M",
  });
  const quietModules = 4;
  const moduleSize = Math.floor(
    size / (code.modules.size + quietModules * 2),
  );
  const renderedSize =
    moduleSize * (code.modules.size + quietModules * 2);
  const left = x + Math.floor((size - renderedSize) / 2);
  const top = y + Math.floor((size - renderedSize) / 2);

  fillRoundedRect(context, x, y, size, size, 18, "#ffffff");
  context.fillStyle = "#09090b";

  for (let row = 0; row < code.modules.size; row += 1) {
    for (
      let column = 0;
      column < code.modules.size;
      column += 1
    ) {
      if (code.modules.get(row, column) === 0) {
        continue;
      }

      context.fillRect(
        left + (column + quietModules) * moduleSize,
        top + (row + quietModules) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }
}

function drawText(
  context: ShareCardContext,
  text: string,
  x: number,
  y: number,
  options: {
    readonly align?: CanvasTextAlign;
    readonly color: string;
    readonly maxWidth?: number;
    readonly size: number;
    readonly weight: number;
  },
): void {
  context.fillStyle = options.color;
  context.font = `${options.weight} ${options.size}px ${FONT_STACK}`;
  context.textAlign = options.align ?? "left";
  context.textBaseline = "alphabetic";

  if (options.maxWidth === undefined) {
    context.fillText(text, x, y);
    return;
  }

  context.fillText(text, x, y, options.maxWidth);
}

function fillRoundedRect(
  context: ShareCardContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
): void {
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function strokeRoundedRect(
  context: ShareCardContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  lineWidth: number,
): void {
  roundedRectPath(context, x, y, width, height, radius);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function roundedRectPath(
  context: ShareCardContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const right = x + width;
  const bottom = y + height;
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(right - safeRadius, y);
  context.quadraticCurveTo(right, y, right, y + safeRadius);
  context.lineTo(right, bottom - safeRadius);
  context.quadraticCurveTo(
    right,
    bottom,
    right - safeRadius,
    bottom,
  );
  context.lineTo(x + safeRadius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function formatMarketValue(valueEuro: number): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function readableHost(payload: string): string {
  try {
    return new URL(payload).host;
  } catch {
    return payload;
  }
}
