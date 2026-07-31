import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DESIGN_PATH = join(ROOT, "design.md");
const TOKENS_CSS_PATH = join(ROOT, "tokens.css");
const TOKENS_JSON_PATH = join(ROOT, "tokens.json");
const STYLES_PATH = join(ROOT, "src", "styles.css");
const HALLMARK_LOG_PATH = join(
  ROOT,
  ".hallmark",
  "log.json",
);
const ENHANCED_PRESENTATION_FILES = [
  "src/features/archive/EnhancedArchiveScreen.tsx",
  "src/features/challenges/ChallengeProgressPanel.tsx",
  "src/features/replay/ReplayRouteScreen.tsx",
  "src/ui/enhanced/EnhancedOnboarding.tsx",
  "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
  "src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx",
  "src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx",
  "src/ui/enhanced/summary/EnhancedSummaryScreen.tsx",
] as const;

const REQUIRED_TOKENS = [
  "--color-paper",
  "--color-paper-2",
  "--color-paper-3",
  "--color-ink",
  "--color-ink-2",
  "--color-rule",
  "--color-rule-2",
  "--color-muted",
  "--color-neutral",
  "--color-accent",
  "--color-accent-ink",
  "--color-focus",
  "--color-warning",
  "--color-error",
  "--font-display",
  "--font-body",
  "--font-outlier",
  "--space-3xs",
  "--space-2xs",
  "--space-xs",
  "--space-sm",
  "--space-md",
  "--space-lg",
  "--space-xl",
  "--space-2xl",
  "--space-3xl",
  "--text-xs",
  "--text-sm",
  "--text-base",
  "--text-md",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
  "--text-display",
  "--ease-out",
  "--ease-in",
  "--ease-in-out",
  "--dur-micro",
  "--dur-short",
  "--dur-long",
  "--rule-hair",
  "--rule-fine",
  "--radius-card",
  "--radius-pill",
  "--radius-input",
  "--z-base",
  "--z-raised",
  "--z-sticky",
  "--z-modal",
  "--z-toast",
  "--z-tooltip",
] as const;

type DtcgToken = {
  readonly $type: string;
  readonly $value: string;
};

type DtcgTokens = {
  readonly $schema: string;
  readonly color: Record<string, DtcgToken>;
  readonly duration: Record<string, DtcgToken>;
  readonly font: Record<string, DtcgToken>;
  readonly radius: Record<string, DtcgToken>;
  readonly size: Record<string, DtcgToken>;
  readonly space: Record<string, DtcgToken>;
};

describe("Hallmark app-wide design system contract", () => {
  it("locks one approved system and its three route families", () => {
    expect(existsSync(DESIGN_PATH)).toBe(true);

    const design = readFileSync(DESIGN_PATH, "utf8");

    expect(design).toContain("Status: `approved`");
    expect(design).toContain("Genre: `playful`");
    expect(design).toContain(
      "Theme route: `custom (tuned)`",
    );
    expect(design).toContain(
      "night-match ledger, playful, exact, restrained",
    );
    expect(design).toContain(
      "Marketing/setup: `Narrative Workflow`",
    );
    expect(design).toContain(
      "App/workbench: `Workbench`",
    );
    expect(design).toContain(
      "Content/document: `Index-First`",
    );
    expect(design).toContain(
      "Display: `Big Shoulders Display`",
    );
    expect(design).toContain("Body: `Geist`");
    expect(design).toContain(
      "Outlier: `Geist Mono`",
    );
    expect(design).toContain(
      "default, hover, focus-visible, active, disabled, loading, error, success",
    );
    expect(design).toContain(
      "320, 375, 414, 768, 1280, and 1440",
    );
    expect(design).toContain("### Tailwind v4");
    expect(design).toContain("### DTCG");
    expect(design).toContain("### shadcn/ui");

    const log = JSON.parse(
      readFileSync(HALLMARK_LOG_PATH, "utf8"),
    ) as readonly Record<string, string>[];

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      design_system: "design.md",
      genre: "playful",
      macrostructure:
        "Narrative Workflow / Workbench / Index-First",
      scope: "app",
      theme: "custom",
      theme_axes:
        "dark / display-condensed-bold / chromatic-green",
    });
  });

  it("exports the complete token source without raw legacy colour syntax", () => {
    expect(existsSync(TOKENS_CSS_PATH)).toBe(true);

    const css = readFileSync(TOKENS_CSS_PATH, "utf8");

    for (const token of REQUIRED_TOKENS) {
      expect(css, `missing ${token}`).toContain(
        `${token}:`,
      );
    }

    expect(css).toContain(
      "theme: custom (tuned)",
    );
    expect(css).toContain(
      "axes: dark / display-condensed-bold / chromatic-green",
    );
    expect(css).toContain(
      '"Big Shoulders Display"',
    );
    expect(css).toContain('"Geist"');
    expect(css).toContain('"Geist Mono"');
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(css).not.toMatch(
      /\b(?:rgb|rgba|hsl|hsla)\(/i,
    );

    for (const declaration of css.matchAll(
      /(--color-[\w-]+):\s*([^;]+);/g,
    )) {
      expect(
        declaration[2],
        `${declaration[1]} must use OKLCH`,
      ).toMatch(/^oklch\(/);
    }
  });

  it("keeps the DTCG export aligned with the CSS source", () => {
    expect(existsSync(TOKENS_JSON_PATH)).toBe(true);

    const tokens = JSON.parse(
      readFileSync(TOKENS_JSON_PATH, "utf8"),
    ) as DtcgTokens;

    expect(tokens.$schema).toBe(
      "https://design-tokens.github.io/community-group/format/",
    );
    expect(tokens.color.paper).toEqual({
      $type: "color",
      $value: cssToken("--color-paper"),
    });
    expect(tokens.color.accent).toEqual({
      $type: "color",
      $value: cssToken("--color-accent"),
    });
    expect(tokens.color["accent-ink"]).toEqual({
      $type: "color",
      $value: cssToken("--color-accent-ink"),
    });
    expect(tokens.font.display.$value).toContain(
      "Big Shoulders Display",
    );
    expect(tokens.font.body.$value).toContain("Geist");
    expect(tokens.font.outlier.$value).toContain(
      "Geist Mono",
    );
    expect(tokens.space.md).toEqual({
      $type: "dimension",
      $value: cssToken("--space-md"),
    });
    expect(tokens.size["text-base"]).toEqual({
      $type: "dimension",
      $value: cssToken("--text-base"),
    });
    expect(tokens.duration.short).toEqual({
      $type: "duration",
      $value: cssToken("--dur-short"),
    });
    expect(tokens.radius.card).toEqual({
      $type: "dimension",
      $value: cssToken("--radius-card"),
    });
  });

  it("bridges the root tokens into Tailwind without redefining the Enhanced palette", () => {
    const styles = readFileSync(STYLES_PATH, "utf8");

    expect(styles).toContain(
      '@import "../tokens.css";',
    );
    expect(styles.indexOf('@import "../tokens.css";')).toBeLessThan(
      styles.indexOf('@import "tailwindcss";'),
    );
    expect(styles).toContain(
      "--color-enhanced-canvas: var(--color-paper);",
    );
    expect(styles).toContain(
      "--color-enhanced-surface: var(--color-paper-2);",
    );
    expect(styles).toContain(
      "--color-enhanced-raised: var(--color-paper-3);",
    );
    expect(styles).toContain(
      "--color-enhanced-strong: var(--color-ink);",
    );
    expect(styles).toContain(
      "--color-enhanced-supporting: var(--color-muted);",
    );
    expect(styles).toContain(
      "--color-enhanced-line: var(--color-rule);",
    );
    expect(styles).toContain(
      "--color-enhanced-pitch: var(--color-accent);",
    );
    expect(styles).toContain(
      "--color-enhanced-pitch-ink: var(--color-accent-ink);",
    );
    expect(styles).toContain(
      "--font-enhanced-display: var(--font-display);",
    );
    expect(styles).toContain(
      "--font-enhanced-body: var(--font-body);",
    );
    expect(styles).not.toMatch(
      /--color-enhanced-[\w-]+:\s*oklch\(/,
    );
  });

  it("scopes scale and easing overrides to Enhanced so Classic utilities retain their baseline values", () => {
    const css = readFileSync(TOKENS_CSS_PATH, "utf8");
    const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
    const enhancedBlock = css.match(
      /\[data-enhanced-shell\]\s*\{([\s\S]*?)\n\}/,
    )?.[1];

    expect(rootBlock).toBeDefined();
    expect(enhancedBlock).toBeDefined();
    expect(rootBlock).not.toContain("--text-2xl:");
    expect(rootBlock).not.toContain("--ease-out:");
    expect(enhancedBlock).toContain("--text-2xl:");
    expect(enhancedBlock).toContain("--ease-out:");
  });

  it("removes legacy palette and font improvisation from Enhanced owners", () => {
    const legacyUtility =
      /(?:text|bg|border|ring|divide|outline|shadow|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-|\/|\[|\b)/;
    const legacyFont = /\bfont-(?:sans|serif|mono)\b/;

    for (const relativePath of ENHANCED_PRESENTATION_FILES) {
      const source = readFileSync(
        join(ROOT, relativePath),
        "utf8",
      );

      expect(
        source,
        `${relativePath} contains a legacy palette utility`,
      ).not.toMatch(legacyUtility);
      expect(
        source,
        `${relativePath} contains an unscoped font utility`,
      ).not.toMatch(legacyFont);
    }
  });
});

function cssToken(name: string): string {
  const css = readFileSync(TOKENS_CSS_PATH, "utf8");
  const escaped = name.replaceAll("-", "\\-");
  const match = css.match(
    new RegExp(`${escaped}:\\s*([^;]+);`),
  );

  if (!match) {
    throw new Error(`Missing CSS token: ${name}`);
  }

  return match[1]!.trim();
}
