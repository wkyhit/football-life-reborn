import { useMemo, useState } from "react";

import {
  CLASSIC_CATALOG,
  type Country,
} from "../../domain/catalog/classicCatalog";
import type { NationalityCode } from "../../domain/model";
import { SetupFooter } from "./SetupFooter";
import { SetupShell } from "./SetupShell";

type NationalityScreenProps = {
  nationality: NationalityCode | null;
  onBack: () => void;
  onContinue: () => void;
  onSelect: (nationality: NationalityCode) => void;
};

const CLASSIC_COUNTRY_ORDER = [
  "CHN",
  "ARG",
  "BRA",
  "GER",
  "FRA",
  "ESP",
  "ENG",
  "BEL",
  "NED",
  "POR",
  "URU",
  "ITA",
  "AUT",
  "POL",
  "DEN",
  "COL",
  "KOR",
  "CRO",
  "MAR",
  "MEX",
  "JPN",
  "SUI",
  "SRB",
  "SEN",
  "TUR",
  "UKR",
  "IRN",
  "CHI",
  "ALG",
  "EGY",
  "IRL",
  "AUS",
  "PAR",
  "ECU",
  "CAN",
  "GHA",
  "CZE",
  "CMR",
  "CIV",
  "USA",
  "PER",
  "NGA",
  "NOR",
  "SWE",
  "KSA",
  "SCO",
  "TUN",
  "GRE",
  "PAN",
  "BOL",
  "CRC",
  "QAT",
  "VEN",
  "UZB",
  "NZL",
  "JAM",
  "IRQ",
  "FIJ",
  "THA",
  "IDN",
  "VIE",
] as const;

const CLASSIC_COUNTRIES = CLASSIC_COUNTRY_ORDER.map((code) => {
  const country = CLASSIC_CATALOG.countryByFifaCode.get(code);

  if (country === undefined) {
    throw new Error(`Missing Classic country ${code}`);
  }

  return country;
});

export function NationalityScreen({
  nationality,
  onBack,
  onContinue,
  onSelect,
}: NationalityScreenProps) {
  const [search, setSearch] = useState("");
  const visibleCountries = useMemo(
    () => filterCountries(CLASSIC_COUNTRIES, search),
    [search],
  );

  return (
    <SetupShell current={1}>
      <section className="flex min-h-0 flex-1 flex-col">
        <h1 className="shrink-0 text-2xl font-black leading-8 text-primary">
          你是哪国人
        </h1>
        <p className="mt-1.5 shrink-0 text-[13px] leading-[19.5px] text-muted">
          国籍决定国家队的门槛和你能捧起哪座大力神杯
        </p>
        <input
          className="mt-3 h-11 shrink-0 rounded-[12px] border border-line bg-surface px-4 text-[15px] text-foreground outline-none placeholder:text-zinc-600 focus:border-emerald-600"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索国家"
          value={search}
        />

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 pb-4">
            {visibleCountries.map((country) => {
              const selected = nationality === country.fifaCode;

              return (
                <button
                  aria-label={country.nameZh}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "flex items-center gap-2.5 rounded-[12px] border border-accent bg-accent-soft px-3 py-2.5 text-left transition-colors"
                      : "flex items-center gap-2.5 rounded-[12px] border border-line bg-surface/60 px-3 py-2.5 text-left transition-colors"
                  }
                  data-classic-country={country.fifaCode}
                  key={country.fifaCode}
                  onClick={() => onSelect(country.fifaCode)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="text-xl leading-none"
                  >
                    {countryFlag(country)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold leading-[22.5px] text-foreground">
                      {country.nameZh}
                    </span>
                    <span className="block text-[10px] leading-[15px] text-muted">
                      {country.fifaCode} · 门槛{" "}
                      {thresholdLabel(
                        country.internationalReputation,
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <SetupFooter
          nextDisabled={nationality === null}
          nextLabel="下一步"
          onBack={onBack}
          onNext={onContinue}
        />
      </section>
    </SetupShell>
  );
}

function filterCountries(
  countries: readonly Country[],
  search: string,
): readonly Country[] {
  const query = search.trim().toLocaleLowerCase("zh-CN");

  if (query.length === 0) {
    return countries;
  }

  return countries.filter((country) =>
    [
      country.fifaCode,
      country.isoAlpha2,
      country.nameEn,
      country.nameZh,
    ].some((value) =>
      value.toLocaleLowerCase("zh-CN").includes(query),
    ),
  );
}

function thresholdLabel(reputation: number): string {
  if (reputation >= 5) {
    return "极高";
  }

  if (reputation === 4) {
    return "高";
  }

  if (reputation === 3) {
    return "中高";
  }

  if (reputation === 2) {
    return "中";
  }

  return "低";
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
