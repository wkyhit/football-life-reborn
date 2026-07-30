import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_URL =
  "https://football-life.pages.dev/assets/index-B3NJVsoA.js";
const SOURCE_SHA256 =
  "401e06c23126eb247262b9bb8cb8c69a55ab81060a501d521cb7a79f60e3ce1b";
const OUTPUT_PATH = resolve(
  "src/domain/catalog/classicCatalogData.generated.ts",
);

const response = await fetch(SOURCE_URL);

if (!response.ok) {
  throw new Error(`Reference bundle request failed: ${response.status}`);
}

const bundle = await response.text();
const digest = createHash("sha256").update(bundle).digest("hex");

if (digest !== SOURCE_SHA256) {
  throw new Error(
    `Reference bundle digest changed: expected ${SOURCE_SHA256}, received ${digest}`,
  );
}

const extracted = extractOrderedArrays(bundle, [
  "m",
  "h",
  "g",
  "_",
  "v",
  "y",
  "b",
  "x",
  "S",
  "C",
  "w",
  "T",
]);
const countryRows = extracted.m;

const competitionMetadata = [
  {
    clubRows: extracted.h,
    confederation: "UEFA",
    countryFifaCode: "ENG",
    domesticCupId: "eng-fa-cup",
    id: "premier-league",
    nameEn: "Premier League",
    nameZh: "英超",
    tier: 1,
  },
  {
    clubRows: extracted.g,
    confederation: "UEFA",
    countryFifaCode: "ENG",
    domesticCupId: "eng-fa-cup",
    id: "championship",
    nameEn: "EFL Championship",
    nameZh: "英冠",
    tier: 2,
  },
  {
    clubRows: extracted._,
    confederation: "UEFA",
    countryFifaCode: "ESP",
    domesticCupId: "esp-copa-del-rey",
    id: "laliga",
    nameEn: "LaLiga",
    nameZh: "西甲",
    tier: 1,
  },
  {
    clubRows: extracted.v,
    confederation: "UEFA",
    countryFifaCode: "ESP",
    domesticCupId: "esp-copa-del-rey",
    id: "laliga-2",
    nameEn: "LaLiga 2",
    nameZh: "西乙",
    tier: 2,
  },
  {
    clubRows: extracted.y,
    confederation: "UEFA",
    countryFifaCode: "ITA",
    domesticCupId: "ita-coppa-italia",
    id: "serie-a",
    nameEn: "Serie A",
    nameZh: "意甲",
    tier: 1,
  },
  {
    clubRows: extracted.b,
    confederation: "UEFA",
    countryFifaCode: "GER",
    domesticCupId: "ger-dfb-pokal",
    id: "bundesliga",
    nameEn: "Bundesliga",
    nameZh: "德甲",
    tier: 1,
  },
  {
    clubRows: extracted.x,
    confederation: "UEFA",
    countryFifaCode: "FRA",
    domesticCupId: "fra-coupe-de-france",
    id: "ligue-1",
    nameEn: "Ligue 1",
    nameZh: "法甲",
    tier: 1,
  },
  {
    clubRows: extracted.S,
    confederation: "AFC",
    countryFifaCode: "CHN",
    domesticCupId: "chn-fa-cup",
    id: "csl",
    nameEn: "Chinese Super League",
    nameZh: "中超",
    tier: 1,
  },
  {
    clubRows: extracted.C,
    confederation: "AFC",
    countryFifaCode: "CHN",
    domesticCupId: "chn-fa-cup",
    id: "china-league-one",
    nameEn: "China League One",
    nameZh: "中甲",
    tier: 2,
  },
  {
    clubRows: extracted.w,
    confederation: "AFC",
    countryFifaCode: "JPN",
    domesticCupId: "jpn-emperor-cup",
    id: "j1-league",
    nameEn: "J1 League",
    nameZh: "日职联",
    tier: 1,
  },
  {
    clubRows: extracted.T,
    confederation: "CONMEBOL",
    countryFifaCode: "BRA",
    domesticCupId: "bra-copa-do-brasil",
    id: "brasileirao",
    nameEn: "Brasileirão",
    nameZh: "巴甲",
    tier: 1,
  },
];

const domesticCupRows = [
  {
    countryFifaCode: "ENG",
    id: "eng-fa-cup",
    nameZh: "足总杯",
  },
  {
    countryFifaCode: "ESP",
    id: "esp-copa-del-rey",
    nameZh: "国王杯",
  },
  {
    countryFifaCode: "ITA",
    id: "ita-coppa-italia",
    nameZh: "意大利杯",
  },
  {
    countryFifaCode: "GER",
    id: "ger-dfb-pokal",
    nameZh: "德国杯",
  },
  {
    countryFifaCode: "FRA",
    id: "fra-coupe-de-france",
    nameZh: "法国杯",
  },
  {
    countryFifaCode: "CHN",
    id: "chn-fa-cup",
    nameZh: "中国足协杯",
  },
  {
    countryFifaCode: "JPN",
    id: "jpn-emperor-cup",
    nameZh: "天皇杯",
  },
  {
    countryFifaCode: "BRA",
    id: "bra-copa-do-brasil",
    nameZh: "巴西杯",
  },
];

const confederationRows = {
  AFC: {
    continentalPrimary: "亚冠精英联赛",
    continentalSecondary: "亚冠二级联赛",
    nationalContinental: "亚洲杯",
  },
  CAF: {
    continentalPrimary: "非洲冠军联赛",
    continentalSecondary: "非洲联盟杯",
    nationalContinental: "非洲杯",
  },
  CONCACAF: {
    continentalPrimary: "北美冠军杯",
    continentalSecondary: null,
    nationalContinental: "金杯",
  },
  CONMEBOL: {
    continentalPrimary: "解放者杯",
    continentalSecondary: "南美杯",
    nationalContinental: "美洲杯",
  },
  OFC: {
    continentalPrimary: "大洋洲冠军联赛",
    continentalSecondary: null,
    nationalContinental: "大洋洲国家杯",
  },
  UEFA: {
    continentalPrimary: "欧冠",
    continentalSecondary: "欧联杯",
    nationalContinental: "欧洲杯",
  },
};

const clubCount = competitionMetadata.reduce(
  (total, competition) => total + competition.clubRows.length,
  0,
);

if (
  countryRows.length !== 61 ||
  clubCount !== 192 ||
  competitionMetadata.length !== 11 ||
  domesticCupRows.length !== 8 ||
  Object.keys(confederationRows).length !== 6
) {
  throw new Error(
    `Unexpected reference counts: countries=${countryRows.length}, clubs=${clubCount}`,
  );
}

const output = `// Generated by scripts/extract-classic-catalog.mjs.
// Frozen clean-room observation: ${SOURCE_URL}
// Source SHA-256: ${SOURCE_SHA256}
// Do not hand-edit. Runtime code never fetches the reference site.

export const COUNTRY_ROWS = [
${formatTupleRows(countryRows, 2)}
] as const;

export const COMPETITION_ROWS = [
${competitionMetadata.map(formatCompetition).join("\n")}
] as const;

export const DOMESTIC_CUP_ROWS = ${JSON.stringify(domesticCupRows, null, 2)} as const;

export const CONFEDERATION_ROWS = ${JSON.stringify(confederationRows, null, 2)} as const;
`;

await writeFile(OUTPUT_PATH, output, "utf8");
console.log(
  `Generated ${OUTPUT_PATH}: ${countryRows.length} countries, ${clubCount} clubs`,
);

function extractOrderedArrays(source, names) {
  const start = source.indexOf("kit_pattern");

  if (start === -1) {
    throw new Error("Could not locate reference catalog");
  }

  const result = {};
  let cursor = start;

  for (const name of names) {
    const marker = `${name}=[[`;
    const assignment = source.indexOf(marker, cursor);

    if (assignment === -1) {
      throw new Error(`Could not locate catalog array ${name}`);
    }

    const arrayStart = assignment + name.length + 1;
    const literal = readBalancedArray(source, arrayStart);
    result[name] = parseArrayLiteral(literal.text);
    cursor = literal.end;
  }

  return result;
}

function readBalancedArray(source, start) {
  let depth = 0;
  let escaped = false;
  let inTemplate = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];

    if (inTemplate) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "`") {
        inTemplate = false;
      }
      continue;
    }

    if (character === "`") {
      inTemplate = true;
    } else if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return {
          end: index + 1,
          text: source.slice(start, index + 1),
        };
      }
    }
  }

  throw new Error("Unterminated catalog array");
}

function parseArrayLiteral(literal) {
  let json = "";

  for (let index = 0; index < literal.length; index += 1) {
    const character = literal[index];

    if (character !== "`") {
      json += character;
      continue;
    }

    let value = "";
    index += 1;

    for (; index < literal.length; index += 1) {
      const templateCharacter = literal[index];

      if (templateCharacter === "`") {
        break;
      }

      if (
        templateCharacter === "$" &&
        literal[index + 1] === "{"
      ) {
        throw new Error("Template interpolation is not valid catalog data");
      }

      if (templateCharacter === "\\") {
        index += 1;
        const escaped = literal[index];
        const escapeMap = {
          "\\": "\\",
          "`": "`",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        value += escapeMap[escaped] ?? escaped;
      } else {
        value += templateCharacter;
      }
    }

    json += JSON.stringify(value);
  }

  return JSON.parse(json);
}

function formatTupleRows(rows, indentation) {
  const spaces = " ".repeat(indentation);
  return rows.map((row) => `${spaces}${JSON.stringify(row)},`).join("\n");
}

function formatCompetition(competition) {
  const metadata = [
    ["id", competition.id],
    ["nameZh", competition.nameZh],
    ["nameEn", competition.nameEn],
    ["countryFifaCode", competition.countryFifaCode],
    ["confederation", competition.confederation],
    ["tier", competition.tier],
    ["domesticCupId", competition.domesticCupId],
  ]
    .map(
      ([key, value]) =>
        `    ${key}: ${typeof value === "number" ? value : JSON.stringify(value)},`,
    )
    .join("\n");

  return `  {
${metadata}
    clubRows: [
${formatTupleRows(competition.clubRows, 6)}
    ],
  },`;
}
