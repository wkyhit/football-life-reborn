import {
  CLASSIC_CATALOG,
  type ClassicCountryCode,
  type ConfederationId,
  type Country,
} from "../../domain/catalog/classicCatalog";

export const RECENT_COUNTRY_STORAGE_KEY =
  "football-life.ui.recent-countries" as const;

export type CountryFilter = "all" | ConfederationId;

export const COUNTRY_FILTERS: readonly {
  readonly id: CountryFilter;
  readonly label: string;
}[] = [
  { id: "all", label: "全部" },
  { id: "AFC", label: "亚洲" },
  { id: "UEFA", label: "欧洲" },
  { id: "CONMEBOL", label: "南美" },
  { id: "CONCACAF", label: "北中美" },
  { id: "CAF", label: "非洲" },
  { id: "OFC", label: "大洋洲" },
];

const MAX_RECENT_COUNTRIES = 4;

type RecentCountryStorage = Pick<
  Storage,
  "getItem" | "setItem"
>;

export function discoverCountries(input: {
  readonly filter: CountryFilter;
  readonly query: string;
}): readonly Country[] {
  const query = input.query.trim().toLocaleLowerCase("zh-CN");

  return CLASSIC_CATALOG.countries.filter((country) => {
    if (
      query.length === 0 &&
      input.filter !== "all" &&
      country.confederation !== input.filter
    ) {
      return false;
    }

    if (query.length === 0) {
      return true;
    }

    return [
      country.fifaCode,
      country.isoAlpha2,
      country.nameEn,
      country.nameZh,
    ].some((value) =>
      value.toLocaleLowerCase("zh-CN").includes(query),
    );
  });
}

export function loadRecentCountryCodes(
  storage: RecentCountryStorage | null,
): readonly ClassicCountryCode[] {
  try {
    const raw = storage?.getItem(RECENT_COUNTRY_STORAGE_KEY);

    if (raw === null || raw === undefined) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (value): value is ClassicCountryCode =>
          typeof value === "string" &&
          CLASSIC_CATALOG.countryByFifaCode.has(value),
      )
      .filter(
        (value, index, values) =>
          values.indexOf(value) === index,
      )
      .slice(0, MAX_RECENT_COUNTRIES);
  } catch {
    return [];
  }
}

export function rememberRecentCountry(
  storage: RecentCountryStorage | null,
  countryCode: ClassicCountryCode,
): readonly ClassicCountryCode[] {
  const next = [
    countryCode,
    ...loadRecentCountryCodes(storage).filter(
      (candidate) => candidate !== countryCode,
    ),
  ].slice(0, MAX_RECENT_COUNTRIES);

  try {
    storage?.setItem(
      RECENT_COUNTRY_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // The in-memory list remains usable when local storage is blocked.
  }

  return next;
}
