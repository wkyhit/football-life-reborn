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
import { EnhancedAction } from "../components/EnhancedAction";
import { EnhancedAppBar } from "../components/EnhancedAppBar";
import { EnhancedStateSurface } from "../components/EnhancedStateSurface";

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
      data-enhanced-stage="1.0"
      data-enhanced-setup-shell="nationality"
      data-hallmark-macrostructure="Narrative Workflow"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Narrative Workflow · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <EnhancedAppBar
        context="Player setup · 1.0"
        currentLabel="选择国籍"
        stage={{ current: 1, total: 3 }}
      />
      <div className="shrink-0 border-b border-enhanced-line px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="[overflow-wrap:anywhere] text-[22px] font-bold">
            选择国籍
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-enhanced-supporting">
            国家队门槛不同，但 61 个选择都能走完整生涯
          </p>
        </div>
      </div>

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <input
          aria-label="搜索国家"
          className="h-12 shrink-0 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-[15px] text-enhanced-strong outline-none placeholder:text-enhanced-supporting focus:border-enhanced-pitch focus:ring-2 focus:ring-enhanced-focus/25"
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
                    ? "min-h-11 shrink-0 rounded-full border border-enhanced-pitch bg-enhanced-pitch/10 px-4 text-xs font-bold text-enhanced-pitch"
                    : "min-h-11 shrink-0 rounded-full border border-enhanced-line bg-enhanced-surface px-4 text-xs font-bold text-enhanced-supporting"
                }
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label} {count}
                {selected ? (
                  <span aria-hidden="true"> · 当前</span>
                ) : null}
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
              <h2 className="mb-2 text-[11px] font-bold text-enhanced-supporting">
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
            <div className="min-h-48">
              <EnhancedStateSurface
                compact
                description="换个中文、英文或 FIFA code 试试。"
                eyebrow="Country index"
                state="empty"
                title="没有匹配的国家"
              />
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
          <EnhancedAction
            className="min-h-12"
            onClick={() => dispatch({ type: "back" })}
          >
            返回
          </EnhancedAction>
          <EnhancedAction
            className="min-h-12 w-full"
            disabled={state.player.nationality === null}
            onClick={() =>
              dispatch({ type: "continue_setup" })
            }
            tone="primary"
          >
            下一步
          </EnhancedAction>
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
          ? "flex min-h-14 items-center gap-2 rounded-[10px] border border-enhanced-pitch bg-enhanced-pitch/10 p-2.5 text-left"
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
        <span className="block text-[10px] text-enhanced-supporting">
          {country.fifaCode}
        </span>
      </span>
      {selected ? (
        <span
          aria-hidden="true"
          className="ml-auto text-enhanced-pitch"
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
