import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const INVENTORY_PATH = join(
  ROOT,
  "tests/visual/enhanced/issue-28/inventory.json",
);
const PRODUCTION_COMMIT =
  "36afc2b1e580560e1f3e200ef058b96d5e3a6a79";
const REQUIRED_ENTRIES = new Map([
  ["ordinary-replay-exit", { height: 667, width: 390 }],
  ["challenge-replay-exit", { height: 667, width: 390 }],
  ["mobile-comparison", { height: 667, width: 390 }],
  ["reflow-200", { height: 415, width: 195 }],
  ["short-landscape", { height: 320, width: 568 }],
  ["desktop-rail", { height: 830, width: 1280 }],
]);
const PRODUCTION_FILES = [
  "src/app/App.tsx",
  "src/features/replay/ReplayRouteScreen.tsx",
  "src/styles.css",
  "src/ui/classic/components/ClubIdentity.tsx",
  "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
  "src/ui/enhanced/summary/EnhancedSummaryScreen.tsx",
  "src/ui/shared/CareerMilestoneNarrative.tsx",
  "tokens.css",
] as const;

type Fingerprint = {
  readonly file: string;
  readonly sha256: string;
};

type IssueEvidenceInventory = {
  readonly capturedAt: string;
  readonly entries: readonly {
    readonly evidence: readonly Fingerprint[];
    readonly id: string;
    readonly viewport: {
      readonly height: number;
      readonly width: number;
    };
  }[];
  readonly issue: number;
  readonly productionFiles: readonly Fingerprint[];
  readonly runner: {
    readonly name: string;
    readonly taskSpaceId: number;
  };
  readonly scope: string;
  readonly source: {
    readonly branch: string;
    readonly commit: string;
    readonly deploymentId: number;
    readonly url: string;
  };
  readonly status: string;
  readonly validation: {
    readonly axeSeriousOrCritical: number;
    readonly classicReferenceDiff: boolean;
    readonly classicSourceDiff: boolean;
    readonly consoleErrors: number;
    readonly documentHorizontalOverflowPx: number;
    readonly minimumInteractiveTargetPx: number;
  };
  readonly version: number;
};

describe("Issue #28 exact-commit visual evidence", () => {
  it("publishes a scoped ego-browser inventory after the production UI is frozen", () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true);

    if (!existsSync(INVENTORY_PATH)) {
      return;
    }

    const inventory = JSON.parse(
      readFileSync(INVENTORY_PATH, "utf8"),
    ) as IssueEvidenceInventory;

    expect(inventory).toMatchObject({
      issue: 28,
      runner: {
        name: "ego-browser",
        taskSpaceId: 56,
      },
      scope: "issue-specific",
      source: {
        branch: "codex/issue-28-enhanced-ux",
        commit: PRODUCTION_COMMIT,
        deploymentId: 5737051144,
        url: "https://football-life-reborn-ikkrjc6es-enity.vercel.app",
      },
      status: "approved",
      validation: {
        axeSeriousOrCritical: 0,
        classicReferenceDiff: false,
        classicSourceDiff: false,
        consoleErrors: 0,
        documentHorizontalOverflowPx: 0,
        minimumInteractiveTargetPx: 44,
      },
      version: 1,
    });
    expect(Date.parse(inventory.capturedAt)).not.toBeNaN();
    expect(
      inventory.entries.map(({ id }) => id),
    ).toEqual([...REQUIRED_ENTRIES.keys()]);

    for (const entry of inventory.entries) {
      expect(entry.viewport).toEqual(
        REQUIRED_ENTRIES.get(entry.id),
      );
      expect(entry.evidence).toHaveLength(1);
      assertFingerprint(entry.evidence[0]!);
      expect(
        readFileSync(join(ROOT, entry.evidence[0]!.file))
          .subarray(0, 8),
      ).toEqual(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]),
      );
    }
  });

  it("invalidates the capture when a represented production file changes", () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true);

    if (!existsSync(INVENTORY_PATH)) {
      return;
    }

    const inventory = JSON.parse(
      readFileSync(INVENTORY_PATH, "utf8"),
    ) as IssueEvidenceInventory;

    expect(
      inventory.productionFiles.map(({ file }) => file),
    ).toEqual([...PRODUCTION_FILES]);
    for (const fingerprint of inventory.productionFiles) {
      assertFingerprint(fingerprint);
    }
  });
});

function assertFingerprint(fingerprint: Fingerprint): void {
  const path = join(ROOT, fingerprint.file);

  expect(
    existsSync(path),
    `missing captured artifact: ${fingerprint.file}`,
  ).toBe(true);

  if (!existsSync(path)) {
    return;
  }

  expect(sha256(readFileSync(path))).toBe(fingerprint.sha256);
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
