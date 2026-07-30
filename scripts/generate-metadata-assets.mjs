import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

const ROOT_DIRECTORY = dirname(
  dirname(fileURLToPath(import.meta.url)),
);
const PUBLIC_DIRECTORY = join(ROOT_DIRECTORY, "public");
const ICON_DIRECTORY = join(PUBLIC_DIRECTORY, "icons");
const CJK_FONT_FAMILY = "Football Life CJK";

const COLORS = Object.freeze({
  amber: "#fbbf24",
  amberDark: "#713f12",
  emerald: "#34d399",
  emeraldDark: "#052e2b",
  muted: "#a1a1aa",
  panel: "#18181b",
  panelStrong: "#27272a",
  surface: "#09090b",
  white: "#fafafa",
  zinc: "#3f3f46",
});

registerCjkFont();
await mkdir(ICON_DIRECTORY, { recursive: true });

await Promise.all([
  writePng(
    join(ICON_DIRECTORY, "apple-touch-icon.png"),
    drawAppIcon(180),
  ),
  writePng(
    join(ICON_DIRECTORY, "icon-192.png"),
    drawAppIcon(192),
  ),
  writePng(
    join(ICON_DIRECTORY, "icon-512.png"),
    drawAppIcon(512),
  ),
  writePng(
    join(PUBLIC_DIRECTORY, "social-card.png"),
    drawSocialCard(),
  ),
]);

function drawAppIcon(size) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  const unit = size / 64;

  context.fillStyle = COLORS.surface;
  context.fillRect(0, 0, size, size);

  roundedRectangle(
    context,
    7 * unit,
    7 * unit,
    50 * unit,
    50 * unit,
    11 * unit,
  );
  context.fillStyle = COLORS.emeraldDark;
  context.fill();
  context.lineWidth = 2 * unit;
  context.strokeStyle = COLORS.emerald;
  context.stroke();

  context.beginPath();
  context.moveTo(32 * unit, 8 * unit);
  context.lineTo(32 * unit, 56 * unit);
  context.moveTo(8 * unit, 32 * unit);
  context.lineTo(56 * unit, 32 * unit);
  context.strokeStyle = "rgba(52, 211, 153, 0.65)";
  context.lineWidth = 1.25 * unit;
  context.stroke();

  context.beginPath();
  context.arc(
    32 * unit,
    32 * unit,
    10 * unit,
    0,
    Math.PI * 2,
  );
  context.fillStyle = COLORS.surface;
  context.fill();
  context.strokeStyle = COLORS.amber;
  context.lineWidth = 2 * unit;
  context.stroke();

  drawBallMark(context, 32 * unit, 32 * unit, unit);

  return canvas;
}

function drawBallMark(context, centerX, centerY, unit) {
  const points = Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 5;
    return [
      centerX + Math.cos(angle) * 5 * unit,
      centerY + Math.sin(angle) * 5 * unit,
    ];
  });

  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();
  context.fillStyle = COLORS.amber;
  context.fill();

  context.beginPath();
  context.arc(centerX, centerY, 2 * unit, 0, Math.PI * 2);
  context.fillStyle = COLORS.surface;
  context.fill();
}

function drawSocialCard() {
  const canvas = createCanvas(1200, 630);
  const context = canvas.getContext("2d");

  context.fillStyle = COLORS.surface;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = COLORS.emerald;
  context.fillRect(0, 0, 10, canvas.height);
  context.fillStyle = COLORS.amber;
  context.fillRect(10, 0, 4, canvas.height);

  drawKicker(context);
  drawHeadline(context);
  drawStats(context);
  drawArchivePanel(context);

  return canvas;
}

function drawKicker(context) {
  roundedRectangle(context, 66, 60, 306, 36, 18);
  context.fillStyle = COLORS.emeraldDark;
  context.fill();
  context.strokeStyle = COLORS.emerald;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = COLORS.emerald;
  context.font =
    '600 15px "SFMono-Regular", "Menlo", monospace';
  drawTrackedText(
    context,
    "FOOTBALL LIFE · REBORN",
    84,
    84,
    1.6,
  );
}

function drawHeadline(context) {
  context.fillStyle = COLORS.white;
  context.font =
    `700 64px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText("每个选择，", 64, 181);
  context.fillStyle = COLORS.amber;
  context.fillText("写成同一条生涯", 64, 256);

  context.fillStyle = COLORS.muted;
  context.font =
    `400 23px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText(
    "相同 seed + choiceLog + contentVersion",
    66,
    318,
  );
  context.fillStyle = COLORS.white;
  context.font =
    `500 23px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText("始终重放完全一致的足球职业生涯", 66, 354);
}

function drawStats(context) {
  const stats = [
    ["61", "国家"],
    ["192", "俱乐部"],
    ["12", "位置"],
  ];

  stats.forEach(([value, label], index) => {
    const x = 66 + index * 156;

    context.fillStyle = COLORS.white;
    context.font =
      '700 31px "SF Pro Display", "Arial", sans-serif';
    context.fillText(value, x, 452);

    context.fillStyle = COLORS.muted;
    context.font =
      `500 16px "${CJK_FONT_FAMILY}", sans-serif`;
    context.fillText(label, x, 480);

    if (index < stats.length - 1) {
      context.fillStyle = COLORS.zinc;
      context.fillRect(x + 118, 425, 1, 58);
    }
  });

  context.fillStyle = COLORS.muted;
  context.font =
    '500 14px "SFMono-Regular", "Menlo", monospace';
  drawTrackedText(
    context,
    "LOCAL FIRST · DETERMINISTIC · REPLAYABLE",
    66,
    556,
    1.1,
  );
}

function drawArchivePanel(context) {
  roundedRectangle(context, 674, 52, 466, 526, 22);
  context.fillStyle = COLORS.panel;
  context.fill();
  context.strokeStyle = COLORS.zinc;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = COLORS.muted;
  context.font =
    '600 14px "SFMono-Regular", "Menlo", monospace';
  drawTrackedText(context, "SEASON ARCHIVE / 2040", 710, 93, 1.2);

  context.fillStyle = COLORS.white;
  context.font =
    `700 28px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText("传奇前锋 · 生涯档案", 710, 139);

  drawRating(context);
  drawSeasonLine(context, 710, 244, "2038", "上海海港", "冠军", true);
  drawSeasonLine(context, 710, 316, "2039", "利物浦", "金靴", false);
  drawSeasonLine(context, 710, 388, "2040", "皇家马德里", "决赛", true);

  roundedRectangle(context, 710, 449, 394, 86, 13);
  context.fillStyle = COLORS.emeraldDark;
  context.fill();
  context.strokeStyle = COLORS.emerald;
  context.stroke();

  context.fillStyle = COLORS.emerald;
  context.font =
    '600 13px "SFMono-Regular", "Menlo", monospace';
  drawTrackedText(context, "NEXT DECISION", 730, 479, 1.2);

  context.fillStyle = COLORS.white;
  context.font =
    `600 19px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText("留下续写，还是迎接新挑战？", 730, 512);
}

function drawRating(context) {
  roundedRectangle(context, 710, 165, 394, 48, 10);
  context.fillStyle = COLORS.panelStrong;
  context.fill();

  context.fillStyle = COLORS.muted;
  context.font =
    `500 14px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText("生涯评分", 728, 195);

  context.fillStyle = COLORS.amber;
  context.font =
    '700 25px "SF Pro Display", "Arial", sans-serif';
  context.fillText("92", 1010, 197);
}

function drawSeasonLine(
  context,
  x,
  y,
  year,
  club,
  result,
  highlighted,
) {
  context.fillStyle = highlighted
    ? COLORS.emerald
    : COLORS.zinc;
  context.fillRect(x, y - 4, 3, 44);

  context.fillStyle = COLORS.muted;
  context.font =
    '600 13px "SFMono-Regular", "Menlo", monospace';
  context.fillText(year, x + 20, y + 8);

  context.fillStyle = COLORS.white;
  context.font =
    `600 18px "${CJK_FONT_FAMILY}", sans-serif`;
  context.fillText(club, x + 86, y + 10);

  roundedRectangle(context, x + 310, y - 10, 84, 30, 15);
  context.fillStyle = highlighted
    ? COLORS.amberDark
    : COLORS.panelStrong;
  context.fill();
  context.fillStyle = highlighted
    ? COLORS.amber
    : COLORS.muted;
  context.font =
    `600 13px "${CJK_FONT_FAMILY}", sans-serif`;
  context.textAlign = "center";
  context.fillText(result, x + 352, y + 10);
  context.textAlign = "start";
}

function drawTrackedText(context, value, x, y, tracking) {
  let cursor = x;

  for (const character of value) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + tracking;
  }
}

function roundedRectangle(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

async function writePng(path, canvas) {
  await writeFile(path, canvas.toBuffer("image/png"));
}

function registerCjkFont() {
  const configuredPath =
    process.env.FOOTBALL_LIFE_CJK_FONT?.trim();
  const candidates = [
    configuredPath,
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "C:\\Windows\\Fonts\\msyh.ttc",
  ].filter(
    (candidate) =>
      candidate !== undefined &&
      candidate.length > 0 &&
      existsSync(candidate),
  );
  const fontPath = candidates[0];

  if (
    fontPath === undefined ||
    GlobalFonts.registerFromPath(
      fontPath,
      CJK_FONT_FAMILY,
    ) === null
  ) {
    throw new Error(
      "A CJK font is required. Set FOOTBALL_LIFE_CJK_FONT to a local font path.",
    );
  }
}
