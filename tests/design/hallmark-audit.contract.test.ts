import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PREFLIGHT_PATH = join(
  ROOT,
  ".hallmark",
  "preflight.json",
);
const INVENTORY_PATH = join(
  ROOT,
  "tests",
  "visual",
  "enhanced",
  "before",
  "inventory.json",
);
const AUDIT_PATH = join(
  ROOT,
  "docs",
  "design",
  "hallmark-audit.md",
);

const REQUIRED_SURFACES = [
  "landing",
  "setup-nationality",
  "setup-identity",
  "setup-position",
  "career",
  "career-challenge",
  "summary",
  "share",
  "archive-empty",
  "archive-populated",
  "branch-create",
  "branch-compare",
  "replay-ready",
  "replay-error",
  "recovery",
  "save-error",
  "loading",
  "install",
] as const;

const REQUIRED_VIEWPORT_WIDTHS = [
  320, 375, 414, 768, 1280, 1440,
] as const;

type Preflight = {
  readonly baselineCommit: string;
  readonly framework: string;
  readonly generatedAt: string;
  readonly motion: string;
  readonly paletteSources: readonly string[];
  readonly sourceFiles: readonly string[];
  readonly typographySources: readonly string[];
  readonly version: number;
};

type BaselineEntry = {
  readonly evidence: readonly string[];
  readonly id: string;
  readonly sourceFiles: readonly string[];
  readonly status: "captured" | "documented-missing";
};

type BaselineInventory = {
  readonly baselineCommit: string;
  readonly entries: readonly BaselineEntry[];
  readonly generatedAt: string;
  readonly runner: string;
  readonly version: number;
  readonly viewportWidths: readonly number[];
};

describe("Hallmark pre-redesign evidence contract", () => {
  it("persists a reproducible pre-flight scan for the frozen baseline", () => {
    expect(existsSync(PREFLIGHT_PATH)).toBe(true);

    const preflight = readJson<Preflight>(PREFLIGHT_PATH);

    expect(preflight).toMatchObject({
      baselineCommit:
        "67c33f9e4a31ad128cfd51fc4157270e95b45847",
      framework: "React 19 + Vite 8 + Tailwind CSS 4",
      motion: "motion-cut",
      version: 1,
    });
    expect(Date.parse(preflight.generatedAt)).not.toBeNaN();
    expect(preflight.paletteSources).toContain(
      "src/styles.css",
    );
    expect(preflight.typographySources).toContain(
      "src/ui/enhanced/DESIGN.md",
    );
    expect(preflight.sourceFiles).toEqual(
      expect.arrayContaining([
        "src/app/App.tsx",
        "src/features/archive/EnhancedArchiveScreen.tsx",
        "src/features/challenges/ChallengeProgressPanel.tsx",
        "src/features/replay/ReplayRouteScreen.tsx",
        "src/features/share-card/ShareCardOverlay.tsx",
        "src/ui/enhanced/EnhancedOnboarding.tsx",
        "src/ui/enhanced/EnhancedShell.tsx",
        "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
        "src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx",
        "src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx",
      ]),
    );
  });

  it("inventories every Enhanced surface and the required responsive widths", () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true);

    const inventory =
      readJson<BaselineInventory>(INVENTORY_PATH);

    expect(inventory).toMatchObject({
      baselineCommit:
        "67c33f9e4a31ad128cfd51fc4157270e95b45847",
      runner: "ego-browser",
      version: 1,
    });
    expect(Date.parse(inventory.generatedAt)).not.toBeNaN();
    expect(inventory.viewportWidths).toEqual(
      REQUIRED_VIEWPORT_WIDTHS,
    );

    const byId = new Map(
      inventory.entries.map((entry) => [
        entry.id,
        entry,
      ]),
    );

    for (const id of REQUIRED_SURFACES) {
      const entry = byId.get(id);

      expect(entry, `missing baseline surface: ${id}`).toBeDefined();
      expect(entry!.sourceFiles.length).toBeGreaterThan(0);
      expect(entry!.evidence.length).toBeGreaterThan(0);

      for (const relativePath of entry!.evidence) {
        const evidencePath = join(ROOT, relativePath);

        expect(
          existsSync(evidencePath),
          `missing baseline evidence: ${relativePath}`,
        ).toBe(true);

        if (relativePath.endsWith(".png")) {
          expect(
            readFileSync(evidencePath).subarray(0, 8),
          ).toEqual(
            Buffer.from([
              0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a,
              0x1a, 0x0a,
            ]),
          );
        }
      }
    }
  });

  it("records ranked named tells with exact locations, fixes, and a count", () => {
    expect(existsSync(AUDIT_PATH)).toBe(true);

    const audit = readFileSync(AUDIT_PATH, "utf8");

    expect(audit).toContain(
      "Baseline commit: `67c33f9e4a31ad128cfd51fc4157270e95b45847`",
    );
    expect(audit).toContain(
      "Runner: `ego-browser`",
    );

    for (const id of REQUIRED_SURFACES) {
      expect(audit).toContain(`\`${id}\``);
    }

    expect(audit).toMatch(
      /\[(critical|major|minor)\] .+ — .+:\d+(?:-\d+)?/,
    );
    expect(audit).toMatch(/\n  Tell — .+\n/);
    expect(audit).toMatch(/\n  Where — .+:\d+(?:-\d+)?\n/);
    expect(audit).toMatch(/\n  Severity — (critical|major|minor)\n/);
    expect(audit).toMatch(/\n  Fix — .+\n/);
    expect(audit).toMatch(
      /Summary — \d+ critical · \d+ major · \d+ minor/,
    );
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
