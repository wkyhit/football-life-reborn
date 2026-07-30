import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";

type JerseyPreviewProps = {
  countryFifaCode: string;
  name: string;
  number: string;
};

const jerseyBody =
  "M86 22 Q110 36 134 22 L162 32 L194 58 L177 97 Q164 103 151 94 L151 187 Q151 195 139 196 Q110 200 81 196 Q69 195 69 187 L69 94 Q56 103 43 97 L26 58 L58 32 Z";

export function JerseyPreview({
  countryFifaCode,
  name,
  number,
}: JerseyPreviewProps) {
  const country =
    CLASSIC_CATALOG.countryByFifaCode.get(countryFifaCode) ??
    CLASSIC_CATALOG.countryByFifaCode.get("CHN")!;

  return (
    <svg
      aria-hidden="true"
      className="h-full max-h-60 w-auto drop-shadow-2xl"
      viewBox="0 0 220 214"
    >
      <defs>
        <linearGradient id="classic-jersey-shade" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path d={jerseyBody} fill={country.kitPrimaryColor} />
      <g
        fill="none"
        stroke={country.kitSecondaryColor}
        strokeWidth="9"
      >
        <path d="M190 63 L175 97" />
        <path d="M30 63 L45 97" />
      </g>
      <path
        d="M86 22 Q90 37 110 37 Q130 37 134 22 Q126 30 110 30 Q94 30 86 22 Z"
        fill={country.kitSecondaryColor}
      />
      <path
        d={jerseyBody}
        fill="url(#classic-jersey-shade)"
      />
      <path
        d={jerseyBody}
        fill="none"
        stroke="rgb(0 0 0 / 0.4)"
      />
      <text
        fill="#fff"
        fontSize="17"
        fontWeight="900"
        letterSpacing="2"
        paintOrder="stroke"
        stroke="rgb(0 0 0 / 0.45)"
        strokeWidth="1"
        textAnchor="middle"
        x="110"
        y="86"
      >
        {name}
      </text>
      <text
        fill="#fff"
        fontSize="62"
        fontWeight="900"
        paintOrder="stroke"
        stroke="rgb(0 0 0 / 0.45)"
        strokeWidth="1"
        textAnchor="middle"
        x="110"
        y="158"
      >
        {number}
      </text>
    </svg>
  );
}
