import type { PersonalAward } from "../../domain/awards";
import type {
  ClassicCareerSeason,
  ClassicCareerState,
} from "../../domain/classicEngine";
import type { CareerTrophy } from "../../domain/careerEvents";
import {
  CLASSIC_CATALOG,
  type Club,
  type Competition,
  type ConfederationId,
} from "../../domain/catalog/classicCatalog";
import type {
  NationalTournamentResult,
  NationalTrophy,
} from "../../domain/nationalTeam";
import type {
  BadgeTier,
  HiddenTitleKey,
} from "../../domain/summary";
import {
  clubPresentation,
  positionLabel,
  type CareerClubPresentation,
} from "./careerPresentation";

export type SummaryHonorPresentation = {
  readonly count: number;
  readonly id: string;
  readonly kind: "award" | "trophy";
  readonly label: string;
};

export type SummaryTitlePresentation = {
  readonly description: string;
  readonly id: HiddenTitleKey;
  readonly label: string;
};

export type SummaryPresentation = {
  readonly badge: BadgeTier;
  readonly clubs: readonly {
    readonly club: CareerClubPresentation;
    readonly stats: string;
    readonly trophyCount: number;
  }[];
  readonly honors: readonly SummaryHonorPresentation[];
  readonly identity: {
    readonly country: string;
    readonly name: string;
    readonly number: number;
    readonly position: string;
  };
  readonly maxMarketValue: number;
  readonly maxOverall: number;
  readonly metrics: readonly [
    { readonly label: string; readonly value: number },
    { readonly label: string; readonly value: number },
    { readonly label: string; readonly value: number },
  ];
  readonly nationalTeam:
    | {
        readonly bestTournament: string | null;
        readonly name: string;
        readonly stats: string;
      }
    | null;
  readonly seasonCount: number;
  readonly seed: string;
  readonly titles: readonly SummaryTitlePresentation[];
};

const TITLE_COPY: Readonly<
  Record<
    HiddenTitleKey,
    { readonly description: string; readonly label: string }
  >
> = {
  evergreen: {
    description: "四十岁后依然留在职业赛场",
    label: "常青树",
  },
  go_out_on_top: {
    description: "在巅峰还未散去时主动告别",
    label: "功成身退",
  },
  iron_man: {
    description: "职业生涯出场达到 1000 场",
    label: "铁人",
  },
  journeyman: {
    description: "足迹遍布十家以上俱乐部",
    label: "足坛浪客",
  },
  king_of_football: {
    description: "传奇成长路线把能力推到 95+",
    label: "球王",
  },
  late_bloomer: {
    description: "晚熟型球员，硬是把自己练到了 88+",
    label: "大器晚成",
  },
  national_miracle: {
    description: "带领低声望国家队捧起世界杯",
    label: "国家奇迹",
  },
  new_messi: {
    description: "阿根廷 10 号再次站上世界之巅",
    label: "新梅西",
  },
  one_club_man: {
    description: "整个生涯只效力过一家俱乐部",
    label: "一人一城",
  },
  phenomenon: {
    description: "巴西 9 号中锋把能力推到 90+",
    label: "现象",
  },
  redemption: {
    description: "走出停赛阴影，最终赢得金球",
    label: "救赎",
  },
  uncrowned_king: {
    description: "巅峰能力 88+，却一冠未得",
    label: "无冕之王",
  },
};

const TOURNAMENT_RESULT_LABELS: Readonly<
  Record<NationalTournamentResult, string>
> = {
  champion: "冠军",
  final: "亚军",
  group: "小组赛",
  qf: "八强",
  r16: "十六强",
  sf: "四强",
};
const TOURNAMENT_RESULT_RANK: Readonly<
  Record<NationalTournamentResult, number>
> = {
  champion: 6,
  final: 5,
  group: 1,
  qf: 3,
  r16: 2,
  sf: 4,
};

export function createSummaryPresentation(
  career: ClassicCareerState,
): SummaryPresentation {
  const summary = career.summary;

  if (career.phase !== "summary" || summary === null) {
    throw new RangeError(
      "A completed Classic career is required for its summary",
    );
  }

  const country = CLASSIC_CATALOG.countryByFifaCode.get(
    career.nationalityFifaCode,
  );

  if (country === undefined) {
    throw new RangeError(
      `Unknown Classic country: ${career.nationalityFifaCode}`,
    );
  }

  const goalkeeper = career.identity.position === "GK";

  return {
    badge: summary.badge,
    clubs: summary.clubs.map((clubSummary) => {
      const club = requireClub(clubSummary.teamId);
      return {
        club: clubPresentation(club),
        stats: goalkeeper
          ? `${clubSummary.stats.appearances} 场 · ${clubSummary.stats.cleanSheets} 零封`
          : `${clubSummary.stats.appearances} 场 · ${clubSummary.stats.goals} 球 · ${clubSummary.stats.assists} 助`,
        trophyCount: clubSummary.trophies.length,
      };
    }),
    honors: aggregateHonors(
      career.seasons,
      country.confederation,
    ),
    identity: {
      country: country.nameZh,
      name: [
        career.identity.lastName,
        career.identity.firstName,
      ]
        .filter(Boolean)
        .join(""),
      number: career.identity.preferredNumber,
      position: positionLabel(career.identity.position),
    },
    maxMarketValue: summary.maxMarketValue,
    maxOverall: summary.maxOverall,
    metrics: goalkeeper
      ? [
          {
            label: "出场",
            value: summary.totals.appearances,
          },
          {
            label: "零封",
            value: summary.totals.cleanSheets,
          },
          {
            label: "失球",
            value: summary.totals.goalsConceded,
          },
        ]
      : [
          {
            label: "出场",
            value: summary.totals.appearances,
          },
          { label: "进球", value: summary.totals.goals },
          { label: "助攻", value: summary.totals.assists },
        ],
    nationalTeam:
      summary.nationalStats.appearances === 0
        ? null
        : {
            bestTournament: bestTournament(career),
            name: `${country.nameZh}国家队`,
            stats: goalkeeper
              ? `${summary.nationalStats.appearances} 场 · ${summary.nationalStats.cleanSheets} 零封`
              : `${summary.nationalStats.appearances} 场 · ${summary.nationalStats.goals} 球 · ${summary.nationalStats.assists} 助`,
          },
    seasonCount: career.seasons.length,
    seed: career.seed,
    titles: summary.hiddenTitles.map((id) => ({
      id,
      ...TITLE_COPY[id],
    })),
  };
}

function aggregateHonors(
  seasons: readonly ClassicCareerSeason[],
  nationalConfederation: ConfederationId,
): readonly SummaryHonorPresentation[] {
  const honors = new Map<
    string,
    Omit<SummaryHonorPresentation, "count"> & { count: number }
  >();

  for (const season of seasons) {
    for (const trophy of season.trophies) {
      const label = trophyLabel(
        season,
        trophy,
        nationalConfederation,
      );
      addHonor(honors, `trophy:${label}`, "trophy", label);
    }

    for (const award of season.awards) {
      addHonor(
        honors,
        `award:${award}`,
        "award",
        awardLabel(award),
      );
    }
  }

  return [...honors.values()];
}

function addHonor(
  honors: Map<
    string,
    Omit<SummaryHonorPresentation, "count"> & { count: number }
  >,
  id: string,
  kind: SummaryHonorPresentation["kind"],
  label: string,
): void {
  const existing = honors.get(id);

  if (existing) {
    existing.count += 1;
    return;
  }

  honors.set(id, { count: 1, id, kind, label });
}

function trophyLabel(
  season: ClassicCareerSeason,
  trophy: CareerTrophy,
  nationalConfederation: ConfederationId,
): string {
  const club = requireClub(season.teamId);
  const competition = competitionForSeason(
    club,
    season.competitionTier,
  );
  const confederation =
    CLASSIC_CATALOG.confederations[club.confederation];

  switch (trophy) {
    case "league":
      return `${competition.nameZh}冠军`;
    case "cup":
      return (
        CLASSIC_CATALOG.domesticCupById.get(
          competition.domesticCupId,
        )?.nameZh ?? "国内杯赛"
      );
    case "continental_primary":
      return confederation.continentalPrimary;
    case "continental_secondary":
      return (
        confederation.continentalSecondary ?? "洲际次级赛事"
      );
    case "club_world_cup":
      return "世俱杯";
    case "national_continental":
      return CLASSIC_CATALOG.confederations[
        nationalConfederation
      ].nationalContinental;
    case "world_cup":
      return "世界杯";
  }
}

function awardLabel(award: PersonalAward): string {
  switch (award) {
    case "ballon_dor":
      return "金球奖";
    case "golden_boot":
      return "金靴奖";
    case "golden_glove":
      return "金手套";
  }
}

function bestTournament(
  career: ClassicCareerState,
): string | null {
  const bestByTrophy = new Map<
    NationalTrophy,
    NationalTournamentResult
  >();

  for (const record of career.seasons.flatMap(
    (season) => season.nationalTournamentRecords,
  )) {
    if (record.status !== "played") {
      continue;
    }

    const existing = bestByTrophy.get(record.trophy);

    if (
      existing === undefined ||
      TOURNAMENT_RESULT_RANK[record.result] >
        TOURNAMENT_RESULT_RANK[existing]
    ) {
      bestByTrophy.set(record.trophy, record.result);
    }
  }

  const labels = (
    ["world_cup", "national_continental"] as const
  ).flatMap((trophy) => {
    const result = bestByTrophy.get(trophy);

    if (result === undefined) {
      return [];
    }

    return [
      `${tournamentName(career, trophy)}${TOURNAMENT_RESULT_LABELS[result]}`,
    ];
  });

  return labels.length === 0 ? null : labels.join(" · ");
}

function tournamentName(
  career: ClassicCareerState,
  trophy: NationalTrophy,
): string {
  if (trophy === "world_cup") {
    return "世界杯";
  }

  const country = CLASSIC_CATALOG.countryByFifaCode.get(
    career.nationalityFifaCode,
  );

  if (country === undefined) {
    return "洲际杯";
  }

  return CLASSIC_CATALOG.confederations[country.confederation]
    .nationalContinental;
}

function competitionForSeason(
  club: Club,
  tier: 1 | 2,
): Competition {
  const competition = CLASSIC_CATALOG.competitions.find(
    (candidate) =>
      candidate.countryFifaCode === club.countryFifaCode &&
      candidate.tier === tier,
  );

  if (competition === undefined) {
    const fallback = CLASSIC_CATALOG.competitionById.get(
      club.competitionId,
    );

    if (fallback === undefined) {
      throw new RangeError(
        `Unknown competition for Classic club: ${club.id}`,
      );
    }

    return fallback;
  }

  return competition;
}

function requireClub(id: string): Club {
  const club = CLASSIC_CATALOG.clubById.get(id);

  if (club === undefined) {
    throw new RangeError(`Unknown Classic club: ${id}`);
  }

  return club;
}
