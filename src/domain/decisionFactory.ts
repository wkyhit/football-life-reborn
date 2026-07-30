import { CSL_CLUBS, getCslClub, type CslClub } from "./catalog/csl";
import type {
  CareerDecision,
  CareerProgress,
  DecisionOption,
  Phase1EventType,
} from "./model";
import { nextUint32 } from "./rng";

export type DecisionFactoryResult = {
  decision: CareerDecision;
  rngState: number;
};

export function createNextDecision(
  career: CareerProgress,
  rngState: number,
): DecisionFactoryResult {
  if (career.age >= 38) {
    return fixedDecision(
      career.age,
      "no_offers_retirement",
      "没有新的报价",
      "连续两个赛季没有俱乐部提供职业合同，是时候告别球场了。",
      [{ id: "retire", label: "宣布退役" }],
      rngState,
    );
  }

  switch (career.age) {
    case 16:
      return clubOfferDecision({
        age: career.age,
        count: 3,
        description: "三家中超俱乐部想签下你。你的第一步走哪儿？",
        eventType: "academy_offer",
        exclusions: [],
        optionPrefix: "join",
        rngState,
        title: "青训报价",
      });
    case 18:
    case 34:
      return trainingDecision(career.age, rngState);
    case 20:
    case 28:
      return clubOfferDecision({
        age: career.age,
        count: 2,
        description: "新的俱乐部愿意给你更大的舞台，你也可以留下继续竞争。",
        eventType: "transfer",
        exclusions: compact([career.clubId, career.parentClubId]),
        optionPrefix: "transfer",
        rngState,
        title: "转会窗口",
        trailingOptions: [{ id: "stay", label: "留在当前球队" }],
      });
    case 22:
    case 36:
      return seasonLoadDecision(career.age, rngState);
    case 24:
    case 30:
      return clubOfferDecision({
        age: career.age,
        count: 1,
        description: "一支中超球队希望租借你两个赛季，承诺更稳定的出场时间。",
        eventType: "loan_offer",
        exclusions: compact([career.clubId, career.parentClubId]),
        optionPrefix: "accept-loan",
        rngState,
        title: "外租邀请",
        trailingOptions: [{ id: "decline-loan", label: "拒绝外租" }],
      });
    case 26:
      return career.parentClubId
        ? postLoanRetainedDecision(career, rngState)
        : trainingDecision(career.age, rngState);
    case 32:
      return career.parentClubId
        ? postLoanNotRetainedDecision(career, rngState)
        : seasonLoadDecision(career.age, rngState);
    default:
      return fixedDecision(
        career.age,
        "season_load",
        "赛季负荷",
        "下一段两赛季周期开始前，你需要决定比赛负荷。",
        [
          { id: "play-through", label: "继续承担比赛" },
          { id: "manage-load", label: "接受轮换并恢复" },
        ],
        rngState,
      );
  }
}

function trainingDecision(
  age: number,
  rngState: number,
): DecisionFactoryResult {
  return fixedDecision(
    age,
    "training_extra",
    "额外训练",
    "教练组给了你一段自由训练时间。加练，还是为漫长赛季保存体能？",
    [
      { id: "train-extra", label: "留下加练" },
      { id: "rest", label: "按计划休息" },
    ],
    rngState,
  );
}

function seasonLoadDecision(
  age: number,
  rngState: number,
): DecisionFactoryResult {
  return fixedDecision(
    age,
    "season_load",
    "赛季负荷",
    "连续作战让身体发出信号。继续承担主力负荷，还是主动轮换？",
    [
      { id: "play-through", label: "继续承担比赛" },
      { id: "manage-load", label: "接受轮换并恢复" },
    ],
    rngState,
  );
}

type ClubOfferDecisionInput = {
  age: number;
  count: number;
  description: string;
  eventType: Phase1EventType;
  exclusions: readonly string[];
  optionPrefix: string;
  rngState: number;
  title: string;
  trailingOptions?: readonly DecisionOption[];
};

function clubOfferDecision(
  input: ClubOfferDecisionInput,
): DecisionFactoryResult {
  const draw = drawClubs(
    input.rngState,
    input.count,
    new Set(input.exclusions),
  );
  const options: DecisionOption[] = draw.clubs.map((club) => ({
    id: `${input.optionPrefix}:${club.id}`,
    label: `${input.optionPrefix === "accept-loan" ? "租借加盟" : "加盟"} ${club.name}`,
  }));

  options.push(...(input.trailingOptions ?? []));

  return fixedDecision(
    input.age,
    input.eventType,
    input.title,
    input.description,
    options,
    draw.rngState,
  );
}

function postLoanRetainedDecision(
  career: CareerProgress,
  rngState: number,
): DecisionFactoryResult {
  const currentClub = requireClub(career.clubId);
  const parentClub = requireClub(career.parentClubId);

  return fixedDecision(
    career.age,
    "post_loan_retained",
    "外租后的选择",
    `${currentClub.name}愿意留下你，母队${parentClub.name}也召回了你。`,
    [
      {
        id: `return-loan:${parentClub.id}`,
        label: `返回 ${parentClub.name}`,
      },
      {
        id: `stay-loan:${currentClub.id}`,
        label: `留在 ${currentClub.name}`,
      },
    ],
    rngState,
  );
}

function postLoanNotRetainedDecision(
  career: CareerProgress,
  rngState: number,
): DecisionFactoryResult {
  return clubOfferDecision({
    age: career.age,
    count: 2,
    description: "租借期结束，两边都没有留下你。新的合同决定下一站。",
    eventType: "post_loan_not_retained",
    exclusions: compact([career.clubId, career.parentClubId]),
    optionPrefix: "join",
    rngState,
    title: "未获留队",
  });
}

function fixedDecision(
  age: number,
  type: Phase1EventType,
  title: string,
  description: string,
  options: readonly DecisionOption[],
  rngState: number,
): DecisionFactoryResult {
  return {
    decision: {
      age,
      description,
      id: `${age}:${type}`,
      options,
      title,
      type,
    },
    rngState,
  };
}

function drawClubs(
  rngState: number,
  count: number,
  exclusions: ReadonlySet<string>,
): { clubs: CslClub[]; rngState: number } {
  const available = CSL_CLUBS.filter((club) => !exclusions.has(club.id));
  const clubs: CslClub[] = [];
  let state = rngState;

  while (clubs.length < count) {
    const draw = nextUint32(state);
    state = draw.state;
    const index = Math.floor(
      (draw.value / 0x1_0000_0000) * available.length,
    );
    const club = available[index];

    if (!club) {
      throw new RangeError("Not enough CSL clubs for decision options");
    }

    clubs.push(club);
    available.splice(index, 1);
  }

  return { clubs, rngState: state };
}

function requireClub(id: string | null): CslClub {
  const club = id ? getCslClub(id) : undefined;

  if (!club) {
    throw new RangeError(`Unknown CSL club: ${id ?? "none"}`);
  }

  return club;
}

function compact(values: readonly (string | null)[]): string[] {
  return values.filter((value): value is string => value !== null);
}
