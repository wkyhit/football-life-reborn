import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PRODUCTION = join(
  ROOT,
  "docs",
  "deployment",
  "production-acceptance.md",
);
const README = join(ROOT, "README.md");

describe("Vercel Production acceptance contract", () => {
  it("binds the public Production alias to the exact accepted main merge", () => {
    const contract = readFileSync(PRODUCTION, "utf8");

    expect(contract).toContain(
      "accepted `main` merge commit",
    );
    expect(contract).toContain(
      "automatic Git Integration Production deployment",
    );
    expect(contract).toContain(
      "https://football-life-reborn.vercel.app/",
    );
    expect(contract).toContain(
      "Do not promote or rebuild an alternate commit",
    );
  });

  it("requires a complete immutable Production evidence block", () => {
    const contract = readFileSync(PRODUCTION, "utf8");
    const requiredLabels = [
      "- Production URL:",
      "- Unique deployment URL:",
      "- Target:",
      "- Status:",
      "- Commit SHA:",
      "- Git ref:",
      "- Framework:",
      "- Build duration:",
      "- Build error scan:",
      "- Browser verification:",
    ];

    expect(contract).toContain("## Production evidence block");
    for (const label of requiredLabels) {
      expect(contract).toContain(label);
    }
  });

  it("defines the clean-context critical Production journey and stop conditions", () => {
    const contract = readFileSync(PRODUCTION, "utf8");
    const requiredChecks = [
      "Classic",
      "Enhanced",
      "direct route",
      "hard reload",
      "replay",
      "local storage",
      "manifest",
      "immutable",
      "console",
      "network",
      "`/api/`",
      "ego-browser",
    ];

    for (const check of requiredChecks) {
      expect(contract).toContain(check);
    }
    expect(contract).toContain(
      "Production acceptance stops immediately",
    );
  });

  it("links the public release contract from the README", () => {
    const readme = readFileSync(README, "utf8");

    expect(readme).toContain(
      "[Production acceptance](docs/deployment/production-acceptance.md)",
    );
  });
});
