import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { describe, expect, it } from "vitest";

type PackageContract = {
  readonly engines?: {
    readonly node?: string;
  };
  readonly packageManager?: string;
};

type VercelConfig = {
  readonly $schema?: string;
  readonly buildCommand?: string;
  readonly framework?: string;
  readonly installCommand?: string;
  readonly outputDirectory?: string;
};

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

describe("Vercel project contract", () => {
  it("builds the repository-root Vite app with locked install and output commands", () => {
    const config = readJson<VercelConfig>("vercel.json");
    const packageContract =
      readJson<PackageContract>("package.json");

    expect(config).toMatchObject({
      $schema: "https://openapi.vercel.sh/vercel.json",
      buildCommand: "npm run build",
      framework: "vite",
      installCommand: "npm ci",
      outputDirectory: "dist",
    });
    expect(packageContract.packageManager).toBe("npm@10.9.4");
    expect(packageContract.engines?.node).toContain(">=24.0.0");
  });

  it("keeps local Vercel state and deployment credentials out of tracked files", () => {
    const paths = trackedPaths();
    const trackedLocalState = paths.filter(
      (path) =>
        path === ".vercel" ||
        path.startsWith(".vercel/") ||
        (basename(path).startsWith(".env") &&
          basename(path) !== ".env.example"),
    );
    const contents = paths
      .filter(isTrackedText)
      .map((path) => readFileSync(join(ROOT, path), "utf8"))
      .join("\n");
    const credentialAssignment = new RegExp(
      ["VERCEL", "(?:TOKEN|ORG_ID|PROJECT_ID)"].join("_") +
        String.raw`\s*=`,
      "u",
    );
    const projectIdentifier =
      /(?:^|[^A-Za-z0-9_])(?:prj|team)_[A-Za-z0-9]{16,}\b/u;

    expect(trackedLocalState).toEqual([]);
    expect(contents).not.toMatch(credentialAssignment);
    expect(contents).not.toMatch(projectIdentifier);
  });

  it("uses Git Integration without a duplicate Vercel workflow", () => {
    const ignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
    const workflowPaths = trackedPaths().filter((path) =>
      /^\.github\/workflows\/.+\.ya?ml$/u.test(path),
    );
    const workflowContents = workflowPaths
      .map((path) => readFileSync(join(ROOT, path), "utf8"))
      .join("\n");

    expect(ignore).toMatch(/^\.vercel\/$/mu);
    expect(ignore).toMatch(/^\.env$/mu);
    expect(ignore).toMatch(/^\.env\.\*$/mu);
    expect(workflowContents).not.toMatch(
      /amondnet\/vercel-action|vercel\s+(?:build|deploy|--prod)/iu,
    );
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(
    readFileSync(join(ROOT, path), "utf8"),
  ) as T;
}

function trackedPaths(): readonly string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

function isTrackedText(path: string): boolean {
  return (
    TEXT_EXTENSIONS.has(extname(path)) ||
    [".gitignore", "LICENSE"].includes(basename(path))
  );
}
