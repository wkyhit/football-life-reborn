import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type PackageContract = {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
};

const ROOT = process.cwd();
const DELIVERY_PATH = join(
  ROOT,
  "docs",
  "deployment",
  "vercel-delivery.md",
);

describe("Vercel Git Integration contract", () => {
  it("maps issue branches, the final PR, and main to exact deployment targets", () => {
    const delivery = readFileSync(DELIVERY_PATH, "utf8");

    expect(delivery).toContain("## Deployment mapping");
    expect(delivery).toContain(
      "| Issue branch push | Preview | Exact pushed commit |",
    );
    expect(delivery).toContain(
      "| Final pull request head | Preview | Exact PR head commit |",
    );
    expect(delivery).toContain(
      "| Accepted `main` merge | Production | Exact merge commit |",
    );
  });

  it("requires an exact Ready evidence block before the next slice", () => {
    const delivery = readFileSync(DELIVERY_PATH, "utf8");
    const requiredLabels = [
      "- Commit SHA:",
      "- Git ref:",
      "- Deployment URL:",
      "- Target:",
      "- Status:",
      "- Framework:",
      "- Build duration:",
      "- Build error scan:",
      "- Browser verification:",
    ];

    expect(delivery).toContain("## Required evidence block");
    for (const label of requiredLabels) {
      expect(delivery).toContain(label);
    }
    expect(delivery).toContain(
      "Do not start the next slice until",
    );
  });

  it("has no repository-owned Vercel deployment runner", () => {
    const packageContract = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as PackageContract;
    const packageNames = [
      ...Object.keys(packageContract.dependencies ?? {}),
      ...Object.keys(packageContract.devDependencies ?? {}),
    ];
    const scriptCommands = Object.values(
      packageContract.scripts ?? {},
    ).join("\n");
    const workflowContents = trackedPaths()
      .filter((path) =>
        /^\.github\/workflows\/.+\.ya?ml$/u.test(path),
      )
      .map((path) => readFileSync(join(ROOT, path), "utf8"))
      .join("\n");
    const deploymentCommand =
      /(?:^|\s)(?:npx\s+)?vercel\s+(?:build|deploy|promote|rollback)\b/iu;

    expect(packageNames).not.toContain("vercel");
    expect(scriptCommands).not.toMatch(deploymentCommand);
    expect(workflowContents).not.toMatch(
      /amondnet\/vercel-action/iu,
    );
    expect(workflowContents).not.toMatch(deploymentCommand);
  });
});

function trackedPaths(): readonly string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}
