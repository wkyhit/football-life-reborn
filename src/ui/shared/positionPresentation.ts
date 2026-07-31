import type { PositionCode } from "../../domain/model";

export type CareerPositionPresentation = {
  readonly code: PositionCode;
  readonly group: "支援" | "组织" | "进攻" | "防守" | "门将";
  readonly label: string;
  readonly shortLabel: string;
  readonly x: `${number}%`;
  readonly y: `${number}%`;
};

const CAREER_POSITION_DATA = (
  [
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
  ] as const satisfies readonly CareerPositionPresentation[]
);

export const CAREER_POSITION_PRESENTATIONS: readonly CareerPositionPresentation[] =
  Object.freeze(
    CAREER_POSITION_DATA.map((position) =>
      Object.freeze(position),
    ),
  );

const POSITION_PRESENTATION_BY_CODE = new Map(
  CAREER_POSITION_PRESENTATIONS.map((position) => [
    position.code,
    position,
  ]),
);

export function positionPresentation(
  code: PositionCode,
): CareerPositionPresentation {
  const presentation =
    POSITION_PRESENTATION_BY_CODE.get(code);

  if (presentation === undefined) {
    throw new RangeError(
      `Unknown career position presentation: ${code}`,
    );
  }

  return presentation;
}
