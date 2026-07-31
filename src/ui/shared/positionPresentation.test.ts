import { describe, expect, it } from "vitest";

import {
  CAREER_POSITION_PRESENTATIONS,
  positionPresentation,
} from "./positionPresentation";

describe("shared position presentation", () => {
  it("freezes the Classic field coordinates and Enhanced labels for all positions", () => {
    expect(CAREER_POSITION_PRESENTATIONS).toEqual([
      {
        code: "LW",
        group: "进攻",
        label: "左边锋",
        shortLabel: "左边",
        x: "18%",
        y: "18%",
      },
      {
        code: "ST",
        group: "进攻",
        label: "中锋",
        shortLabel: "中锋",
        x: "50%",
        y: "10%",
      },
      {
        code: "RW",
        group: "进攻",
        label: "右边锋",
        shortLabel: "右边",
        x: "82%",
        y: "18%",
      },
      {
        code: "LM",
        group: "组织",
        label: "左前卫",
        shortLabel: "左前",
        x: "15%",
        y: "42%",
      },
      {
        code: "CAM",
        group: "组织",
        label: "前腰",
        shortLabel: "前腰",
        x: "50%",
        y: "32%",
      },
      {
        code: "RM",
        group: "组织",
        label: "右前卫",
        shortLabel: "右前",
        x: "85%",
        y: "42%",
      },
      {
        code: "LB",
        group: "支援",
        label: "左后卫",
        shortLabel: "左卫",
        x: "14%",
        y: "72%",
      },
      {
        code: "CM",
        group: "支援",
        label: "中前卫",
        shortLabel: "中前",
        x: "50%",
        y: "52%",
      },
      {
        code: "RB",
        group: "支援",
        label: "右后卫",
        shortLabel: "右卫",
        x: "86%",
        y: "72%",
      },
      {
        code: "CDM",
        group: "防守",
        label: "后腰",
        shortLabel: "后腰",
        x: "50%",
        y: "66%",
      },
      {
        code: "CB",
        group: "防守",
        label: "中后卫",
        shortLabel: "中卫",
        x: "50%",
        y: "82%",
      },
      {
        code: "GK",
        group: "门将",
        label: "门将",
        shortLabel: "门将",
        x: "50%",
        y: "94%",
      },
    ]);
    expect(positionPresentation("GK")).toBe(
      CAREER_POSITION_PRESENTATIONS[11],
    );
    expect(
      Object.isFrozen(CAREER_POSITION_PRESENTATIONS),
    ).toBe(true);
  });

  it("keeps every 56px position control inside a 320px narrow pitch", () => {
    const pitchWidth = 320 - 2 * 16;
    const pitchHeight = 520;
    const controlRadius = 56 / 2;

    for (const presentation of CAREER_POSITION_PRESENTATIONS) {
      const centerX =
        (Number.parseFloat(presentation.x) / 100) *
        pitchWidth;
      const centerY =
        (Number.parseFloat(presentation.y) / 100) *
        pitchHeight;

      expect(centerX - controlRadius).toBeGreaterThanOrEqual(
        0,
      );
      expect(centerX + controlRadius).toBeLessThanOrEqual(
        pitchWidth,
      );
      expect(centerY - controlRadius).toBeGreaterThanOrEqual(
        0,
      );
      expect(centerY + controlRadius).toBeLessThanOrEqual(
        pitchHeight,
      );
    }
  });
});
