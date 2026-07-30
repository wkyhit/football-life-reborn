import type {
  ClassicCareerSeason,
  ClassicCareerState,
  ClassicDecision,
  ClassicDecisionOption,
} from "../../domain/classicEngine";
import type { CareerEventKey } from "../../domain/careerEvents";
import {
  CLASSIC_CATALOG,
  type Club,
  type Country,
} from "../../domain/catalog/classicCatalog";
import {
  resolveClassicSquadRole,
  roleGroupForPosition,
  type ClassicPosition,
  type ClassicSeasonStats,
  type ClassicSquadRole,
} from "../../domain/role";

export type CareerClubPresentation = {
  readonly abbreviation: string;
  readonly color: string;
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly subtitle: string;
};

export type CareerDecisionOptionPresentation = {
  readonly club: CareerClubPresentation | null;
  readonly id: string;
  readonly role: string;
  readonly roleTone:
    | "danger"
    | "positive"
    | "primary"
    | "warning";
  readonly stars: string;
  readonly subtitle: string;
  readonly title: string;
};

export type CareerDecisionPanelPresentation =
  | {
      readonly age: number;
      readonly decisionId: string;
      readonly description: string;
      readonly kind: "decision";
      readonly options: readonly CareerDecisionOptionPresentation[];
      readonly title: string;
    }
  | { readonly kind: "simulating" };

export type CareerTimelineRowPresentation =
  | {
      readonly age: number;
      readonly kind: "current";
    }
  | {
      readonly age: number;
      readonly kind: "empty";
    }
  | {
      readonly age: number;
      readonly club: CareerClubPresentation;
      readonly kind: "season";
      readonly overall: number;
      readonly stats: Pick<
        ClassicSeasonStats,
        "appearances" | "assists" | "goals"
      >;
    };

export type CareerPresentation = {
  readonly header: {
    readonly age: number;
    readonly club: CareerClubPresentation | null;
    readonly countryCode: string;
    readonly countryFlag: string;
    readonly marketValue: number;
    readonly number: number;
    readonly overall: number;
    readonly position: string;
  };
  readonly nationalTeam: {
    readonly countryFlag: string;
    readonly name: string;
    readonly stats: Pick<
      ClassicSeasonStats,
      "appearances" | "assists" | "goals"
    >;
  };
  readonly panel: CareerDecisionPanelPresentation;
  readonly timeline: readonly CareerTimelineRowPresentation[];
  readonly totals: {
    readonly appearances: number;
    readonly assists: number;
    readonly goals: number;
    readonly trophies: number;
  };
};

type CareerPresentationInput = {
  readonly career: ClassicCareerState;
  readonly isRevealing: boolean;
  readonly visibleSeasonCount: number;
};

const EMPTY_STATS: ClassicSeasonStats = {
  appearances: 0,
  assists: 0,
  cleanSheets: 0,
  goals: 0,
  goalsConceded: 0,
};

const POSITION_LABELS: Readonly<Record<ClassicPosition, string>> = {
  CAM: "前腰",
  CB: "中卫",
  CDM: "后腰",
  CM: "中前",
  GK: "门将",
  LB: "左卫",
  LM: "左前",
  LW: "左边",
  RB: "右卫",
  RM: "右前",
  RW: "右边",
  ST: "中锋",
};

const DECISION_COPY: Readonly<
  Record<
    Exclude<ClassicDecision["type"], "career_event">,
    { readonly description: string; readonly title: string }
  >
> = {
  academy_offer: {
    description: "三家俱乐部想签下你。你的第一步走哪儿？",
    title: "青训报价",
  },
  contract_nonrenewal: {
    description: "合同没有续上。下一站由你决定。",
    title: "成为自由球员",
  },
  loan_offer: {
    description: "俱乐部想让你出去踢球攒经验。去哪家？",
    title: "外租",
  },
  no_offers_retirement: {
    description: "转会窗已经关闭，没有俱乐部送来合同。",
    title: "无人问津",
  },
  post_loan_not_retained: {
    description: "母队没有留下你。为下一份合同做决定。",
    title: "租借归来",
  },
  post_loan_retained: {
    description: "母队愿意留下你，也可以选择熟悉的老东家。",
    title: "租借归来",
  },
  transfer: {
    description: "有人来问你了。可以走，也可以留。",
    title: "转会窗",
  },
};

const EVENT_COPY: Readonly<
  Record<CareerEventKey, { readonly description: string; readonly title: string }>
> = {
  club_crisis: {
    description: "俱乐部正经历动荡。你准备怎么面对？",
    title: "俱乐部危机",
  },
  club_national_team_conflict: {
    description: "俱乐部和国家队的赛程撞在了一起。",
    title: "征召冲突",
  },
  club_priority: {
    description: "赛程太密集了，只能把精力放在一条战线。",
    title: "赛季取舍",
  },
  controversial_statement: {
    description: "一句话把你推上了风口浪尖。",
    title: "争议发言",
  },
  decisive_penalty: {
    description: "决定冠军的点球就在你脚下。踢哪边？",
    title: "决胜点球",
  },
  fan_backlash: {
    description: "看台上的质疑声越来越大。",
    title: "球迷倒戈",
  },
  finish_high_school: {
    description: "你还有机会完成高中学业。",
    title: "回到课堂",
  },
  foreign_grandfather: {
    description: "另一支国家队向你发出了邀请。",
    title: "血缘选择",
  },
  giant_tattoo: {
    description: "有人提议把信念永久留在皮肤上。",
    title: "巨幅纹身",
  },
  injury: {
    description: "伤病打断了你的节奏，只能耐心恢复。",
    title: "意外伤病",
  },
  injury_at_peak: {
    description: "最重要的比赛就在眼前，但你的身体亮起红灯。",
    title: "带伤上阵",
  },
  mysterious_substance: {
    description: "有人递来一瓶成分不明的补剂。",
    title: "神秘补剂",
  },
  personal_coach: {
    description: "一位私人教练愿意为你制定专属计划。",
    title: "私人教练",
  },
  position_change: {
    description: "教练认为换个位置会打开新的可能。",
    title: "位置改造",
  },
  position_competition: {
    description: "新援到来，你的位置不再稳固。",
    title: "位置竞争",
  },
  return_home: {
    description: "家乡球队希望你回去成为旗帜。",
    title: "回到故乡",
  },
  rival_offer: {
    description: "死敌送来了一份很难拒绝的合同。",
    title: "死敌邀约",
  },
  season_load: {
    description: "教练组希望你承担更多比赛和训练任务。",
    title: "赛季负荷",
  },
  tax_trouble: {
    description: "场外的税务问题正在变得棘手。",
    title: "税务风波",
  },
  training_extra: {
    description: "训练结束后，教练问你要不要再加一组。",
    title: "额外训练",
  },
  triumphant_return: {
    description: "最初的俱乐部希望功成名就的你回家。",
    title: "荣归故里",
  },
  unexpected_prospect: {
    description: "一位天赋惊人的年轻人来到了更衣室。",
    title: "后起之秀",
  },
};

const EVENT_OPTION_LABELS: Readonly<Record<string, string>> = {
  accept: "接受",
  apologize: "公开道歉",
  comply: "服从俱乐部",
  compete: "正面竞争",
  consume: "喝下补剂",
  continue: "专心康复",
  go_anyway: "前往国家队",
  keep_national_team: "留在当前国家队",
  left: "踢向左边",
  mentor: "主动带他训练",
  play_injured: "带伤出战",
  prioritize_continental: "优先洲际赛事",
  prioritize_league: "优先联赛",
  recover: "安心恢复",
  reject: "拒绝",
  right: "踢向右边",
  stay_abroad: "继续留洋",
  stay_and_fight: "留下来战斗",
  stay_calm: "保持冷静",
  switch_national_team: "更换国家队",
};

export function createCareerPresentation({
  career,
  isRevealing,
  visibleSeasonCount,
}: CareerPresentationInput): CareerPresentation {
  const country = requireCountry(career.nationalityFifaCode);
  const safeVisibleCount = Math.max(
    0,
    Math.min(visibleSeasonCount, career.seasons.length),
  );
  const visibleSeasons = career.seasons.slice(0, safeVisibleCount);
  const latestVisibleSeason = visibleSeasons.at(-1);
  const revealIsPartial =
    isRevealing &&
    safeVisibleCount > 0 &&
    safeVisibleCount < career.seasons.length;
  const headerSeason = revealIsPartial ? latestVisibleSeason : undefined;
  const currentClubId =
    headerSeason?.teamId ?? career.currentClubId;
  const headerClub =
    currentClubId === null
      ? null
      : clubPresentation(requireClub(currentClubId));
  const visibleNationalPeriods = career.nationalTeamPeriods.filter(
    (period) => {
      if (!isRevealing) {
        return true;
      }

      return (
        latestVisibleSeason !== undefined &&
        period.ageEnd <= latestVisibleSeason.age
      );
    },
  );
  const nationalStats = sumStats(
    visibleNationalPeriods.map((period) => period.stats),
  );
  const totals = sumStats(
    visibleSeasons.map((season) => season.stats),
  );
  const currentDecisionAge =
    !isRevealing && career.phase === "decision"
      ? career.currentDecision?.age
      : undefined;
  const seasonsByAge = new Map(
    visibleSeasons.map((season) => [season.age, season]),
  );

  return {
    header: {
      age: headerSeason?.age ?? career.playerAge,
      club: headerClub,
      countryCode: country.fifaCode,
      countryFlag: countryFlag(country),
      marketValue: headerSeason?.marketValue ?? career.marketValue,
      number: career.identity.preferredNumber,
      overall: headerSeason?.overall ?? career.overall,
      position: POSITION_LABELS[career.identity.position],
    },
    nationalTeam: {
      countryFlag: countryFlag(country),
      name: `${country.nameZh}国家队`,
      stats: nationalStats,
    },
    panel: isRevealing
      ? { kind: "simulating" }
      : decisionPresentation(career),
    timeline: Array.from({ length: 24 }, (_, index) => {
      const age = 16 + index;
      const season = seasonsByAge.get(age);

      if (season !== undefined) {
        return seasonPresentation(season);
      }

      if (age === currentDecisionAge) {
        return { age, kind: "current" as const };
      }

      return { age, kind: "empty" as const };
    }),
    totals: {
      appearances: totals.appearances,
      assists: totals.assists,
      goals: totals.goals,
      trophies: visibleSeasons.reduce(
        (sum, season) => sum + season.trophies.length,
        0,
      ),
    },
  };
}

function decisionPresentation(
  career: ClassicCareerState,
): CareerDecisionPanelPresentation {
  const decision = career.currentDecision;

  if (career.phase !== "decision" || decision === null) {
    return { kind: "simulating" };
  }

  const copy =
    decision.type === "career_event" && decision.event
      ? EVENT_COPY[decision.event.eventKey]
      : DECISION_COPY[
          decision.type as Exclude<
            ClassicDecision["type"],
            "career_event"
          >
        ];
  const options = [...decision.options]
    .sort((left, right) => {
      if (left.kind === "stay") {
        return -1;
      }

      if (right.kind === "stay") {
        return 1;
      }

      return 0;
    })
    .map((option) => optionPresentation(career, decision, option));

  return {
    age: decision.age,
    decisionId: decision.id,
    description: copy.description,
    kind: "decision",
    options,
    title: copy.title,
  };
}

function optionPresentation(
  career: ClassicCareerState,
  decision: ClassicDecision,
  option: ClassicDecisionOption,
): CareerDecisionOptionPresentation {
  const clubId =
    option.clubId ??
    (option.kind === "stay" ? career.currentClubId : null);
  const club =
    clubId === null || clubId === undefined
      ? null
      : requireClub(clubId);
  const role =
    club === null
      ? null
      : resolveClassicSquadRole({
          clubInternationalReputation:
            club.internationalReputation,
          overall: career.overall,
          roleGroup: roleGroupForPosition(career.identity.position),
        });

  return {
    club: club === null ? null : clubPresentation(club),
    id: option.id,
    role: role === null ? "" : roleLabel(role),
    roleTone: role === null ? "positive" : roleTone(role),
    stars:
      club === null
        ? ""
        : "★".repeat(club.internationalReputation) || "—",
    subtitle:
      club === null
        ? option.optionKey === undefined
          ? ""
          : EVENT_OPTION_LABELS[option.optionKey] ?? option.optionKey
        : clubSubtitle(club),
    title: optionTitle(career, decision, option, club),
  };
}

function optionTitle(
  career: ClassicCareerState,
  decision: ClassicDecision,
  option: ClassicDecisionOption,
  club: Club | null,
): string {
  if (option.kind === "retire") {
    return "现在退役";
  }

  if (option.kind === "stay") {
    const current =
      career.currentClubId === null
        ? null
        : CLASSIC_CATALOG.clubById.get(career.currentClubId);
    return current === undefined || current === null
      ? "留下"
      : `留在 ${current.nameZh}`;
  }

  if (club !== null) {
    if (
      decision.type === "loan_offer" ||
      option.id.startsWith("loan:")
    ) {
      return `租借去 ${club.nameZh}`;
    }

    return `加盟 ${club.nameZh}`;
  }

  if (option.optionKey !== undefined) {
    return EVENT_OPTION_LABELS[option.optionKey] ?? option.label;
  }

  return option.label;
}

function seasonPresentation(
  season: ClassicCareerSeason,
): CareerTimelineRowPresentation {
  return {
    age: season.age,
    club: clubPresentation(requireClub(season.teamId)),
    kind: "season",
    overall: season.overall,
    stats: {
      appearances: season.stats.appearances,
      assists: season.stats.assists,
      goals: season.stats.goals,
    },
  };
}

function clubPresentation(club: Club): CareerClubPresentation {
  return {
    abbreviation: club.abbreviation,
    color: club.primaryColor,
    id: club.id,
    name: club.nameZh,
    shortName: club.shortNameZh,
    subtitle: clubSubtitle(club),
  };
}

function clubSubtitle(club: Club): string {
  const competition = CLASSIC_CATALOG.competitionById.get(
    club.competitionId,
  );
  const name = competition?.nameZh ?? "职业联赛";
  return club.tier === 2 ? `${name} · 次级联赛` : name;
}

function roleLabel(role: ClassicSquadRole): string {
  switch (role) {
    case "starter":
      return "绝对主力";
    case "high_rotation":
      return "轮换主力";
    case "low_rotation":
      return "边缘轮换";
    case "substitute":
      return "替补";
    case "third_keeper":
      return "三号门将";
  }
}

function roleTone(
  role: ClassicSquadRole,
): CareerDecisionOptionPresentation["roleTone"] {
  if (role === "starter" || role === "high_rotation") {
    return role === "starter" ? "primary" : "positive";
  }

  return role === "low_rotation" ? "warning" : "danger";
}

function sumStats(
  stats: readonly ClassicSeasonStats[],
): ClassicSeasonStats {
  return stats.reduce(
    (totals, current) => ({
      appearances: totals.appearances + current.appearances,
      assists: totals.assists + current.assists,
      cleanSheets: totals.cleanSheets + current.cleanSheets,
      goals: totals.goals + current.goals,
      goalsConceded:
        totals.goalsConceded + current.goalsConceded,
    }),
    EMPTY_STATS,
  );
}

function requireClub(id: string): Club {
  const club = CLASSIC_CATALOG.clubById.get(id);

  if (club === undefined) {
    throw new RangeError(`Unknown Classic club: ${id}`);
  }

  return club;
}

function requireCountry(code: string): Country {
  const country = CLASSIC_CATALOG.countryByFifaCode.get(code);

  if (country === undefined) {
    throw new RangeError(`Unknown Classic country: ${code}`);
  }

  return country;
}

function countryFlag(country: Country): string {
  if (country.fifaCode === "ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }

  if (country.fifaCode === "SCO") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }

  return [...country.isoAlpha2.toUpperCase()]
    .map((character) =>
      String.fromCodePoint(character.codePointAt(0)! + 127397),
    )
    .join("");
}
