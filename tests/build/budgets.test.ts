import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { extname, join } from "node:path";
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

type ManifestEntry = {
  readonly css?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly file: string;
  readonly isDynamicEntry?: boolean;
  readonly isEntry?: boolean;
  readonly src?: string;
};
type ViteManifest = Readonly<Record<string, ManifestEntry>>;

describe("Phase 3 production artifact budgets", () => {
  it("declares one static Vercel build and emits a Vite manifest", () => {
    expect(
      JSON.parse(
        readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
      ),
    ).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      buildCommand: "npm run build",
      framework: "vite",
      outputDirectory: "dist",
    });
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    expect(
      walkFiles(DIST_DIRECTORY).every((path) =>
        [".css", ".html", ".js", ".json", ".png"].includes(
          extname(path),
        ),
      ),
    ).toBe(true);
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
