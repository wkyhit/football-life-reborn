import type {
  ClassicCareerSeason,
  ClassicCareerState,
  ClassicDecision,
  ClassicDecisionOption,
  ClassicDecisionResult,
} from "../../domain/classicEngine";
import type { PersonalAward } from "../../domain/awards";
import {
  selectCareerEventNarrative,
  type CareerTrophy,
  type CareerEventOutcomePreview,
  type CareerEventPreviewTone,
  type NationalTrophy,
} from "../../domain/careerEvents";
import {
  createCareerEconomyProjection,
  type CareerEconomyProjection,
  type CareerEconomyChoiceResult,
  type CareerEconomyOptionQuote,
  type CareerSeasonSalary,
} from "../../domain/economy/careerEconomyProjection";
import { formatYuan } from "../../domain/economy/economyPolicy";
import type {
  NationalTournamentRecord,
  NationalTournamentResult,
} from "../../domain/nationalTeam";
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
import {
  createEventResultReveal,
  type ClassicEventResultReveal,
  type SeasonRevealQueueItem,
} from "../../features/season-reveal/seasonReveal";

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
  readonly consequences: readonly CareerDecisionConsequencePresentation[];
  readonly contract: CareerDecisionContractPresentation | null;
  readonly honorOpportunities: readonly string[];
  readonly id: string;
  readonly outcomePreviews: readonly CareerEventOutcomePreview[];
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

export type CareerDecisionConsequencePresentation = {
  readonly probability: number | null;
  readonly probabilityLabel: string | null;
  readonly semanticLabel: "中性" | "正向" | "注意" | "风险";
  readonly text: string;
  readonly tone: CareerEventPreviewTone;
};

export type CareerDecisionContractPresentation =
  | {
      readonly annualSalary: number;
      readonly certainty: "estimated" | "exact";
      readonly kind: "new_contract";
      readonly label: string;
    }
  | {
      readonly annualSalary: number;
      readonly kind: "contract_unchanged";
      readonly label: string;
      readonly reason: "career_choice" | "loan" | "stay";
    }
  | {
      readonly kind: "no_contract";
      readonly label: string;
      readonly reason: "free_agent" | "retire";
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
  | ({
      readonly age: number;
      readonly kind: "event_result";
    } & ClassicEventResultReveal)
  | {
      readonly age: number;
      readonly club: CareerClubPresentation;
      readonly honors: readonly CareerSeasonHonorPresentation[];
      readonly kind: "milestone";
      readonly nationalTournaments: readonly CareerNationalTournamentPresentation[];
      readonly statuses: readonly CareerSeasonStatusPresentation[];
      readonly tierChange: CareerTierChangePresentation | null;
      readonly title: "赛季里程碑";
    }
  | { readonly kind: "simulating" };

export type CareerSeasonHonorPresentation =
  | {
      readonly award: PersonalAward;
      readonly kind: "award";
      readonly label: string;
    }
  | {
      readonly kind: "trophy";
      readonly label: string;
      readonly scope: "club" | "national";
      readonly trophy: CareerTrophy;
    };

export type CareerNationalTournamentPresentation = {
  readonly label: string;
  readonly result: NationalTournamentResult | null;
  readonly status: NationalTournamentRecord["status"];
  readonly trophy: NationalTrophy;
};

export type CareerSeasonStatusPresentation =
  | {
      readonly kind: "relegation";
      readonly label: string;
    }
  | {
      readonly kind: "suspension";
      readonly label: string;
    };

export type CareerTierChangePresentation = {
  readonly from: 1 | 2;
  readonly label: string;
  readonly to: 1 | 2;
};

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
      readonly competitionTier: 1 | 2;
      readonly honors: readonly CareerSeasonHonorPresentation[];
      readonly kind: "season";
      readonly economy: {
        readonly annualSalary: number;
        readonly income: number;
      } | null;
      readonly marketValue: number;
      readonly nationalTournaments: readonly CareerNationalTournamentPresentation[];
      readonly overall: number;
      readonly stats: Pick<
        ClassicSeasonStats,
        "appearances" | "assists" | "goals"
      >;
      readonly statuses: readonly CareerSeasonStatusPresentation[];
      readonly tierChange: CareerTierChangePresentation | null;
    };

export type CareerPresentation = {
  readonly economy: {
    readonly annualSalary: number | null;
    readonly totalIncome: number;
  } | null;
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
  readonly recentEventResult: ClassicEventResultReveal | null;
  readonly timeline: readonly CareerTimelineRowPresentation[];
  readonly totals: {
    readonly appearances: number;
    readonly assists: number;
    readonly goals: number;
    readonly trophies: number;
  };
};

type CareerPresentationInput = {
  readonly activeRevealItem?: SeasonRevealQueueItem | null;
  readonly career: ClassicCareerState;
  readonly isRevealing: boolean;
  readonly recentEventContractResult?: CareerEconomyChoiceResult | null;
  readonly recentEventResult?: ClassicDecisionResult | null;
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

const TROPHY_LABELS: Readonly<Record<CareerTrophy, string>> = {
  club_world_cup: "世俱杯冠军",
  continental_primary: "顶级洲际赛事冠军",
  continental_secondary: "次级洲际赛事冠军",
  cup: "国内杯赛冠军",
  league: "联赛冠军",
  national_continental: "洲际国家队冠军",
  world_cup: "世界杯冠军",
};

const AWARD_LABELS: Readonly<Record<PersonalAward, string>> = {
  ballon_dor: "金球奖",
  golden_boot: "金靴奖",
  golden_glove: "金手套奖",
};

const NATIONAL_TOURNAMENT_LABELS: Readonly<
  Record<NationalTrophy, string>
> = {
  national_continental: "洲际国家队赛事",
  world_cup: "世界杯",
};

const NATIONAL_RESULT_LABELS: Readonly<
  Record<NationalTournamentResult, string>
> = {
  champion: "冠军",
  final: "亚军",
  group: "小组赛",
  qf: "八强",
  r16: "十六强",
  sf: "四强",
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

export function createCareerPresentation({
  activeRevealItem = null,
  career,
  isRevealing,
  recentEventContractResult = null,
  recentEventResult = null,
  visibleSeasonCount,
}: CareerPresentationInput): CareerPresentation {
  const country = requireCountry(career.nationalityFifaCode);
  const safeVisibleCount = Math.max(
    0,
    Math.min(visibleSeasonCount, career.seasons.length),
  );
  const visibleSeasons = career.seasons.slice(0, safeVisibleCount);
  const latestVisibleSeason = visibleSeasons.at(-1);
  const economy = tryCreateEconomyProjection(career);
  const visibleSeasonSalaries =
    economy?.seasonSalaries.slice(0, safeVisibleCount) ?? [];
  const salaryBySeasonIndex = new Map(
    visibleSeasonSalaries.map((salary) => [
      salary.seasonIndex,
      salary,
    ]),
  );
  const latestVisibleSalary = visibleSeasonSalaries.at(-1);
  const headerSeason = isRevealing
    ? latestVisibleSeason
    : undefined;
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
  const timelineAges = createTimelineAgeRange({
    currentDecisionAge,
    lastRevealedAge: latestVisibleSeason?.age,
  });
  const timeline = timelineAges.map((age) => {
    const season = seasonsByAge.get(age);

    if (season !== undefined) {
      return seasonPresentation(
        season,
        seasonsByAge.get(age - 1),
        salaryBySeasonIndex.get(season.index) ?? null,
      );
    }

    if (age === currentDecisionAge) {
      return { age, kind: "current" as const };
    }

    return { age, kind: "empty" as const };
  });

  return {
    economy:
      economy === null
        ? null
        : {
            annualSalary: isRevealing
              ? latestVisibleSalary?.annualSalary ?? null
              : economy.currentContract?.annualSalary ?? null,
            totalIncome: isRevealing
              ? visibleSeasonSalaries.reduce(
                  (total, salary) => total + salary.income,
                  0,
                )
              : economy.totalIncome,
          },
    header: {
      age: headerSeason?.age ?? career.playerAge,
      club: headerClub,
      countryCode: country.fifaCode,
      countryFlag: countryFlag(country),
      marketValue: headerSeason?.marketValue ?? career.marketValue,
      number: career.identity.preferredNumber,
      overall: headerSeason?.overall ?? career.overall,
      position: positionLabel(career.identity.position),
    },
    nationalTeam: {
      countryFlag: countryFlag(country),
      name: `${country.nameZh}国家队`,
      stats: nationalStats,
    },
    panel: revealPanelPresentation({
      activeRevealItem,
      career,
      economy,
      isRevealing,
    }),
    recentEventResult:
      !isRevealing && recentEventResult !== null
        ? createEventResultReveal(
            recentEventResult,
            recentEventContractResult,
          )
        : null,
    timeline,
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

function createTimelineAgeRange(input: {
  readonly currentDecisionAge: number | undefined;
  readonly lastRevealedAge: number | undefined;
}): readonly number[] {
  const endAge = Math.max(
    39,
    input.lastRevealedAge ?? 16,
    input.currentDecisionAge ?? 16,
  );

  return Array.from(
    { length: endAge - 16 + 1 },
    (_, index) => 16 + index,
  );
}

function revealPanelPresentation(input: {
  readonly activeRevealItem: SeasonRevealQueueItem | null;
  readonly career: ClassicCareerState;
  readonly economy: CareerEconomyProjection | null;
  readonly isRevealing: boolean;
}): CareerDecisionPanelPresentation {
  if (!input.isRevealing) {
    return decisionPresentation(
      input.career,
      input.economy,
    );
  }

  const item = input.activeRevealItem;

  if (item?.kind === "event_result") {
    const result = createEventResultReveal(
      item.result,
      item.contractResult,
    );

    return result === null
      ? { kind: "simulating" }
      : {
          ...result,
          age: item.result.decision.age,
          kind: "event_result",
        };
  }

  if (item?.kind === "milestone") {
    const season = input.career.seasons[item.seasonIndex];

    if (season === undefined) {
      return { kind: "simulating" };
    }

    const presentation = seasonPresentation(
      season,
      input.career.seasons[item.seasonIndex - 1],
      null,
    );

    return {
      age: presentation.age,
      club: presentation.club,
      honors: presentation.honors,
      kind: "milestone",
      nationalTournaments: presentation.nationalTournaments,
      statuses: presentation.statuses,
      tierChange: presentation.tierChange,
      title: "赛季里程碑",
    };
  }

  return { kind: "simulating" };
}

function decisionPresentation(
  career: ClassicCareerState,
  economy: CareerEconomyProjection | null,
): CareerDecisionPanelPresentation {
  const decision = career.currentDecision;

  if (career.phase !== "decision" || decision === null) {
    return { kind: "simulating" };
  }

  const copy =
    decision.type === "career_event" && decision.event
      ? selectCareerEventNarrative({
          eventKey: decision.event.eventKey,
          injuryType: decision.event.injuryType,
          targetClubTrophy: decision.event.targetClubTrophy,
          targetTrophy: decision.event.targetTrophy,
          variantKey: decision.event.variantKey,
        })
      : DECISION_COPY[
          decision.type as Exclude<
            ClassicDecision["type"],
            "career_event"
          >
        ];
  const economyByOptionId = new Map(
    economy?.optionQuotes.map((quote) => [
      quote.optionId,
      quote,
    ]) ?? [],
  );
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
    .map((option) =>
      optionPresentation(
        career,
        decision,
        option,
        economyByOptionId.get(option.id) ?? null,
      ),
    );

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
  economyQuote: CareerEconomyOptionQuote | null,
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
  const eventOption =
    decision.type === "career_event" &&
    decision.event !== undefined &&
    option.optionKey !== undefined
      ? selectCareerEventNarrative({
          eventKey: decision.event.eventKey,
          injuryType: decision.event.injuryType,
          optionKey: option.optionKey,
          targetClubTrophy: decision.event.targetClubTrophy,
          targetTrophy: decision.event.targetTrophy,
          variantKey: decision.event.variantKey,
        }).option
      : null;
  const outcomePreviews = eventOption?.previews ?? [];

  return {
    club: club === null ? null : clubPresentation(club),
    consequences: outcomePreviews.map(
      consequencePresentation,
    ),
    contract: contractPresentation(economyQuote),
    honorOpportunities: honorOpportunities(
      decision,
      club,
    ),
    id: option.id,
    outcomePreviews,
    role: role === null ? "" : roleLabel(role),
    roleTone: role === null ? "positive" : roleTone(role),
    stars:
      club === null
        ? ""
        : "★".repeat(club.internationalReputation) || "—",
    subtitle:
      club === null
        ? outcomePreviews.length === 0
          ? ""
          : "查看可能后果"
        : clubSubtitle(club),
    title: optionTitle(
      career,
      decision,
      option,
      club,
      eventOption?.label ?? null,
    ),
  };
}

function consequencePresentation(
  preview: CareerEventOutcomePreview,
): CareerDecisionConsequencePresentation {
  return {
    probability: preview.probability ?? null,
    probabilityLabel:
      preview.probability === undefined
        ? null
        : `${Math.round(preview.probability * 100)}%`,
    semanticLabel: consequenceSemanticLabel(
      preview.tone,
    ),
    text: preview.text,
    tone: preview.tone,
  };
}

function consequenceSemanticLabel(
  tone: CareerEventPreviewTone,
): CareerDecisionConsequencePresentation["semanticLabel"] {
  switch (tone) {
    case "positive":
      return "正向";
    case "negative":
      return "风险";
    case "warning":
      return "注意";
    case "neutral":
      return "中性";
  }
}

function contractPresentation(
  quote: CareerEconomyOptionQuote | null,
): CareerDecisionContractPresentation | null {
  if (quote === null) {
    return null;
  }

  if (quote.kind === "new_contract") {
    return {
      annualSalary: quote.quote.annualSalary,
      certainty: quote.certainty,
      kind: "new_contract",
      label: `${
        quote.certainty === "estimated"
          ? "预计年薪"
          : "年薪"
      } ${formatYuan(quote.quote.annualSalary)}`,
    };
  }

  if (quote.kind === "contract_unchanged") {
    return {
      annualSalary: quote.contract.annualSalary,
      kind: "contract_unchanged",
      label: `${
        quote.reason === "loan"
          ? "母队合同不变"
          : "合同不变"
      } · 年薪 ${formatYuan(quote.contract.annualSalary)}`,
      reason: quote.reason,
    };
  }

  return {
    kind: "no_contract",
    label:
      quote.reason === "retire"
        ? "退役后停止收入"
        : "本选项不签新合同",
    reason: quote.reason,
  };
}

function honorOpportunities(
  decision: ClassicDecision,
  club: Club | null,
): readonly string[] {
  const opportunities: string[] = [];

  if (club !== null) {
    const competition =
      CLASSIC_CATALOG.competitionById.get(
        club.competitionId,
      );

    if (
      club.tier === 2 ||
      club.domesticReputation > 0
    ) {
      opportunities.push(
        club.tier === 2 ? "联赛/升级" : "联赛",
      );
    }

    if (
      competition !== undefined &&
      CLASSIC_CATALOG.domesticCupById.has(
        competition.domesticCupId,
      )
    ) {
      opportunities.push("国内杯赛");
    }

    if (club.continentalReputation > 0) {
      opportunities.push("洲际赛事");
    }
  }

  const targetedTrophy =
    decision.event?.targetClubTrophy ??
    decision.event?.targetTrophy;

  if (targetedTrophy !== undefined) {
    const label = TROPHY_LABELS[targetedTrophy].replace(
      "冠军",
      "",
    );

    const alreadyCovered =
      opportunities.includes(label) ||
      (label === "联赛" &&
        opportunities.includes("联赛/升级"));

    if (!alreadyCovered) {
      opportunities.push(label);
    }
  }

  return opportunities;
}

function tryCreateEconomyProjection(
  career: ClassicCareerState,
): ReturnType<typeof createCareerEconomyProjection> | null {
  try {
    return createCareerEconomyProjection(career);
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }

    // Invalid/recovery presentation may still render, but it never
    // invents a fallback amount.
    return null;
  }
}

export function formatMarketValue(
  valueEuro: number,
): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function optionTitle(
  career: ClassicCareerState,
  decision: ClassicDecision,
  option: ClassicDecisionOption,
  club: Club | null,
  eventOptionLabel: string | null,
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

  if (eventOptionLabel !== null) {
    return eventOptionLabel;
  }

  return option.label;
}

function seasonPresentation(
  season: ClassicCareerSeason,
  previousSeason: ClassicCareerSeason | undefined,
  salary: CareerSeasonSalary | null,
): Extract<
  CareerTimelineRowPresentation,
  { readonly kind: "season" }
> {
  const tierChange =
    previousSeason !== undefined &&
    previousSeason.teamId === season.teamId &&
    previousSeason.competitionTier !== season.competitionTier
      ? {
          from: previousSeason.competitionTier,
          label:
            season.competitionTier === 1
              ? "进入顶级联赛"
              : "进入次级联赛",
          to: season.competitionTier,
        }
      : null;

  return {
    age: season.age,
    club: clubPresentation(requireClub(season.teamId)),
    competitionTier: season.competitionTier,
    economy:
      salary === null
        ? null
        : {
            annualSalary: salary.annualSalary,
            income: salary.income,
          },
    honors: [
      ...season.trophies.map((trophy) => ({
        kind: "trophy" as const,
        label: TROPHY_LABELS[trophy],
        scope: isNationalTrophy(trophy)
          ? ("national" as const)
          : ("club" as const),
        trophy,
      })),
      ...season.awards.map((award) => ({
        award,
        kind: "award" as const,
        label: AWARD_LABELS[award],
      })),
    ],
    kind: "season",
    marketValue: season.marketValue,
    nationalTournaments: season.nationalTournamentRecords.map(
      nationalTournamentPresentation,
    ),
    overall: season.overall,
    stats: {
      appearances: season.stats.appearances,
      assists: season.stats.assists,
      goals: season.stats.goals,
    },
    statuses: [
      ...(season.suspended
        ? [
            {
              kind: "suspension" as const,
              label: "停赛",
            },
          ]
        : []),
      ...(season.relegated
        ? [
            {
              kind: "relegation" as const,
              label: "降入次级联赛",
            },
          ]
        : []),
    ],
    tierChange,
  };
}

function nationalTournamentPresentation(
  record: NationalTournamentRecord,
): CareerNationalTournamentPresentation {
  const result =
    record.status === "played" ? record.result : null;
  const resultLabel =
    record.status === "played"
      ? NATIONAL_RESULT_LABELS[record.result]
      : record.status === "not_qualified"
        ? "未晋级"
        : "未入选";

  return {
    label: `${NATIONAL_TOURNAMENT_LABELS[record.trophy]} · ${resultLabel}`,
    result,
    status: record.status,
    trophy: record.trophy,
  };
}

function isNationalTrophy(
  trophy: CareerTrophy,
): trophy is NationalTrophy {
  return (
    trophy === "national_continental" ||
    trophy === "world_cup"
  );
}

export function clubPresentation(
  club: Club,
): CareerClubPresentation {
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

export function positionLabel(
  position: ClassicPosition,
): string {
  return POSITION_LABELS[position];
}

export function countryFlag(country: Country): string {
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
