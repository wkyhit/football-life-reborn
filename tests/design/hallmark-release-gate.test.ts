import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const RELEASE_PATH = join(
  ROOT,
  ".hallmark",
  "release.json",
);
const PREFLIGHT_PATH = join(
  ROOT,
  ".hallmark",
  "preflight.json",
);
const AUDIT_PATH = join(
  ROOT,
  "docs",
  "design",
  "hallmark-audit.md",
);
const INVENTORY_PATH = join(
  ROOT,
  "tests",
  "visual",
  "enhanced",
  "after",
  "inventory.json",
);
const STYLES_PATH = join(ROOT, "src", "styles.css");
const TOKENS_PATH = join(ROOT, "tokens.css");
const README_PATH = join(ROOT, "README.md");

const GATE_IDS = [
  ...Array.from({ length: 38 }, (_, index) =>
    String(index + 1),
  ),
  "38a",
  ...Array.from({ length: 19 }, (_, index) =>
    String(index + 39),
  ),
] as const;

const REQUIRED_STAMPED_FILES = [
  "src/features/archive/EnhancedArchiveScreen.tsx",
  "src/features/replay/ReplayRouteScreen.tsx",
  "src/features/share-card/ShareCardOverlay.tsx",
  "src/ui/enhanced/EnhancedOnboarding.tsx",
  "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
  "src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx",
  "src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx",
  "src/ui/enhanced/recovery/EnhancedRecoveryScreen.tsx",
  "src/ui/enhanced/summary/EnhancedSummaryScreen.tsx",
] as const;

const ENHANCED_MOTION_FILES = [
  ...REQUIRED_STAMPED_FILES,
  "src/features/challenges/ChallengeProgressPanel.tsx",
  "src/ui/enhanced/components/EnhancedAction.tsx",
  "src/ui/enhanced/components/EnhancedStateSurface.tsx",
] as const;

type ReleaseGate = {
  readonly answer: "no";
  readonly evidence: readonly string[];
};

type HallmarkRelease = {
  readonly auditDate: string;
  readonly axes: {
    readonly execution: number;
    readonly hierarchy: number;
    readonly philosophy: number;
    readonly restraint: number;
    readonly specificity: number;
    readonly variety: number;
  };
  readonly findings: {
    readonly critical: number;
    readonly major: number;
    readonly minor: number;
  };
  readonly gates: Readonly<Record<string, ReleaseGate>>;
  readonly genre: string;
  readonly passed: number;
  readonly runner: string;
  readonly version: number;
};

describe("Hallmark Slice 6 release gate", () => {
  it("persists all 58 negative gate answers with concrete evidence", () => {
    expect(existsSync(RELEASE_PATH)).toBe(true);

    if (!existsSync(RELEASE_PATH)) {
      return;
    }

    const release = readJson<HallmarkRelease>(RELEASE_PATH);

    expect(release).toMatchObject({
      findings: {
        critical: 0,
        major: 0,
        minor: 0,
      },
      genre: "playful",
      passed: 58,
      runner: "ego-browser",
      version: 1,
    });
    expect(Date.parse(release.auditDate)).not.toBeNaN();
    expect(Object.keys(release.gates).sort(gateSort)).toEqual(
      [...GATE_IDS],
    );

    for (const id of GATE_IDS) {
      expect(
        release.gates[id],
        `missing Hallmark gate ${id}`,
      ).toMatchObject({
        answer: "no",
      });
      expect(
        release.gates[id]!.evidence.length,
        `gate ${id} needs evidence`,
      ).toBeGreaterThan(0);
    }

    for (const score of Object.values(release.axes)) {
      expect(score).toBeGreaterThanOrEqual(3);
      expect(score).toBeLessThanOrEqual(5);
    }
  });

  it("publishes the final audit verdict beside the preserved pre-redesign audit", () => {
    const audit = readFileSync(AUDIT_PATH, "utf8");

    expect(audit).toContain("## Final release audit");
    expect(audit).toContain("Runner: `ego-browser`");
    expect(audit).toContain(
      "Summary — 0 critical · 0 major · 0 minor",
    );
    expect(audit).toContain("Slop test — 58 / 58 ✓");
    expect(audit).toMatch(
      /Pre-emit critique — P[3-5] H[3-5] E[3-5] S[3-5] R[3-5] V[3-5]/,
    );
    expect(audit).toContain(
      "Classic compatibility — byte-identical screenshot",
    );
  });

  it("refreshes the pre-flight and stamps the released CSS truthfully", () => {
    const preflight = readJson<{
      readonly designSystem: {
        readonly hallmarkLog: string | null;
        readonly lockedRootDesign: string | null;
      };
      readonly releaseGate?: string;
    }>(PREFLIGHT_PATH);
    const styles = readFileSync(STYLES_PATH, "utf8");
    const leadingComment = styles.slice(0, 900);

    expect(preflight.designSystem).toEqual({
      hallmarkLog: ".hallmark/log.json",
      lockedRootDesign: "design.md",
    });
    expect(preflight.releaseGate).toBe(
      ".hallmark/release.json",
    );
    expect(leadingComment).toContain(
      "Hallmark · pre-emit critique:",
    );
    expect(leadingComment).toContain(
      "macrostructure: Narrative Workflow / Workbench / Index-First",
    );
    expect(leadingComment).toContain(
      "contrast: pass (40–41)",
    );
    expect(leadingComment).toContain(
      "nav: N7 · footer: Ft5 · slop: pass (42–45)",
    );
    expect(leadingComment).toContain(
      "honest: pass (46) · chrome: pass (47) · tokens: pass (48)",
    );
    expect(leadingComment).toContain(
      "responsive: pass (49) · icons: pass (30)",
    );
    expect(leadingComment).toContain(
      "mobile: pass (34, 49, 50–57)",
    );
  });

  it("keeps the implementation free of static universal slop tells", () => {
    const styles = readFileSync(STYLES_PATH, "utf8");
    const tokens = readFileSync(TOKENS_PATH, "utf8");
    const motionSources = ENHANCED_MOTION_FILES.map(
      enhancedSource,
    ).join("\n");
    const landing = source(
      "src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx",
    );

    expect(motionSources).not.toMatch(
      /\btransition-(?:all|colors)\b|transition\s*:\s*all/,
    );
    expect(motionSources).not.toMatch(
      /\b(?:hover|active):scale-/,
    );
    expect(motionSources).not.toMatch(/\bhover:/);
    expect(motionSources).not.toMatch(
      /(?:transition|animate)-\[[^\]]*(?:width|height|top|left|margin|padding)/,
    );
    expect(motionSources).not.toMatch(
      /\b(?:italic|font-style:\s*italic)\b/,
    );
    expect(styles).toMatch(
      /html:has\(\[data-enhanced-shell\]\),\s*\n\s*body:has\(\[data-enhanced-shell\]\)\s*\{\s*\n\s*overflow-x:\s*clip;/,
    );
    expect(styles).not.toContain("transition: all");
    expect(motionSources).not.toMatch(
      /\b(?:m[trblxy]?|p[trblxy]?|gap|space-[xy])-\d+\.5\b/,
    );
    expect(motionSources).not.toContain(
      "pb-[max(20px,env(safe-area-inset-bottom))]",
    );
    expect(styles).toMatch(
      /\[data-enhanced-shell\]\s+:is\(h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\)\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(styles).toMatch(
      /\[data-enhanced-shell\]\s+:where\(button,\s*a,\s*input,\s*select,\s*textarea\)\s*\{[^}]*outline:\s*2px solid transparent;[^}]*outline-offset:\s*1px;/s,
    );
    expect(styles).toMatch(
      /:where\(button,\s*a,\s*input,\s*select,\s*textarea\):focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus\);[^}]*outline-offset:\s*1px;/s,
    );
    expect(landing).toContain(
      "pt-6 pb-8",
    );
    expect(landing).toContain(
      "lg:pt-8 lg:pb-12",
    );
    expect(landing).toContain(
      'data-daily-challenge-record=""',
    );
    expect(landing).toContain(
      'data-daily-challenge-description=""',
    );

    const challengeButtonStart = landing.indexOf(
      "aria-label={`开始${definition.title}挑战`}",
    );
    const challengeButtonEnd = landing.indexOf(
      "</button>",
      challengeButtonStart,
    );

    expect(challengeButtonStart).toBeGreaterThan(-1);
    expect(challengeButtonEnd).toBeGreaterThan(
      challengeButtonStart,
    );
    expect(
      landing.slice(
        challengeButtonStart,
        challengeButtonEnd,
      ),
    ).not.toContain("definition.description");

    const fontFamilies = new Set(
      [...tokens.matchAll(/@font-face\s*\{[\s\S]*?font-family:\s*"([^"]+)"/g)]
        .map((match) => match[1]),
    );

    expect(fontFamilies).toEqual(
      new Set([
        "Big Shoulders Display",
        "Geist",
        "Geist Mono",
      ]),
    );

    for (const match of tokens.matchAll(
      /--(?:hallmark-)?color-[\w-]+:\s*oklch\([^%]+%\s+([\d.]+)/g,
    )) {
      expect(
        Number(match[1]),
        `${match[0]} must keep tinted chroma`,
      ).toBeGreaterThanOrEqual(0.005);
    }

    for (const path of REQUIRED_STAMPED_FILES) {
      const file = source(path);

      expect(
        file,
        `${path} needs a truthful Hallmark page stamp`,
      ).toContain("Hallmark · genre: playful");
      expect(file).toContain(
        "design-system: design.md",
      );
      expect(file).toContain("designed-as-app");
    }
  });

  it("pins approved Ego-browser and accessibility evidence", () => {
    const inventory = readJson<{
      readonly acceptance: {
        readonly accessibilityTree: {
          readonly unnamedInteractiveElements: number;
        };
        readonly axeSeriousOrCritical: number;
        readonly focusRing: {
          readonly keyboardFocused: boolean;
          readonly outlineCssPixels: number;
          readonly outlineOffsetCssPixels: number;
        };
        readonly fold1280x800: {
          readonly horizontalOverflow: number;
          readonly paddingRatio: number;
          readonly primaryActionVisible: boolean;
        };
        readonly keyboardOnly: boolean;
        readonly mobileFocusZoom: {
          readonly fontCssPixels: number;
          readonly horizontalOffset: number;
          readonly visualViewportScale: number;
        };
        readonly nativeEnhancedDialog: boolean;
        readonly targets: {
          readonly minimumCssPixels: number;
        };
        readonly widths: readonly {
          readonly horizontalOverflow: number;
        }[];
        readonly zoom200: {
          readonly completion: boolean;
          readonly horizontalOverflow: number;
        };
      };
      readonly assertions: {
        readonly continuousWidthSweep: {
          readonly maximumHorizontalOverflowPx: number;
          readonly maximumWidth: number;
          readonly minimumWidth: number;
          readonly routes: readonly string[];
          readonly step: number;
          readonly widthsPerRoute: number;
        };
      };
      readonly entries: readonly {
        readonly status: string;
      }[];
      readonly runner: string;
      readonly status: string;
    }>(INVENTORY_PATH);

    expect(inventory).toMatchObject({
      runner: "ego-browser",
      status: "approved",
    });
    expect(inventory.entries.every(
      (entry) => entry.status === "approved",
    )).toBe(true);
    expect(
      inventory.assertions.continuousWidthSweep,
    ).toMatchObject({
      maximumHorizontalOverflowPx: 0,
      maximumWidth: 1920,
      minimumWidth: 320,
      routes: [
        "landing",
        "setup-nationality",
        "archive",
        "career-workbench",
        "career-challenge",
        "summary",
      ],
      step: 1,
      widthsPerRoute: 1601,
    });
    expect(inventory.acceptance.widths.every(
      (entry) => entry.horizontalOverflow === 0,
    )).toBe(true);
    expect(inventory.acceptance).toMatchObject({
      axeSeriousOrCritical: 0,
      accessibilityTree: {
        unnamedInteractiveElements: 0,
      },
      focusRing: {
        keyboardFocused: true,
        outlineCssPixels: 2,
        outlineOffsetCssPixels: 1,
      },
      fold1280x800: {
        horizontalOverflow: 0,
        paddingRatio: 1.5,
        primaryActionVisible: true,
      },
      keyboardOnly: true,
      mobileFocusZoom: {
        fontCssPixels: 16,
        horizontalOffset: 0,
        visualViewportScale: 1,
      },
      nativeEnhancedDialog: true,
      targets: {
        minimumCssPixels: 44,
      },
      zoom200: {
        completion: true,
        horizontalOverflow: 0,
      },
    });
  });

  it("documents the locked Enhanced / frozen Classic contract for maintainers", () => {
    const readme = readFileSync(README_PATH, "utf8");

    expect(readme).toContain(
      "## Enhanced and Classic UI contract",
    );
    expect(readme).toContain("[design.md](./design.md)");
    expect(readme).toContain("[tokens.css](./tokens.css)");
    expect(readme).toContain("[tokens.json](./tokens.json)");
    expect(readme).toContain(
      "Narrative Workflow / Workbench / Index-First",
    );
    expect(readme).toContain(
      "Classic is the frozen compatibility baseline",
    );
  });
});

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function enhancedSource(relativePath: string): string {
  const file = source(relativePath);

  if (
    relativePath !==
    "src/features/share-card/ShareCardOverlay.tsx"
  ) {
    return file;
  }

  const marker = file.indexOf(
    'data-enhanced-share-overlay=""',
  );
  const enhancedReturn = file.lastIndexOf("return (", marker);

  return file.slice(enhancedReturn);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function gateSort(left: string, right: string): number {
  const leftIndex = GATE_IDS.indexOf(
    left as (typeof GATE_IDS)[number],
  );
  const rightIndex = GATE_IDS.indexOf(
    right as (typeof GATE_IDS)[number],
  );

  return leftIndex - rightIndex;
}
