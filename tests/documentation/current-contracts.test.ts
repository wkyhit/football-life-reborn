import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function document(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("current project documentation", () => {
  it("documents replay v3 while preserving v1 and v2 readers", () => {
    const replay = document("docs/challenges-and-replay.md");

    for (const fact of [
      "codec version `3`",
      "`ordinary`",
      "`daily_challenge`",
      "economy policy version",
      "Codec v1 and v2 links remain readable",
      "unknown preferred foot",
    ]) {
      expect(replay).toContain(fact);
    }

    expect(replay).not.toContain(
      "Codec version\n`1` serializes",
    );
  });

  it("versions the complete Enhanced career workbench behavior", () => {
    const workbench = document("docs/career-workbench.md");

    for (const fact of [
      "195×415",
      "390×667",
      "568×320",
      "1280×830",
      '`aria-current="step"`',
      "`回到最新`",
      "EUR",
      "CNY",
      '`aria-pressed="true"`',
      "held event result",
      "acknowledgement",
      "Outfield",
      "Goalkeeper",
      "Classic",
      "ego-browser",
    ]) {
      expect(workbench).toContain(fact);
    }
  });

  it("keeps the domain scalar separate from UI currency presentation", () => {
    const economy = document("docs/economy-v1.md");

    expect(economy).toContain("Market value (EUR)");
    expect(economy).toMatch(
      /contracts treat market value as\s+EUR/u,
    );
    expect(economy).toContain(
      "Market value is labelled and formatted as EUR",
    );
    expect(economy).toContain(
      "salary, contract results, season income, and career income",
    );
    expect(economy).toContain("formatted as CNY");
    expect(economy).toContain("foreign-exchange conversion");
  });
});
