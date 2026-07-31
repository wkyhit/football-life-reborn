import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CLASSIC_TOKENS = join(
  ROOT,
  "src",
  "ui",
  "classic",
  "tokens.css",
);
const CLASSIC_CAREER = join(
  ROOT,
  "src",
  "ui",
  "classic",
  "CareerScreen.tsx",
);
const ENHANCED_SUMMARY = join(
  ROOT,
  "src",
  "ui",
  "enhanced",
  "summary",
  "EnhancedSummaryScreen.tsx",
);
const STYLES = join(ROOT, "src", "styles.css");
const ACCEPTANCE = join(
  ROOT,
  "docs",
  "deployment",
  "preview-acceptance.md",
);

describe("Vercel Preview journey contract", () => {
  it("keeps Classic supporting text readable on every landing surface", () => {
    const css = readFileSync(CLASSIC_TOKENS, "utf8");
    const canvas = readOklch(css, "--classic-canvas");
    const surface = readOklch(css, "--classic-surface");
    const muted = readOklch(css, "--classic-muted");
    const accentSoft = readOklch(
      css,
      "--classic-accent-soft",
    );
    const backgrounds = [
      canvas.rgb,
      composite(surface, canvas.rgb, 0.6),
      composite(accentSoft, canvas.rgb, accentSoft.alpha),
    ];

    for (const background of backgrounds) {
      expect(contrast(muted.rgb, background)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("keeps low-priority Classic text and its scroll region accessible", () => {
    const styles = readFileSync(STYLES, "utf8");
    const career = readFileSync(CLASSIC_CAREER, "utf8");

    expect(styles).toContain(
      '[data-ui-mode="classic"]\n  :where(.text-zinc-500, .text-zinc-600, .text-zinc-700, .text-zinc-800)',
    );
    expect(styles).toContain("color: var(--classic-muted);");
    expect(career).toContain('tabIndex={0}');
  });

  it("makes the Enhanced summary record and named rating group reachable", () => {
    const summary = readFileSync(ENHANCED_SUMMARY, "utf8");

    expect(summary).toContain(
      'className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-enhanced-focus"\n        tabIndex={0}',
    );
    expect(summary).toContain('role="group"');
    expect(summary).toContain(
      "aria-label={`生涯最高能力 ${view.maxOverall}`}",
    );
  });

  it("versions the complete ego-browser Preview acceptance matrix", () => {
    const acceptance = readFileSync(ACCEPTANCE, "utf8");
    const requiredStories = [
      "attacker-career",
      "mid-career-resume",
      "share-card",
      "archive-round-trip",
      "parallel-branch",
      "one-club-challenge",
      "replay-deep-link",
      "ui-resilience",
    ];
    const requiredChecks = [
      "Classic",
      "Enhanced",
      "320, 375, 414, 768, 1280, and 1440",
      "200% reflow",
      "prefers-reduced-motion",
      "axe-core",
      "console",
      "network",
      "ego-browser",
    ];

    expect(acceptance).toContain("## Preview story matrix");
    for (const story of requiredStories) {
      expect(acceptance).toContain(`\`${story}\``);
    }
    for (const check of requiredChecks) {
      expect(acceptance).toContain(check);
    }
    expect(acceptance).toContain(
      "Production builds do not publish `visual.html`",
    );
  });
});

type Rgb = readonly [number, number, number];

type OklchColor = {
  readonly alpha: number;
  readonly rgb: Rgb;
};

function readOklch(
  css: string,
  token: string,
): OklchColor {
  const match = css.match(
    new RegExp(
      `${token}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)`,
      "u",
    ),
  );

  expect(match, `Missing ${token}`).not.toBeNull();
  const [, lightness, chroma, hue, alpha = "1"] = match!;

  return {
    alpha: Number(alpha),
    rgb: oklchToSrgb(
      Number(lightness),
      Number(chroma),
      Number(hue),
    ),
  };
}

function oklchToSrgb(
  lightness: number,
  chroma: number,
  hue: number,
): Rgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lBase =
    lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mBase =
    lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sBase =
    lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lBase ** 3;
  const m = mBase ** 3;
  const s = sBase ** 3;

  return [
    encodeSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encodeSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encodeSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function encodeSrgb(value: number): number {
  const encoded =
    value <= 0.0031308
      ? 12.92 * value
      : 1.055 * value ** (1 / 2.4) - 0.055;

  return Math.min(1, Math.max(0, encoded));
}

function composite(
  foreground: OklchColor,
  background: Rgb,
  alpha: number,
): Rgb {
  return foreground.rgb.map(
    (channel, index) =>
      channel * alpha + background[index]! * (1 - alpha),
  ) as unknown as Rgb;
}

function contrast(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function luminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map(decodeSrgb) as unknown as Rgb;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function decodeSrgb(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}
