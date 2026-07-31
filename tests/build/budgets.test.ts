import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  extname,
  join,
  relative,
  sep,
} from "node:path";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { CLASSIC_CREST_IDS } from "../../src/ui/classic/components/classicCrests";

const DIST_DIRECTORY = join(process.cwd(), "dist");
const MANIFEST_PATH = join(
  DIST_DIRECTORY,
  ".vite",
  "manifest.json",
);
const INITIAL_JS_BUDGET_BYTES = 150_000;
const INITIAL_CSS_BUDGET_BYTES = 15_000;
const ENHANCED_SHELL_BUDGET_BYTES = 512;
const ENHANCED_ONBOARDING_BUDGET_BYTES = 6_000;
const ENHANCED_CAREER_BUDGET_BYTES = 4_000;
const ENHANCED_ROUTE_BUDGET_BYTES = 9_000;
const FONT_ASSET_COUNT = 4;
const FONT_ASSET_BUDGET_BYTES = 64 * 1024;
const CLASSIC_VISUAL_DIRECTORY = join(
  process.cwd(),
  "tests",
  "visual",
  "classic",
);
const CLASSIC_VISUAL_FILE_COUNT = 50;
const CLASSIC_VISUAL_SHA256 =
  "df8d472b5c2da352a63060690b724d5dfd4f0d7335590c1532c5bc103d129049";

type ManifestEntry = {
  readonly css?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly file: string;
  readonly isDynamicEntry?: boolean;
  readonly isEntry?: boolean;
  readonly src?: string;
};
type ViteManifest = Readonly<Record<string, ManifestEntry>>;

describe("Production artifact budgets", () => {
  it("declares one static Vercel build and emits a Vite manifest", () => {
    const vercelConfig = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      readonly headers?: readonly unknown[];
    };

    expect(vercelConfig).toMatchObject({
      $schema: "https://openapi.vercel.sh/vercel.json",
      buildCommand: "npm run build",
      framework: "vite",
      outputDirectory: "dist",
    });
    expect(vercelConfig.headers).toHaveLength(1);
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    expect(
      walkFiles(DIST_DIRECTORY).every((path) =>
        [
          "",
          ".css",
          ".html",
          ".js",
          ".json",
          ".png",
          ".svg",
          ".webmanifest",
          ".woff2",
        ].includes(extname(path)),
      ),
    ).toBe(true);
  });

  it("bundles only the approved Latin font assets under their transfer ceiling", () => {
    const files = walkFiles(DIST_DIRECTORY)
      .filter((path) => extname(path) === ".woff2")
      .sort();
    const names = files.map((path) =>
      relative(DIST_DIRECTORY, path),
    );

    expect(files).toHaveLength(FONT_ASSET_COUNT);
    expect(names).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "big-shoulders-display-latin-700-normal",
        ),
        expect.stringContaining(
          "geist-latin-400-normal",
        ),
        expect.stringContaining(
          "geist-latin-700-normal",
        ),
        expect.stringContaining(
          "geist-mono-latin-500-normal",
        ),
      ]),
    );
    expect(
      files.reduce(
        (total, path) => total + statSync(path).size,
        0,
      ),
    ).toBeLessThanOrEqual(FONT_ASSET_BUDGET_BYTES);
    expect(
      walkFiles(DIST_DIRECTORY).some(
        (path) => extname(path) === ".woff",
      ),
    ).toBe(false);
  });

  it("keeps the initial route under transfer budgets", () => {
    const manifest = readManifest();
    const entry = Object.values(manifest).find(
      (candidate) => candidate.isEntry === true,
    );

    expect(entry).toBeDefined();
    expect(gzipSize(entry!.file)).toBeLessThanOrEqual(
      INITIAL_JS_BUDGET_BYTES,
    );
    expect(entry?.css).toHaveLength(1);
    expect(gzipSize(entry!.css![0]!)).toBeLessThanOrEqual(
      INITIAL_CSS_BUDGET_BYTES,
    );
  });

  it("keeps Canvas and QR rendering out of the initial chunk", () => {
    const manifest = readManifest();
    const entry = requireManifestEntry(manifest, "index.html");
    const overlay = requireManifestEntry(
      manifest,
      "src/features/share-card/ShareCardOverlay.tsx",
    );
    const renderer = requireManifestEntry(
      manifest,
      "src/features/share-card/shareCard.ts",
    );
    const initialCode = readDistText(entry.file);
    const overlayCode = readDistText(overlay.file);
    const rendererCode = readDistText(renderer.file);
    const html = readDistText("index.html");

    expect(entry.dynamicImports).toContain(
      "src/features/share-card/ShareCardOverlay.tsx",
    );
    expect(overlay.dynamicImports).toContain(
      "src/features/share-card/shareCard.ts",
    );
    expect(overlay.isDynamicEntry).toBe(true);
    expect(renderer.isDynamicEntry).toBe(true);
    expect(initialCode).not.toContain("Canvas2D is unavailable");
    expect(initialCode).not.toContain("生涯编号");
    expect(overlayCode).toContain("卡上名字");
    expect(rendererCode).toContain("Canvas2D is unavailable");
    expect(rendererCode).toContain("生涯编号");
    expect(html).not.toContain(overlay.file);
    expect(html).not.toContain(renderer.file);
  });

  it("keeps the Enhanced shell out of the Classic initial chunk", () => {
    const manifest = readManifest();
    const entry = requireManifestEntry(manifest, "index.html");
    const enhancedShell = requireManifestEntry(
      manifest,
      "src/ui/enhanced/EnhancedShell.tsx",
    );
    const initialCode = readDistText(entry.file);
    const enhancedCode = readDistText(enhancedShell.file);
    const html = readDistText("index.html");

    expect(entry.dynamicImports).toContain(
      "src/ui/enhanced/EnhancedShell.tsx",
    );
    expect(enhancedShell.isDynamicEntry).toBe(true);
    expect(initialCode).not.toContain("data-enhanced-shell");
    expect(enhancedCode).toContain("data-enhanced-shell");
    expect(html).not.toContain(enhancedShell.file);
  });

  it("keeps Enhanced feature screens out of the Classic initial chunk", () => {
    const manifest = readManifest();
    const entry = requireManifestEntry(manifest, "index.html");
    const onboarding = requireManifestEntry(
      manifest,
      "src/ui/enhanced/EnhancedOnboarding.tsx",
    );
    const career = requireManifestEntry(
      manifest,
      "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
    );
    const initialCode = readDistText(entry.file);
    const onboardingCode = readDistText(onboarding.file);
    const careerCode = readDistText(career.file);
    const html = readDistText("index.html");

    expect(entry.dynamicImports).toContain(
      "src/ui/enhanced/EnhancedOnboarding.tsx",
    );
    expect(entry.dynamicImports).toContain(
      "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
    );
    expect(onboarding.isDynamicEntry).toBe(true);
    expect(career.isDynamicEntry).toBe(true);
    expect(initialCode).not.toContain(
      "data-enhanced-setup-shell",
    );
    expect(initialCode).not.toContain(
      "data-enhanced-career-shell",
    );
    expect(onboardingCode).toContain(
      "data-enhanced-setup-shell",
    );
    expect(careerCode).toContain(
      "data-enhanced-career-shell",
    );
    expect(html).not.toContain(onboarding.file);
    expect(html).not.toContain(career.file);
  });

  it("keeps the complete Enhanced route within explicit chunk budgets", () => {
    const manifest = readManifest();
    const chunks = [
      {
        budget: ENHANCED_SHELL_BUDGET_BYTES,
        entry: requireManifestEntry(
          manifest,
          "src/ui/enhanced/EnhancedShell.tsx",
        ),
      },
      {
        budget: ENHANCED_ONBOARDING_BUDGET_BYTES,
        entry: requireManifestEntry(
          manifest,
          "src/ui/enhanced/EnhancedOnboarding.tsx",
        ),
      },
      {
        budget: ENHANCED_CAREER_BUDGET_BYTES,
        entry: requireManifestEntry(
          manifest,
          "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
        ),
      },
    ];
    const sizes = chunks.map(({ budget, entry }) => {
      const size = gzipSize(entry.file);
      expect(size).toBeLessThanOrEqual(budget);
      return size;
    });

    expect(
      sizes.reduce((total, size) => total + size, 0),
    ).toBeLessThanOrEqual(ENHANCED_ROUTE_BUDGET_BYTES);
  });

  it("keeps the frozen Phase 3 Classic visual gate byte-identical", () => {
    const files = walkFiles(CLASSIC_VISUAL_DIRECTORY)
      .filter((path) =>
        [".png", ".ts"].includes(extname(path)),
      )
      .sort();
    const digest = createHash("sha256");

    for (const path of files) {
      digest.update(
        relative(CLASSIC_VISUAL_DIRECTORY, path)
          .split(sep)
          .join("/"),
      );
      digest.update("\0");
      digest.update(readFileSync(path));
    }

    expect(files).toHaveLength(CLASSIC_VISUAL_FILE_COUNT);
    expect(digest.digest("hex")).toBe(
      CLASSIC_VISUAL_SHA256,
    );
  });

  it("copies the exact local crest set into the static output", () => {
    const expected = CLASSIC_CREST_IDS.map(
      (id) => `${id}.png`,
    ).sort();
    const actual = readdirSync(
      join(DIST_DIRECTORY, "crests"),
    ).sort();

    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(114);
  });
});

function readManifest(): ViteManifest {
  return JSON.parse(
    readFileSync(MANIFEST_PATH, "utf8"),
  ) as ViteManifest;
}

function requireManifestEntry(
  manifest: ViteManifest,
  key: string,
): ManifestEntry {
  const entry = manifest[key];

  if (entry === undefined) {
    throw new Error(`Missing Vite manifest entry: ${key}`);
  }

  return entry;
}

function gzipSize(relativePath: string): number {
  return gzipSync(
    readFileSync(join(DIST_DIRECTORY, relativePath)),
    { level: 9 },
  ).byteLength;
}

function readDistText(relativePath: string): string {
  return readFileSync(
    join(DIST_DIRECTORY, relativePath),
    "utf8",
  );
}

function walkFiles(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
