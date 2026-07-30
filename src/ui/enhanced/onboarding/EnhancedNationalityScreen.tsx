import {
  useMemo,
  useState,
  type Dispatch,
} from "react";

import {
  CLASSIC_CATALOG,
  type Country,
} from "../../../domain/catalog/classicCatalog";
import type {
  CareerAction,
  CareerState,
} from "../../../domain/model";
import {
  COUNTRY_FILTERS,
  discoverCountries,
  loadRecentCountryCodes,
  rememberRecentCountry,
  type CountryFilter,
} from "../countryDiscovery";

type EnhancedNationalityScreenProps = {
  readonly dispatch: Dispatch<CareerAction>;
  readonly state: CareerState;
};

export function EnhancedNationalityScreen({
  dispatch,
  state,
}: EnhancedNationalityScreenProps) {
  const [filter, setFilter] = useState<CountryFilter>("all");
  const [query, setQuery] = useState("");
  const [recentCodes, setRecentCodes] = useState(() =>
    loadRecentCountryCodes(window.localStorage),
  );
  const visibleCountries = useMemo(
    () => discoverCountries({ filter, query }),
    [filter, query],
  );
  const recentCountries = recentCodes.flatMap((code) => {
    const country = CLASSIC_CATALOG.countryByFifaCode.get(code);
    return country === undefined ? [] : [country];
  });

  const selectCountry = (country: Country) => {
    setRecentCodes(
      rememberRecentCountry(
        window.localStorage,
        country.fifaCode,
      ),
    );
    dispatch({
      nationality: country.fifaCode,
      type: "select_nationality",
    });
  };

  return (
    <main
      className="flex h-dvh min-w-0 flex-col overflow-hidden bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-setup-shell="nationality"
      id="main-content"
    >
      <header className="shrink-0 border-b border-enhanced-line px-4 pb-4 pt-[max(20px,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
              PLAYER SETUP · 01
            </p>
            <h1 className="mt-1 text-[22px] font-extrabold">
              选择国籍
            </h1>
            <p className="mt-1 text-[13px] text-zinc-400">
              国家队门槛不同，但 61 个选择都能走完整生涯
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-zinc-500">
            1 / 3
          </span>
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <input
          aria-label="搜索国家"
          className="h-12 shrink-0 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-[15px] text-enhanced-strong outline-none placeholder:text-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索中文、英文或 FIFA code"
          type="search"
          value={query}
        />

        <nav
          aria-label="洲别筛选"
          className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1"
        >
          {COUNTRY_FILTERS.map((option) => {
            const count =
              option.id === "all"
                ? CLASSIC_CATALOG.countries.length
                : CLASSIC_CATALOG.countries.filter(
                    (country) =>
                      country.confederation === option.id,
                  ).length;
            const selected = filter === option.id;

            return (
              <button
                aria-pressed={selected}
                className={
                  selected
                    ? "min-h-11 shrink-0 rounded-full border border-emerald-400 bg-emerald-400/10 px-4 text-xs font-bold text-emerald-300"
                    : "min-h-11 shrink-0 rounded-full border border-enhanced-line bg-enhanced-surface px-4 text-xs font-bold text-zinc-400"
                }
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label} {count}
              </button>
            );
          })}
        </nav>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {query.trim().length === 0 &&
          recentCountries.length > 0 ? (
            <section
              aria-label="最近选择"
              className="mb-4 border-b border-enhanced-line pb-4"
            >
              <h2 className="mb-2 text-[11px] font-bold text-zinc-500">
                最近选择
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {recentCountries.map((country) => (
                  <CountryButton
                    country={country}
                    key={country.fifaCode}
                    onSelect={selectCountry}
                    selected={
                      state.player.nationality ===
                      country.fifaCode
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {visibleCountries.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center text-center">
              <div>
                <p className="text-base font-bold">
                  没有匹配的国家
                </p>
                <p className="mt-1 text-[13px] text-zinc-500">
                  换个中文、英文或 FIFA code 试试
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleCountries.map((country) => (
                <CountryButton
                  country={country}
                  key={country.fifaCode}
                  onSelect={selectCountry}
                  selected={
                    state.player.nationality ===
                    country.fifaCode
                  }
                />
              ))}
            </div>
          )}
        </div>

        <footer className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-enhanced-line pt-3">
          <button
            className="min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-5 text-sm font-bold"
            onClick={() => dispatch({ type: "back" })}
            type="button"
          >
            返回
          </button>
          <button
            className="min-h-12 rounded-[10px] bg-enhanced-pitch px-5 text-sm font-bold text-enhanced-pitch-ink disabled:bg-zinc-800 disabled:text-zinc-600"
            disabled={state.player.nationality === null}
            onClick={() =>
              dispatch({ type: "continue_setup" })
            }
            type="button"
          >
            下一步
          </button>
        </footer>
      </section>
    </main>
  );
}

function CountryButton({
  country,
  onSelect,
  selected,
}: {
  readonly country: Country;
  readonly onSelect: (country: Country) => void;
  readonly selected: boolean;
}) {
  return (
    <button
      aria-label={country.nameZh}
      aria-pressed={selected}
      className={
        selected
          ? "flex min-h-14 items-center gap-2 rounded-[10px] border border-emerald-400 bg-emerald-400/10 p-2.5 text-left"
          : "flex min-h-14 items-center gap-2 rounded-[10px] border border-enhanced-line bg-enhanced-surface p-2.5 text-left"
      }
      data-country-confederation={country.confederation}
      data-enhanced-country={country.fifaCode}
      onClick={() => onSelect(country)}
      type="button"
    >
      <span aria-hidden="true" className="text-xl">
        {countryFlag(country)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold">
          {country.nameZh}
        </span>
        <span className="block text-[10px] text-zinc-500">
          {country.fifaCode}
        </span>
      </span>
      {selected ? (
        <span
          aria-hidden="true"
          className="ml-auto text-emerald-300"
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}

function countryFlag(country: Country): string {
  if (country.fifaCode === "ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }

  if (country.fifaCode === "SCO") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }

  return country.isoAlpha2
    .toUpperCase()
    .split("")
    .map((letter) =>
      String.fromCodePoint(letter.charCodeAt(0) + 127_397),
    )
    .join("");
}
