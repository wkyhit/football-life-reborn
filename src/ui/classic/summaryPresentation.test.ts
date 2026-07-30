import { describe, expect, it } from "vitest";

import { playClassicCareer } from "../../domain/classicEngine";
import { createSummaryPresentation } from "./summaryPresentation";

describe("Classic summary presentation", () => {
  it("uses attacker totals, national results, honors, and clubs", () => {
    const career = playClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 10,
      },
      mode: "normal",
      seed: "phase-3:attacker-summary",
    });
    const view = createSummaryPresentation(career);

    expect(view.metrics.map((metric) => metric.label)).toEqual([
      "出场",
      "进球",
      "助攻",
    ]);
    expect(view.metrics.map((metric) => metric.value)).toEqual([
      career.summary?.totals.appearances,
      career.summary?.totals.goals,
      career.summary?.totals.assists,
    ]);
    expect(view.clubs).toHaveLength(
      career.summary?.clubs.length ?? 0,
    );
    expect(
      view.honors.reduce(
        (total, honor) => total + honor.count,
        0,
      ),
    ).toBe(career.summary?.totals.trophies);
    expect(view.seasonCount).toBe(career.seasons.length);
  });

  it("switches goalkeeper totals and club rows to clean sheets", () => {
    const career = playClassicCareer({
      identity: {
        lastName: "守门员长名字",
        nationalityFifaCode: "CHN",
        position: "GK",
        preferredNumber: 1,
      },
      mode: "express",
      seed: "phase-3:goalkeeper-summary",
    });
    const view = createSummaryPresentation(career);

    expect(view.metrics.map((metric) => metric.label)).toEqual([
      "出场",
      "零封",
      "失球",
    ]);
    expect(view.metrics.map((metric) => metric.value)).toEqual([
      career.summary?.totals.appearances,
      career.summary?.totals.cleanSheets,
      career.summary?.totals.goalsConceded,
    ]);
    expect(
      view.clubs.every((club) => club.stats.includes("零封")),
    ).toBe(true);
    expect(view.identity.name).toBe("守门员长名字");
  });
});
