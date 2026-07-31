import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { playClassicCareer } from "../../src/domain/classicEngine";
import { EnhancedSummaryScreen } from "../../src/ui/enhanced/summary/EnhancedSummaryScreen";
import { createSummaryPresentation } from "../../src/ui/classic/summaryPresentation";

const ROOT = process.cwd();
const AFTER_INVENTORY =
  "tests/visual/enhanced/after/inventory.json";
const FILES = {
  app: "src/app/App.tsx",
  archive:
    "src/features/archive/EnhancedArchiveScreen.tsx",
  career:
    "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
  challenge:
    "src/features/challenges/ChallengeProgressPanel.tsx",
  replay: "src/features/replay/ReplayRouteScreen.tsx",
  share: "src/features/share-card/ShareCardOverlay.tsx",
  dialog: "src/ui/shared/Dialog.tsx",
  summary:
    "src/ui/enhanced/summary/EnhancedSummaryScreen.tsx",
} as const;

const ENHANCED_ONLY_FILES = [
  FILES.archive,
  FILES.career,
  FILES.challenge,
  FILES.replay,
  FILES.summary,
] as const;

const HALLMARK_STAMP =
  "Hallmark · genre: playful · macrostructure:";
const RAW_PALETTE_UTILITY =
  /\b(?:bg|border|from|text|to|via)-(?:amber|cyan|emerald|gray|neutral|red|rose|sky|slate|stone|violet|yellow|zinc)-/;

afterEach(cleanup);

describe("Enhanced route-family redesign contract", () => {
  it("adds a dedicated Enhanced summary owner without changing the Classic summary owner", () => {
    const summaryPath = join(ROOT, FILES.summary);

    expect(existsSync(summaryPath)).toBe(true);

    if (!existsSync(summaryPath)) {
      return;
    }

    const app = source(FILES.app);
    const summary = readFileSync(summaryPath, "utf8");

    expect(app).toContain(
      'const EnhancedSummaryScreen = lazy(async () => {',
    );
    expect(app).toContain("<EnhancedSummaryScreen");
    expect(app).toContain("<SummaryScreen");
    expect(summary).toContain(
      'data-hallmark-macrostructure="Index-First"',
    );
    expect(summary).toContain(
      "data-enhanced-summary-screen",
    );
    expect(summary).not.toContain(
      "data-classic-summary-shell",
    );
  });

  it("stamps the career route as one Workbench while preserving the verified 380px rail", () => {
    const career = source(FILES.career);

    expect(career).toContain(
      `${HALLMARK_STAMP} Workbench`,
    );
    expect(career).toContain(
      'data-hallmark-macrostructure="Workbench"',
    );
    expect(career).toContain("<EnhancedAppBar");
    expect(career).toContain("lg:w-[380px]");
    expect(career).toContain(
      "lg:grid-cols-[minmax(0,7fr)_380px]",
    );
  });

  it("uses one Index-First record grammar across archive, branch, summary, share, and replay", () => {
    const archive = source(FILES.archive);
    const replay = source(FILES.replay);
    const share = source(FILES.share);

    expect(archive).toContain(
      `${HALLMARK_STAMP} Index-First`,
    );
    expect(archive).toContain(
      'data-hallmark-macrostructure="Index-First"',
    );
    expect(archive).toContain(
      "data-enhanced-archive-record",
    );
    expect(archive).toContain("<EnhancedAppBar");
    expect(replay).toContain(
      'data-hallmark-macrostructure="Index-First"',
    );
    expect(share).toContain(
      'data-hallmark-macrostructure="Index-First"',
    );
    expect(share).toContain(
      'variant?: "classic" | "enhanced"',
    );
    expect(share).toContain(
      "bg-black/85 backdrop-blur-sm",
    );
    expect(share).toContain('variant="enhanced"');
    expect(source(FILES.dialog)).toContain(
      "data-dialog-variant={variant}",
    );
  });

  it("keeps challenge evidence inside the Workbench and removes every blank route boundary", () => {
    const challenge = source(FILES.challenge);
    const replay = source(FILES.replay);
    const productionSources = Object.values(FILES)
      .filter((relativePath) =>
        existsSync(join(ROOT, relativePath)),
      )
      .map(source)
      .join("\n");

    expect(challenge).toContain(
      'data-enhanced-record="challenge"',
    );
    expect(replay).not.toContain(
      'from "../../ui/classic/SummaryScreen"',
    );
    expect(productionSources).not.toContain(
      "fallback={null}",
    );
  });

  it("keeps route presentation on semantic tokens instead of reviving framework palettes", () => {
    for (const relativePath of ENHANCED_ONLY_FILES) {
      if (!existsSync(join(ROOT, relativePath))) {
        continue;
      }

      expect(
        source(relativePath),
        `raw palette utility in ${relativePath}`,
      ).not.toMatch(RAW_PALETTE_UTILITY);
    }
  });

  it("persists the ego-browser route-family evidence without replacing the setup matrix", () => {
    const inventory = JSON.parse(
      source(AFTER_INVENTORY),
    ) as {
      readonly entries: readonly {
        readonly evidence: readonly string[];
        readonly id: string;
      }[];
      readonly runner: string;
      readonly slice: number;
      readonly viewportWidths: readonly number[];
    };
    const byId = new Map(
      inventory.entries.map((entry) => [entry.id, entry]),
    );

    expect(inventory).toMatchObject({
      runner: "ego-browser",
      slice: 4,
      viewportWidths: [320, 375, 414, 768, 1280, 1440],
    });

    for (const id of [
      "career-workbench",
      "summary",
      "share",
      "archive",
      "branching",
      "challenge",
      "replay",
    ]) {
      const entry = byId.get(id);

      expect(entry, `missing route evidence: ${id}`).toBeDefined();
      expect(entry!.evidence.length).toBeGreaterThan(0);

      for (const relativePath of entry!.evidence) {
        expect(
          existsSync(join(ROOT, relativePath)),
          `missing route PNG: ${relativePath}`,
        ).toBe(true);
      }
    }

    expect(byId.get("career-workbench")?.evidence).toHaveLength(
      6,
    );
  });
});

describe("Enhanced summary route behavior", () => {
  it("renders the deterministic record and keeps its primary route actions wired", async () => {
    const onOpenArchive = vi.fn();
    const onRestart = vi.fn();
    const onShare = vi.fn();
    const user = userEvent.setup();
    const view = createSummaryPresentation(
      playClassicCareer({
        identity: {
          lastName: "李",
          nationalityFifaCode: "CHN",
          position: "ST",
          preferredNumber: 10,
        },
        mode: "normal",
        seed: "issue-8:enhanced-summary-route",
      }),
    );
    const { container } = render(
      createElement(EnhancedSummaryScreen, {
        onOpenArchive,
        onRestart,
        onShare,
        view,
      }),
    );

    expect(
      container.querySelector(
        '[data-hallmark-macrostructure="Index-First"]',
      ),
    ).toHaveAttribute("data-enhanced-summary-screen");
    expect(
      screen.getByRole("heading", {
        name: view.identity.name,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("生涯总计").children,
    ).toHaveLength(3);

    await user.click(
      screen.getByRole("button", { name: "生涯档案" }),
    );
    await user.click(
      screen.getByRole("button", { name: "再来一局" }),
    );
    await user.click(
      screen.getByRole("button", { name: "保存战绩卡" }),
    );

    expect(onOpenArchive).toHaveBeenCalledOnce();
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });
});

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}
