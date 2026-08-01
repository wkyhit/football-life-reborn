import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const RUNBOOK = join(
  ROOT,
  "docs",
  "deployment",
  "vercel-runbook.md",
);
const README = join(ROOT, "README.md");

describe("Vercel rollback and restore contract", () => {
  it("resolves both release targets before changing the Production alias", () => {
    const runbook = readFileSync(RUNBOOK, "utf8");
    const prerequisites = [
      "intended release",
      "previous known-good release",
      "full commit SHA",
      "unique deployment URL",
      "Target: `Production`",
      "Status: `Ready`",
    ];

    expect(runbook).toContain("## Preconditions");
    for (const prerequisite of prerequisites) {
      expect(runbook).toContain(prerequisite);
    }
    expect(runbook).toContain(
      "Do not act when either target is ambiguous",
    );
    expect(runbook).not.toContain("Issue #9");
  });

  it("defines one dashboard-only rollback and one restore with health gates", () => {
    const runbook = readFileSync(RUNBOOK, "utf8");
    const requiredSteps = [
      "ego-browser",
      "Vercel dashboard",
      "Roll back to the previous known-good release",
      "wait for the Production alias",
      "rollback health check",
      "Restore the intended release",
      "restored-release health check",
    ];

    for (const step of requiredSteps) {
      expect(runbook).toContain(step);
    }
    expect(runbook).toContain(
      "Do not rebuild, redeploy, or change repository configuration",
    );
  });

  it("records recovery evidence without committing credentials or identifiers", () => {
    const runbook = readFileSync(RUNBOOK, "utf8");
    const requiredLabels = [
      "- Drill started:",
      "- Intended release SHA / URL:",
      "- Previous release SHA / URL:",
      "- Rollback action and completion:",
      "- Rollback alias read-back:",
      "- Rollback health check:",
      "- Restore action and completion:",
      "- Restored alias read-back:",
      "- Restored-release health check:",
      "- Console/network error scan:",
    ];

    expect(runbook).toContain("## Drill evidence block");
    for (const label of requiredLabels) {
      expect(runbook).toContain(label);
    }
    expect(runbook).toContain(
      "Never record credentials, account identifiers, project identifiers, or internal deployment identifiers",
    );
  });

  it("links the rollback runbook from the README", () => {
    const readme = readFileSync(README, "utf8");

    expect(readme).toContain(
      "[rollback and restore runbook](docs/deployment/vercel-runbook.md)",
    );
  });
});
